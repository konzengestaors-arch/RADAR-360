'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {toBriefing}=require('../demo/briefing-decisao.js');
const news=(titulo,url='https://example.org/noticia')=>({titulo,url,fonte:'Fonte pública',publicadoEm:'2026-11-07'});
test('recusa URL HTTP, Javascript e título vazio',()=>{
 assert.equal(toBriefing(news('Expansão','http://example.org')),null);
 assert.equal(toBriefing(news('Expansão','javascript:alert(1)')),null);
 assert.equal(toBriefing(news('')),null);
});
test('não transforma crédito ou expansão em fato comprovado',()=>{
 const a=toBriefing(news('BRDE anuncia financiamento para expansão de fábrica'));
 assert.match(a.sinal,/financiamento/i);
 assert.equal(a.estagio,'Triagem inicial — não verificado');
 assert.equal(a.decisao,'Investigar — nenhuma ação comercial automática');
 assert.equal(a.inferenciaAutomatica,true);
});
test('não infere CNPJ ou vínculo empresarial a partir do título',()=>{
 const a=toBriefing(news('Empresa XPTO anuncia nova fábrica'));
 assert.deepEqual(a.empresas,[]);
 assert.match(a.lacunas.join(' '),/Nenhum vínculo empresarial confirmado/);
});
test('somente aceita vínculo explicitamente marcado como verificado com CNPJ',()=>{
 const a=toBriefing(news('Empresa XYZ anuncia expansão'),{empresasVerificadas:[
 {nome:'Empresa XYZ',cnpj:'12345678000190',verificado:false},
 {nome:'Empresa ABC',cnpj:'12345678000190',verificado:true},
 {nome:'Empresa sem CNPJ',cnpj:'12',verificado:true}
 ]});
 assert.equal(a.empresas.length,1);
 assert.equal(a.empresas[0].nome,'Empresa ABC');
});
test('manchete genérica não cria oportunidade',()=>{
 const a=toBriefing(news('Economia regional apresenta novos indicadores'));
 assert.equal(a.sinal,'Sinal não classificado');
 assert.match(a.acao,/Ler a matéria original/);
});
test('data inexistente não deve ser aceita',()=>{
 const a=toBriefing({...news('Expansão'),publicadoEm:'2026-02-30'});
 assert.equal(a.publicadoEm,null);
});
