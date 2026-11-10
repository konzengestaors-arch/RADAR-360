'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classify}=require('./empresa-noticia.cjs');
const companies=[{nome:'Alvorada Energia S.A.',cnpj:'12.345.678/0001-95'},{nome:'Horizonte Logistica Ltda',cnpj:'98.765.432/0001-98'}];
test('nome no título apenas sugere revisão',()=>assert.equal(classify({titulo:'Alvorada Energia anuncia nova unidade'},companies).status,'candidata_revisao'));
test('menção parcial não cria vínculo',()=>assert.equal(classify({title:'Energia registra alta'},companies).status,'nao_identificada'));
test('descrição não cria vínculo',()=>assert.equal(classify({title:'Novo projeto',description:'Alvorada Energia'},companies).status,'nao_identificada'));
test('duas empresas geram ambiguidade',()=>assert.equal(classify({title:'Alvorada Energia e Horizonte Logistica'},companies).status,'ambigua'));
test('acentos não impedem comparação',()=>assert.equal(classify({title:'HORIZONTE LOGÍSTICA: novo terminal'},companies).status,'candidata_revisao'));
test('título ausente é seguro',()=>assert.equal(classify({},companies).status,'nao_identificada'));
test('CNPJ formatado no título sugere revisão',()=>assert.equal(classify({title:'CNPJ 12.345.678/0001-95 citado em edital'},companies).status,'candidata_revisao'));
test('nome genérico não gera falso positivo',()=>assert.equal(classify({title:'Grupo investe'},[{nome:'Grupo S.A.'}]).status,'nao_identificada'));
test('números dispersos não formam CNPJ',()=>assert.equal(classify({title:'12 345 678 projetos 0001 e 90 obras'},companies).status,'nao_identificada'));

test('CNPJ inválido não gera candidata por nome',()=>assert.equal(classify({title:'Alvorada Energia inaugura'},[{nome:'Alvorada Energia S.A.',cnpj:'12.345.678/0001-90'}]).status,'nao_identificada'));
test('nome duplicado bloqueia associação',()=>assert.equal(classify({title:'Alvorada Energia inaugura'},[companies[0],companies[0]]).status,'nao_identificada'));
test('CNPJ duplicado entre empresas bloqueia associação',()=>assert.equal(classify({title:'Alvorada Energia inaugura'},[companies[0],{nome:'Outra Empresa Ltda',cnpj:companies[0].cnpj}]).status,'nao_identificada'));
