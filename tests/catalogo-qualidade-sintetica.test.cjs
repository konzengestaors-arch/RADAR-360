'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('demo/empresas-publicas.js','utf8');
const localKey='radar_empresas_publicas_nome_cnpj_v1';
function boot({local=null,remote=null,fail=false}={}){
 const data=new Map(),requests=[];
 if(local!==null)data.set(localKey,JSON.stringify(local));
 const ctx={
  localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},
  document:{addEventListener:()=>{},getElementById:()=>null},
  window:{},
  fetch:async url=>{
   requests.push(url);
   if(fail)throw Error('rede indisponível');
   return {ok:true,json:async()=>remote};
  },
  console
 };
 vm.runInNewContext(source,ctx,{filename:'empresas-publicas.js'});
 return {api:ctx.window.RadarCompanies,requests,data};
}
const rows=Array.from({length:217},(_,i)=>({
 nome:'Empresa Ficticia Numero '+String(i+1).padStart(3,'0'),
 cnpj:i<96?'11222333000181':'',
 conflito:i<8
}));
const payload={schema:'observatorio-empresas/1',total:217,items:rows};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('catálogo de 217 somente por API HTTPS, sem persistir no navegador',async()=>{
 const app=boot({remote:payload});await tick();
 assert.equal(app.api.read().length,217);
 assert.equal(app.api.panel().includes('217 empresas reais'),true);
 assert.equal(app.data.has(localKey),false);
 assert.deepEqual(app.requests,['/api/empresas']);
});
test('lista antiga local preservada, mas a base canônica tem prioridade na sessão',async()=>{
 const local=[{nome:'Empresa Local Ficticia',cnpj:''}];
 const app=boot({local,remote:payload});await tick();
 assert.equal(app.api.read().length,217);
 assert.equal(app.data.get(localKey),JSON.stringify(local));
});
test('falha de rede deixa catálogo vazio sem fallback local ou fictício',async()=>{
 const local=[{nome:'Empresa Local Ficticia',cnpj:''}];
 const app=boot({local,fail:true});await tick();
 assert.equal(app.api.read().length,0);
 assert.match(app.api.panel(),/Não foi possível acessar o catálogo privado/);
 assert.equal(app.data.get(localKey),JSON.stringify(local));
});
test('216 ou 222 registros nunca são aceitos como 217',async()=>{
 for(const length of [216,222]){
  const app=boot({remote:{schema:'observatorio-empresas/1',total:length,items:length===216?rows.slice(0,216):rows.concat(rows.slice(0,5))}});
  await tick();assert.equal(app.api.read().length,0);
  assert.match(app.api.panel(),/Contagem do catálogo não confirmada/);
 }
});
test('notícia nula não impede associação de nome elegível',async()=>{
 const app=boot({remote:payload});await tick();
 const result=app.api.classifyNews([null,{titulo:'Empresa Ficticia Numero 150 anuncia investimento'}]);
 assert.equal(result.length,2);
 assert.equal(result[1].status,'candidata_revisao');
});
test('registro marcado conflito não gera correspondência automática',async()=>{
 const app=boot({remote:payload});await tick();
 const result=app.api.classifyNews([{titulo:'Empresa Ficticia Numero 003 anuncia investimento'}]);
 assert.equal(result[0].status,'nao_identificada');
});