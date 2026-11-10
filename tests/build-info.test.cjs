'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const generator = path.resolve(__dirname,'../scripts/build-info.cjs');
const repoRoot = path.resolve(__dirname,'..');
function gitSha(){
 const p=spawnSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'});
 assert.equal(p.status,0,'testes requerem checkout Git');
 return p.stdout.trim();
}
function run(extraEnv={}){
 return spawnSync(process.execPath,[generator],{
  cwd:repoRoot,encoding:'utf8',
  env:{...process.env,VERCEL_GIT_COMMIT_SHA:'',GITHUB_SHA:'',BUILD_INFO_DIR:'',...extraEnv}
 });
}
test('SHA do checkout aceito sem metadados privados',()=>{
 const sha=gitSha();
 const r=run({VERCEL_GIT_COMMIT_SHA:sha});
 assert.equal(r.status,0,r.stderr);
 const info=JSON.parse(fs.readFileSync(path.join(repoRoot,'build-info.json'),'utf8'));
 assert.equal(info.sha,sha);
 assert.equal(info.catalogo.estado,'nao_verificado_em_build');
 assert.equal(info.catalogo.esperado_total,222);
 assert.equal('total_empresas' in info,false);
 fs.unlinkSync(path.join(repoRoot,'build-info.json'));
});
test('SHA divergente bloqueia a geracao',()=>{
 const sha=gitSha();
 const wrong=sha==='0'.repeat(40)?'1'.repeat(40):'0'.repeat(40);
 const r=run({GITHUB_SHA:wrong});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/difere do checkout/);
});
test('SHA malformado bloqueia a geracao',()=>{
 const r=run({GITHUB_SHA:'invalid'});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/invalido/);
});
test('nao permite gravar fora da raiz',()=>{
 const r=run({GITHUB_SHA:gitSha(),BUILD_INFO_DIR:path.join(os.tmpdir(),'radar-out')});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/raiz do repositorio/);
});
