'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const source = path.resolve(__dirname,'../scripts/build-info.cjs');
function cmd(bin,args,cwd,env) {
 return spawnSync(bin,args,{cwd,encoding:'utf8',env});
}
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'radar-build-identity-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'scripts'));
 fs.copyFileSync(source,path.join(root,'scripts','build-info.cjs'));
 for(const args of [['init','-q'],['-c','user.name=QA','-c','user.email=qa@example.invalid','add','scripts/build-info.cjs'],['-c','user.name=QA','-c','user.email=qa@example.invalid','commit','-qm','isolated fixture']]){
  const r=cmd('git',args,root);
  assert.equal(r.status,0,r.stderr);
 }
 const sha=cmd('git',['rev-parse','HEAD'],root).stdout.trim();
 assert.match(sha,/^[a-f0-9]{40}$/);
 return {root,sha};
}
function run(root,extra={}) {
 const env={...process.env,VERCEL_GIT_COMMIT_SHA:'',GITHUB_SHA:'',BUILD_INFO_DIR:'',...extra};
 return cmd(process.execPath,['scripts/build-info.cjs'],root,env);
}
test('gera manifesto de identidade em fixture isolada, sem catalogo privado',t=>{
 const {root,sha}=fixture(t);
 const r=run(root,{VERCEL_GIT_COMMIT_SHA:sha});
 assert.equal(r.status,0,r.stderr);
 const info=JSON.parse(fs.readFileSync(path.join(root,'build-info.json'),'utf8'));
 assert.equal(info.sha,sha);
 assert.equal(info.catalogo.estado,'nao_verificado_em_build');
 assert.equal(info.catalogo.esperado_total,222);
 assert.equal('total_empresas' in info,false);
 assert.deepEqual(Object.keys(info).sort(),['catalogo','gerado_em','ref','schema','sha']);
});
test('bloqueia SHA divergente e nao gera manifesto',t=>{
 const {root,sha}=fixture(t);
 const wrong=sha==='0'.repeat(40)?'1'.repeat(40):'0'.repeat(40);
 const r=run(root,{GITHUB_SHA:wrong});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/difere do checkout/);
 assert.equal(fs.existsSync(path.join(root,'build-info.json')),false);
});
test('bloqueia SHA malformado e nao gera manifesto',t=>{
 const {root}=fixture(t);
 const r=run(root,{GITHUB_SHA:'invalid'});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/invalido/);
 assert.equal(fs.existsSync(path.join(root,'build-info.json')),false);
});
test('bloqueia diretorio de saida externo',t=>{
 const {root,sha}=fixture(t);
 const r=run(root,{GITHUB_SHA:sha,BUILD_INFO_DIR:os.tmpdir()});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/raiz do repositorio/);
 assert.equal(fs.existsSync(path.join(root,'build-info.json')),false);
});
