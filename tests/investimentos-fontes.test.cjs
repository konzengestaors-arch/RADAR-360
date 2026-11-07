const test=require('node:test');
const assert=require('node:assert/strict');
const sources=require('../demo/fontes-investimentos.js');
test('fontes são públicas, datadas, identificadas e sem duplicatas',()=>{
 assert.equal(sources.reviewedAt,'2026-11-07');
 assert.equal(sources.references.length,4);
 assert.equal(new Set(sources.references.map(x=>x.id)).size,4);
 assert.equal(new Set(sources.references.map(x=>x.url)).size,4);
 for(const x of sources.references){
  const url=new URL(x.url);
  assert.equal(url.protocol,'https:');
  assert.equal(url.username,'');assert.equal(url.password,'');
  assert.match(x.data,/^2026-\d{2}-\d{2}$/);
  assert.ok(Date.parse(x.data)<=Date.parse(sources.reviewedAt));
  for(const key of ['titulo','fonte','territorio','etapa','tipo'])assert.ok(x[key]);
 }
});
test('classificação identifica infraestrutura e crédito apenas como sinal',()=>{
 const positive=[
 'Investimento industrial em Porto Alegre',
 'Concessão de rodovia fictícia tem nova etapa',
 'Financiamento para indústria gaúcha',
 'BNDES aprova R$ 10 mi para rede de fibra ótica no Oeste de SC',
 'Programa prevê construção de nova unidade no Sul'
 ];
 for(const title of positive)assert.ok(sources.classifyTitle(title),title);
 const negative=['Taxa de juros em debate','Eleições e resultado de futebol','BNDES presta homenagem a servidores','Economia registra inflação','Porto Alegre recebe feira cultural'];
 for(const title of negative)assert.equal(sources.classifyTitle(title),null,title);
});
