'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../demo/empresas-publicas.js'),'utf8');
async function scenario(localCount){
 const key='radar_empresas_publicas_nome_cnpj_v1';
 const local=localCount?JSON.stringify(Array.from({length:localCount},(_,i)=>({nome:'Empresa Local '+i,cnpj:''}))):null;
 let requests=0;
 const document={addEventListener(){},getElementById(){return null}};
 const window={};
 const context={window,document,localStorage:{getItem(k){assert.equal(k,key);return local}},fetch:async()=>{requests++;return {ok:true,json:async()=>Array.from({length:222},(_,i)=>({nome:'Empresa Servidor '+i,cnpj:''}))}}};
 vm.runInNewContext(source,context,{filename:'empresas-publicas.js'});
 for(let i=0;i<8;i++)await Promise.resolve();
 const panel=window.RadarCompanies.panel();
 return {count:window.RadarCompanies.read().length,requests,panel};
}
test('sem lista local carrega catálogo protegido de 222',async()=>{const r=await scenario(0);assert.equal(r.count,222);assert.equal(r.requests,1);assert.match(r.panel,/Catálogo privado de homologação: 222 registros/);});
test('lista local de 50 é preservada e divergência é sinalizada',async()=>{const r=await scenario(50);assert.equal(r.count,50);assert.equal(r.requests,0);assert.match(r.panel,/ATENÇÃO: lista local com 50 registros/);});
test('222 locais não são declaradas idênticas ao catálogo privado',async()=>{const r=await scenario(222);assert.equal(r.count,222);assert.equal(r.requests,0);assert.match(r.panel,/identidade e atualização não verificadas/);});
