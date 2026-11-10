'use strict';
// Identidade de build para site estatico. Nao inclui nem publica dados do catalogo.
// Executar antes do empacotamento Vercel; nao executar no CI de testes como artefato final.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, process.env.BUILD_INFO_DIR || '.');
if (out !== root) throw new Error('BUILD_INFO_DIR deve ser a raiz do repositorio');
let localSha = '';
try { localSha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root,encoding:'utf8'}).trim(); } catch {}
const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || localSha).trim().toLowerCase();
if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('SHA do commit ausente ou invalido');
if (localSha && /^[a-f0-9]{40}$/.test(localSha) && sha !== localSha) {
  throw new Error('SHA informado difere do checkout; build interrompido');
}
const ref = String(process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || '').slice(0,160);
const info = {
  schema:'observatorio-build-info/1',
  sha,
  ref,
  gerado_em:new Date().toISOString(),
  catalogo:{estado:'nao_verificado_em_build',esperado_total:222}
};
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify(info,null,2)+'\n',{flag:'w'});
console.log('build-info: identidade gerada para',sha);
