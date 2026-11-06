const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('demo/observatorio.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);

test('HTML mantém scripts sintaticamente válidos', () => {
  assert.ok(scripts.length >= 2);
  scripts.forEach((script, i) => assert.doesNotThrow(() => new vm.Script(script, {filename: 'inline-' + i + '.js'})));
});

test('demonstração começa sem registros documentais', () => {
  const match = html.match(/window\.__RADAR_SEED__=(\{[\s\S]*?\});<\/script>/);
  assert.ok(match, 'seed deve existir');
  const seed = JSON.parse(match[1]);
  assert.deepEqual(seed.movimentos, []);
  assert.deepEqual(seed.indicadores, []);
  assert.deepEqual(seed.caixaAtualizacoes, []);
  assert.match(seed.migracao.origem, /demonstração/);
});

test('chaves isoladas não acessam os dados operacionais conhecidos', () => {
  assert.ok(html.includes('radar_obs_demo_publica_20261106'));
  assert.ok(html.includes('radar_obs_demo_finance_20261106'));
  assert.ok(!html.includes("'radar_observatorio_unico_v17'"));
  assert.ok(!html.includes("'radar_observatorio_unico_v16'"));
  assert.ok(!html.includes("'radar360_obs_regional_v1'"));
  assert.ok(!html.includes("'radar_obs_finance_v18'"));
});

test('demonstração adverte sobre dados confidenciais', () => {
  assert.match(html, /DEMONSTRAÇÃO DE DESENVOLVIMENTO/);
  assert.match(html, /Não utilize informações confidenciais/);
});

test('HTML não contém registros MOV e IND embutidos', () => {
  assert.doesNotMatch(html, /"id":"MOV-\d{3}"/);
  assert.doesNotMatch(html, /"id":"IND-\d{3}"/);
});
