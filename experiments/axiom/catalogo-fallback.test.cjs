'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../../demo/empresas-publicas.js'),'utf8');
const catalog=Array.from({length:222},(_,i)=>({nome:'Empresa Ficticia '+String(i).padStart(3,'0'),cnpj:''}));
test('WebView sem DecompressionStream usa JSON e preserva 222 registros',async()=>{
 const urls=[];
 const window={};
 const ctx={window,document:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},fetch:async(url)=>{
  urls.push(url);
  if(url.endsWith('.gz'))return {ok:true,arrayBuffer:async()=>new Uint8Array([31,139]).buffer};
  if(url.endsWith('.json'))return {ok:true,json:async()=>catalog};
  throw Error('unexpected fetch');
 },URL,TextDecoder,Blob,Response,console};
 vm.runInNewContext(script,ctx,{filename:'empresas-publicas.js',timeout:1000});
 for(let i=0;i<20&&window.RadarCompanies.read().length!==222;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(window.RadarCompanies.read().length,222);
 assert.equal(urls.length,1);
 assert.equal(urls[0],'/empresas-catalogo-222.json');
});
