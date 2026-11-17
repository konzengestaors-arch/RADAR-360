'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {classify,prioritize,nextQuestion}=require('../demo/triagem-editorial.js');
const news=(titulo,url='https://example.org/noticia')=>({titulo,url,publicadoEm:'2026-11-16',fonte:'Fonte de teste'});
test('dólar, inflação, ranking regional e PIB são contexto, não oportunidade empresarial',()=>{
 const headlines=[
 'Dólar sobe para R$ 5,77 e fecha no maior valor desde abril de 2025',
 'Mercado reduz projeções para inflação e crescimento econômico em 2026',
 'Paraná passa Rio Grande do Sul e assume posto de 4ª maior economia do país',
 'PIB de Santa Catarina cresce mais de 3% no trimestre'
 ];
 for(const title of headlines){assert.equal(classify(news(title)).kind,'contexto',title);}
});
test('investimento, contratação e fornecimento identificam pistas, não fatos confirmados',()=>{
 const cases=[
 'Empresa anuncia expansão de fábrica em Caxias do Sul',
 'BNDES aprova financiamento para projeto de rede de fibra no Oeste de SC',
 'Indústria contrata fornecedores para construção de nova unidade'
 ];
 for(const title of cases)assert.equal(classify(news(title)).kind,'empresarial',title);
});
test('risco operacional de indústria é separado de investimento empresarial',()=>{
 assert.equal(classify(news('Incêndio paralisa fábrica industrial em Chapecó')).kind,'risco');
 assert.equal(classify(news('Previsão do tempo: tornado em Chapecó')).kind,'contexto');
});
test('FGTS de famílias atingidas jamais entra como oportunidade de investimento',()=>{
 const t='Atingidos por tornado em Chapecó podem sacar FGTS e suspender financiamentos';
 assert.equal(classify(news(t)).kind,'contexto');
});
test('triagem coloca sinais na frente, preserva ordem entre macro e indica vínculo apenas textual',()=>{
 const items=[
  news('Dólar sobe e fechamento tem maior valor','https://example.org/a'),
  news('Empresa Alfa anuncia expansão de fábrica','https://example.org/b'),
  news('Mercado reduz projeção de inflação','https://example.org/c'),
  news('Indústria interrompe operação após incêndio','https://example.org/d')
 ];
 const links=[
  {status:'nao_identificada',empresas:[]},
  {status:'candidata_revisao',empresas:['Empresa Alfa']},
  {status:'nao_identificada',empresas:[]},
  {status:'nao_identificada',empresas:[]}
 ];
 const result=prioritize(items,links);
 assert.deepEqual(result.map(x=>x.item.url),['https://example.org/b','https://example.org/d','https://example.org/a','https://example.org/c']);
 assert.equal(result[0].mention,'Empresa Alfa');
 assert.equal(result[1].kind,'risco');
 assert.equal(result[2].kind,'contexto');
});
test('múltiplas empresas ambíguas não são apresentadas como vínculo confirmado',()=>{
 const p=prioritize([news('Empresa Alfa anuncia nova fábrica')],[{status:'ambigua',empresas:['Empresa Alfa','Empresa Beta']}]);
 assert.equal(p[0].mention,'');
});

test('Canoas: parque de inovação com previsão de novos empregos é hipótese comercial, não contrato',()=>{
 const title='Canoas: Parque de Inovação dobra empresas e prevê 250 empregos no RS';
 const a=classify(news(title));
 assert.equal(a.kind,'empresarial');
 const question=nextQuestion(news(title));
 assert.match(question,/seguros e garantias/);
 assert.doesNotMatch(question,/contrato confirmado|seguro contratado/i);
});
test('pergunta de seguros diferencia riscos operacionais de notícias macroeconômicas',()=>{
 assert.match(nextQuestion(news('Incêndio paralisa fábrica industrial em Chapecó')),/interrupção de atividades/);
 assert.equal(nextQuestion(news('Durigan explica no Senado alíquota de 11,3% da CBS')),'');
});
