'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateBrasilApi}=require('../experiments/axiom/brasilapi-schema.cjs');
const cnpj='00000000000191';
test('resposta com CNPJ correspondente retorna candidato sem aprovar identidade',()=>{
 const r=validateBrasilApi({cnpj,razao_social:'  EMPRESA PUBLICA DE TESTE  ',descricao_situacao_cadastral:'ATIVA'},cnpj);
 assert.equal(r.ok,true);assert.equal(r.record.razaoSocial,'EMPRESA PUBLICA DE TESTE');
 assert.equal(r.status,'candidate_for_manual_review');
});
test('CNPJ divergente nunca é associado ao registro consultado',()=>{
 assert.equal(validateBrasilApi({cnpj:'11222333000181',razao_social:'OUTRA'},cnpj).reason,'cnpj_mismatch');
});
test('payload ausente, lista e razão social vazia são recusados',()=>{
 assert.equal(validateBrasilApi(null,cnpj).reason,'invalid_payload');
 assert.equal(validateBrasilApi([],cnpj).reason,'invalid_payload');
 assert.equal(validateBrasilApi({cnpj,razao_social:' '},cnpj).reason,'missing_razao_social');
});
test('campos não autorizados não entram no resultado',()=>{
 const r=validateBrasilApi({cnpj,razao_social:'EMPRESA FICTICIA',email:'private@example.org',telefone:'0000'},cnpj);
 assert.equal(r.ok,true);assert.equal(JSON.stringify(r).includes('private@example.org'),false);
});
