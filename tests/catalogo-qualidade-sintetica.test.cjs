'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('demo/empresas-publicas.js', 'utf8');
function boot({ local = null, remote = null, fail = false } = {}) {
  const data = new Map();
  if (local !== null) data.set('radar_empresas_publicas_nome_cnpj_v1', JSON.stringify(local));
  const requests = [];
  const listeners = {};
  const ctx = {
    localStorage: { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) },
    document: { addEventListener: (name, fn) => { listeners[name] = fn; }, getElementById: () => null },
    window: {},
    fetch: async url => {
      requests.push(url);
      if (fail) throw Error('rede indisponível');
      return { ok: true, json: async () => remote };
    },
    console,
    // Exercise the JSON fallback deterministically; gzip is tested separately.
    DecompressionStream: undefined
  };
  vm.runInNewContext(source, ctx, { filename: 'empresas-publicas.js' });
  return { api: ctx.window.RadarCompanies, requests, listeners };
}
const synthetic = Array.from({length: 222}, (_, i) => ({
  nome: 'Empresa Ficticia Numero ' + String(i + 1).padStart(3, '0'),
  cnpj: ''
}));
const tick = () => new Promise(resolve => setImmediate(resolve));

test('catálogo protegido: 222 registros sintéticos são carregados via JSON', async () => {
  const app = boot({remote: synthetic});
  await tick();
  assert.equal(app.api.read().length, 222);
  assert.deepEqual(app.requests, ['/empresas-catalogo-222.json']);
});
test('lista local importada é preservada e não substituída por catálogo remoto', async () => {
  const local = [{nome:'Empresa Local Ficticia',cnpj:''}];
  const app = boot({local,remote:synthetic});
  await tick();
  assert.equal(app.api.read().length, 1);
  assert.equal(app.api.read()[0].nome, local[0].nome);
  assert.equal(app.requests.length, 0);
});
test('falha de rede não inventa registros nem declara catálogo carregado', async () => {
  const app = boot({fail:true});
  await tick();
  assert.equal(app.api.read().length, 0);
  assert.match(app.api.panel(), /Catálogo de homologação indisponível/);
});
test('catálogo remoto incompleto é recusado sem aceitar volume incorreto', async () => {
  const app = boot({remote:synthetic.slice(0,221)});
  await tick();
  assert.equal(app.api.read().length, 0);
  assert.match(app.api.panel(), /incompleto ou inválido/);
});
test('notícia nula não derruba associação de outra notícia válida', async () => {
  const app = boot({local:[{nome:'Empresa Exemplo Industrial',cnpj:''}]});
  await tick();
  const out = app.api.classifyNews([null,{titulo:'Empresa Exemplo Industrial anuncia investimento'}]);
  assert.equal(out.length, 2);
  assert.equal(out[1].status, 'candidata_revisao');
});
