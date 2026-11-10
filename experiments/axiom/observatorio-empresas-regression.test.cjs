'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../../demo/empresas-publicas.js'),'utf8');
function load(rows){
 const storage=new Map([['radar_empresas_publicas_nome_cnpj_v1',JSON.stringify(rows)]]);
 const window={};
 const ctx={window,document:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:false,status:404}),URL,TextDecoder,Blob,Response,DecompressionStream,console};
 vm.runInNewContext(script,ctx,{filename:'empresas-publicas.js',timeout:1000});
 return window.RadarCompanies;
}
const companies=[{nome:'Alvorada Energia S.A.',cnpj:''},{nome:'Horizonte Logistica Ltda',cnpj:''}];
test('correspondência por nome mantém revisão humana',()=>{
 const api=load(companies);
 const matches=api.matchesFor([{titulo:'Alvorada Energia abre unidade',url:'https://example.org/noticia'}]);
 assert.equal(matches.length,1);
 assert.equal(matches[0].empresas[0],'Alvorada Energia S.A.');
});
test('não associa nome parcial',()=>{
 const api=load(companies);
 assert.equal(api.matchesFor([{titulo:'Energia avança',url:'https://example.org/noticia'}]).length,0);
});
test('não aceita URL não HTTPS',()=>{
 const api=load(companies);
 assert.equal(api.matchesFor([{titulo:'Alvorada Energia',url:'http://example.org/noticia'}]).length,0);
});
test('catálogo com nome duplicado não gera associação',()=>{
 const api=load([companies[0],companies[0]]);
 assert.equal(api.matchesFor([{titulo:'Alvorada Energia',url:'https://example.org/noticia'}]).length,0);
});
test('lote de várias notícias mantém as correspondências',()=>{
 const api=load(companies);
 const found=api.matchesFor([{titulo:'Alvorada Energia inaugura',url:'https://example.org/1'},{titulo:'Horizonte Logistica amplia',url:'https://example.org/2'}]);
 assert.equal(found.length,2);
});

test('triagem preserva as três categorias e não modifica o catálogo',()=>{
 const api=load(companies);
 const before=JSON.stringify(api.read());
 const rows=api.classifyNews([
  {titulo:'Alvorada Energia inaugura'},
  {titulo:'Alvorada Energia e Horizonte Logistica anunciam'},
  {titulo:'Mercado regional cresce'}
 ]);
 assert.deepEqual(Array.from(rows,r=>r.status),['candidata_revisao','ambigua','nao_identificada']);
 assert.equal(JSON.stringify(api.read()),before);
});
test('identidade duplicada não vira candidata na triagem',()=>{
 const api=load([companies[0],companies[0]]);
 assert.equal(api.classifyNews([{titulo:'Alvorada Energia inaugura'}])[0].status,'nao_identificada');
});

test('interface sinaliza ambiguidade sem afirmar vínculo empresarial',()=>{
 const api=load(companies);
 const element={innerHTML:''};
 const storage=new Map([['radar_empresas_publicas_nome_cnpj_v1',JSON.stringify(companies)]]);
 const win={};
 const ctx={window:win,document:{addEventListener(){},getElementById:id=>id==='radarCompanyMatches'?element:null},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:false,status:404}),URL,TextDecoder,Blob,Response,DecompressionStream,console};
 vm.runInNewContext(script,ctx,{timeout:1000});
 win.RadarCompanies.showMatches([{titulo:'Alvorada Energia e Horizonte Logistica anunciam',url:'https://example.org/noticia'}]);
 assert.match(element.innerHTML,/Múltiplas empresas citadas/);
 assert.match(element.innerHTML,/revisar individualmente/);
 assert.doesNotMatch(element.innerHTML,/vínculo confirmado/);
});
test('manchetes são escapadas no HTML exibido',()=>{
 const element={innerHTML:''};
 const storage=new Map([['radar_empresas_publicas_nome_cnpj_v1',JSON.stringify(companies)]]);
 const win={};
 const ctx={window:win,document:{addEventListener(){},getElementById:id=>id==='radarCompanyMatches'?element:null},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:false,status:404}),URL,TextDecoder,Blob,Response,DecompressionStream,console};
 vm.runInNewContext(script,ctx,{timeout:1000});
 win.RadarCompanies.showMatches([{titulo:'Alvorada Energia <img src=x onerror=alert(1)>',url:'https://example.org/noticia'}]);
 assert.match(element.innerHTML,/&lt;img/);
 assert.doesNotMatch(element.innerHTML,/<img/);
});

test('quatro empresas na mesma manchete preservam contagem de ambiguidade',()=>{
 const rows=Array.from({length:4},(_,i)=>({nome:'Companhia Ficticia '+['Alfa','Beta','Gama','Delta'][i],cnpj:''}));
 const api=load(rows);
 const title=rows.map(x=>x.nome).join(' e ');
 const found=api.matchesFor([{titulo:title,url:'https://example.org/4'}]);
 assert.equal(found.length,1);
 assert.equal(found[0].empresas.length,4);
 const classified=api.classifyNews([{titulo:title}]);
 assert.equal(classified[0].status,'ambigua');
 assert.equal(classified[0].empresas.length,4);
});

test('notícia com campo title aparece na associação e preserva a manchete',()=>{
 const api=load(companies);
 const news=[{title:'Alvorada Energia inaugura',url:'https://example.org/noticia'}];
 assert.equal(api.classifyNews(news)[0].status,'candidata_revisao');
 const found=api.matchesFor(news);
 assert.equal(found.length,1);
 assert.equal(found[0].title,news[0].title);
});

test('lote com entradas nulas não interrompe associação de notícias válidas',()=>{
 const api=load(companies);
 const found=api.matchesFor([null,{title:'Alvorada Energia inaugura',url:'https://example.org/noticia'},undefined]);
 assert.equal(found.length,1);
 assert.equal(found[0].title,'Alvorada Energia inaugura');
});
