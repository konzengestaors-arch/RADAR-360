'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const e=require('../demo/vinculos-noticias.js');
const now=new Date('2026-11-18T21:00:00Z'),day='2026-11-18',consulted=now.toISOString();
const article=(title='Empresa Exemplo Industrial SA anuncia obra')=>({titulo:title,fonte:'Veículo QA',url:'https://example.org/noticia',publicadoEm:day,publicadoEmISO:'2026-11-18T18:30:00Z'});
const feed=(items=[article()],more={})=>({dataReferencia:day,consultadoEm:consulted,totais:{funcionando:1,comFalha:0},items,...more});
const rows=[{nome:'Empresa Exemplo Industrial SA',cnpj:'11222333000181',conflito:false}];
test('CNPJ literal e único na manchete fundamenta associação por identificador, não oportunidade',()=>{
 const a=article('Empresa Exemplo Industrial SA, CNPJ 11.222.333/0001-81, anuncia obra');
 const links=e.evaluate(a,rows,feed([a]),now);
 assert.equal(links[0].status,'cnpj_mencionado');assert.match(links[0].reason,/não comprova o fato/);
 assert.doesNotMatch(JSON.stringify(links),/score|oportunidade|recomendação de seguro/i);
});
test('nome completo literal é hipótese nominal, não identidade confirmada',()=>{
 const links=e.evaluate(article(),rows,feed(),now);
 assert.equal(links.length,1);assert.equal(links[0].status,'nome_nao_verificado');
});
test('homônimos e registro em conflito ficam ambíguos',()=>{
 const a=article();let duplicates=[...rows,{...rows[0],cnpj:''}];
 assert.equal(e.evaluate(a,duplicates,feed([a]),now)[0].status,'ambigua');
 assert.equal(e.evaluate(a,[{...rows[0],conflito:true}],feed([a]),now)[0].status,'ambigua');
 assert.equal(e.evaluate(a,[{...rows[0],cnpj:'00000000000000'}],feed([a]),now)[0].status,'ambigua');
});
test('setor, localização e substring não comprovam relação',()=>{
 const a=article('Indústria em Porto Alegre anuncia fábrica e empregos');
 assert.deepEqual(e.evaluate(a,rows,feed([a]),now),[]);
});
test('sem notícia de hoje é vazio; fonte indisponível e atualização vencida não produzem vínculo',()=>{
 const a=article();
 assert.deepEqual(e.evaluate(a,rows,feed([]),now),[]);
 assert.deepEqual(e.evaluate(a,rows,feed([a],{totais:{funcionando:0}}),now),[]);
 assert.deepEqual(e.evaluate(a,rows,feed([a],{error:'falha'}),now),[]);
 assert.deepEqual(e.evaluate(a,rows,feed([a],{consultadoEm:'2026-11-18T19:00:00Z'}),now),[]);
});
test('publicação de ontem, hora incoerente ou URL sem HTTPS nunca entra em notícias de hoje',()=>{
 const old={...article(),publicadoEm:'2026-11-17',publicadoEmISO:'2026-11-17T18:30:00Z'};
 assert.deepEqual(e.evaluate(old,rows,feed([old]),now),[]);
 const invalid={...article(),publicadoEmISO:'2026-11-17T18:30:00Z'};
 assert.deepEqual(e.evaluate(invalid,rows,feed([invalid]),now),[]);
 assert.deepEqual(e.evaluate({...article(),url:'http://example.org'},rows,feed(),now),[]);
});
test('dossiê renderiza explicação e fonte, sem gravar armazenamento nem divulgar CNPJ em link externo',()=>{
 const a=article();const html=e.forCompany(rows[0],rows,feed([a]),now);
 assert.match(html,/Notícias de hoje/);assert.match(html,/Menção nominal — identidade não confirmada/);
 assert.match(html,/https:\/\/example.org\/noticia/);
 assert.doesNotMatch(html,/11222333000181|localStorage|score/);
});
test('manchete RSS e CNPJ coincidente não provam a publicação original nem o fato comercial',()=>{
 const a=article('Empresa Exemplo Industrial SA, CNPJ 11.222.333/0001-81, anuncia obra');
 const html=e.forArticle(a,rows,feed([a]),now);
 assert.match(html,/CNPJ coincidente na manchete RSS/);
 assert.match(html,/conteúdo do fato não verificado/);
 assert.match(html,/página original não verificada/);
 assert.doesNotMatch(html,/Confirmado por identificador publicado/);
});
test('consulta sem catálogo não inventa empresa ou notícia vinculada',()=>{
 const a=article();const html=e.forArticle(a,[],feed([a]),now);
 assert.match(html,/catálogo privado não autenticado/);
});
