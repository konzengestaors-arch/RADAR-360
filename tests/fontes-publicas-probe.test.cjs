'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run,sources}=require('../scripts/probe-fontes-publicas.cjs');
test('sondas não enviam CNPJ do catálogo privado nem chave de API',()=>{
 assert.equal(sources.length,2);
 assert.ok(sources.every(x=>x.url.startsWith('https://')));
 assert.ok(sources.every(x=>!/[?&](?:key|token|api_key)=/i.test(x.url)));
 assert.ok(sources.some(x=>x.id==='brasilapi'&&x.url.includes('00000000000191')));
});
test('HTTP 200 com JSON válido permite prosseguir para avaliação de esquema',async()=>{
 const results=await run(async()=>({status:200,contentType:'application/json',body:'{}'}));
 assert.equal(results.length,2);
 assert.ok(results.every(x=>x.usable));
});
test('HTTP 200 com HTML não é aceito como API funcional',async()=>{
 const results=await run(async()=>({status:200,contentType:'text/html',body:'<html></html>'}));
 assert.ok(results.every(x=>!x.usable));
});
test('HTTP 429 e erros de rede não são confundidos com disponibilidade',async()=>{
 let calls=0;
 const results=await run(async()=>{if(++calls===1)throw Error('offline');return {status:429,contentType:'application/json',body:'{}'};});
 assert.ok(results.every(x=>!x.usable));
 assert.equal(results[0].error,'offline');
 assert.equal(results[1].status,429);
});
