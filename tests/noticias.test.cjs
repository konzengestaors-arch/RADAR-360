const test = require('node:test');
const assert = require('node:assert/strict');
const { _test: rss } = require('../api/noticias.js');

test('feeds configurados usam HTTPS e não são URLs fornecidas pelo cliente', () => {
  assert.equal(rss.FEEDS.length, 5);
  for (const feed of rss.FEEDS) assert.match(feed.url, /^https:\/\//);
});

test('safeUrl rejeita esquemas perigosos e credenciais', () => {
  assert.equal(rss.safeUrl('javascript:alert(1)'), '');
  assert.equal(rss.safeUrl('http://example.com'), '');
  assert.equal(rss.safeUrl('https://user:pass@example.com'), '');
});

test('safeUrl retira parâmetros de rastreamento', () => {
  const out = rss.safeUrl('https://example.org/noticia?utm_source=x&foo=bar#fragment');
  assert.equal(out, 'https://example.org/noticia?foo=bar');
});

test('classificação descarta assuntos não econômicos', () => {
  assert.equal(rss.classify({ area: 'RS' }, 'Resultado do futebol da semana'), null);
});

test('RSS sintético é convertido em candidato, não em movimento aprovado', () => {
  const xml = '<rss><channel><item><title>Investimento industrial em Porto Alegre</title><link>https://example.org/noticia</link><pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
  const items = rss.parseFeed({ id: 'fake', nome: 'Feed de teste', area: 'RS' }, xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].territorio, 'RS');
  assert.match(items[0].resumo, /Leia a fonte original/);
});

test('RSS malformado não é aceito como feed', () => {
  assert.throws(() => rss.parseFeed({ area: 'RS' }, '<html>notícias</html>'), /não é um feed/);
});

test('coletor não transforma falha de RSS em sucesso', async () => {
  const result = await rss.collect(async () => { throw new Error('rede indisponível'); });
  assert.equal(result.totais.funcionando, 0);
  assert.equal(result.totais.comFalha, rss.FEEDS.length+rss.GOOGLE_FEEDS.length);
  assert.equal(result.items.length, 0);
});

test('comunicados oficiais BNDES só viram candidatos quando a região é verificável no título', () => {
  const entries=[
    {titulo:'BNDES aprova R$ 10 mi para rede de fibra ótica no Oeste de SC',linkConteudo:'https://agenciadenoticias.bndes.gov.br/noticia/oeste-sc/',data:1793991010988,editoria:'Infraestrutura'},
    {titulo:'BNDES aprova R$ 331 mi para modernização do terminal portuário de Rio Grande',linkConteudo:'https://agenciadenoticias.bndes.gov.br/noticia/rio-grande/',data:1793991010988,editoria:'Infraestrutura'},
    {titulo:'BNDES investe em obra na região de Recife',linkConteudo:'https://agenciadenoticias.bndes.gov.br/noticia/recife/',data:1793991010988},
    {titulo:'BNDES investe em Porto Alegre fora do domínio oficial',linkConteudo:'https://exemplo.org/noticia/porto-alegre',data:1793991010988},
    {titulo:'BNDES aprova R$ 10 mi para rede de fibra ótica no Oeste de SC',linkConteudo:'https://agenciadenoticias.bndes.gov.br/noticia/oeste-sc/',data:1793991010988}
  ];
  const feed=rss.FEEDS.find(x=>x.id==='bndes-investimentos');
  assert.equal(feed.kind,'json');
  const result=rss.parseOfficialBndes(feed,JSON.stringify(entries));
  assert.equal(result.length,2);
  assert.equal(result[0].territorio,'Oeste SC');
  assert.equal(result[1].territorio,'RS');
  assert.match(result[0].resumo,/não prova execução/);
  assert.ok(result.every(x=>x.fonte===feed.nome&&x.url.startsWith('https://agenciadenoticias.bndes.gov.br/')));
});

test('fonte JSON BNDES inválida é recusada e não causa importação silenciosa', () => {
  const feed=rss.FEEDS.find(x=>x.id==='bndes-investimentos');
  assert.throws(()=>rss.parseOfficialBndes(feed,'<html>Erro</html>'),/JSON oficial inválido/);
  assert.throws(()=>rss.parseOfficialBndes(feed,JSON.stringify({items:[]})),/Formato inesperado/);
});

test('falha na fonte BNDES não derruba feeds RSS independentes', async () => {
  const xml='<rss><channel><item><title>Investimento industrial em Porto Alegre</title><link>https://example.org/rss-good</link><pubDate>'+new Date().toUTCString()+'</pubDate></item></channel></rss>';
  const fakeResponse={ok:true,status:200,headers:{get:()=> 'application/rss+xml'},text:async()=>xml};
  const batch=await rss.collect(async url=>{
    if(url.includes('bndes.gov.br'))throw new Error('JSON indisponível');
    return fakeResponse;
  });
  assert.equal(batch.totais.fontes,8);
  assert.equal(batch.totais.funcionando,4);
  assert.equal(batch.totais.comFalha,4);
  assert.equal(batch.fontes.find(x=>x.id==='bndes-investimentos').status,'erro');
  assert.ok(batch.items.length>=1);
});


test('BRDE regional só incorpora manchetes com menção ao RS, Oeste ou Litoral sul SC', () => {
 const feed=rss.FEEDS.find(x=>x.id==='brde-regional');
 assert.equal(feed.url,'https://brde.com.br/feed/');
 assert.equal(feed.area,'Sul');
 const rssXml='<rss><channel>'
 +'<item><title>BRDE financia expansão industrial em Porto Alegre</title><link>https://brde.com.br/noticias/porto-alegre/</link></item>'
 +'<item><title>BRDE apoia nova fábrica em Chapecó</title><link>https://brde.com.br/noticias/chapeco/</link></item>'
 +'<item><title>BRDE financia indústria no Paraná</title><link>https://brde.com.br/noticias/parana/</link></item>'
 +'</channel></rss>';
 const entries=rss.parseFeed(feed,rssXml);
 assert.equal(entries.length,2);
 assert.deepEqual(entries.map(x=>x.territorio),['RS','Oeste SC']);
 assert.ok(entries.every(x=>x.fonte===feed.nome));
});
test('RSS BRDE indisponível não impede outras quatro fontes',async()=>{
 const rssXml='<rss><channel><item><title>Investimento industrial em Porto Alegre</title><link>https://example.org/noticia</link></item></channel></rss>';
 const response={status:200,ok:true,headers:{get:()=> 'application/rss+xml'},text:async()=>rssXml};
 const result=await rss.collect(async(url)=>{
  if(url==='https://brde.com.br/feed/')throw Error('BRDE fora do ar');
  if(url.includes('bndes.gov.br'))return {status:200,ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify([])};
  return response;
 });
 assert.equal(result.totais.fontes,8);
 assert.equal(result.totais.funcionando,4);
 assert.equal(result.totais.comFalha,4);
 assert.equal(result.fontes.find(x=>x.id==='brde-regional').status,'erro');
});


test('sinal humanitário de FGTS não é investimento empresarial',()=>{
 const feed={area:'SC'};
 assert.equal(rss.classify(feed,'Atingidos por tornado em Chapecó podem sacar R$ 6,6 mil do FGTS e suspender financiamentos'),null);
 assert.equal(rss.classify(feed,'Famílias atingidas por chuvas recebem auxílio emergencial em Chapecó'),null);
 assert.ok(rss.classify(feed,'Empresa anuncia expansão de fábrica industrial em Chapecó'));
});
test('data civil de Brasília corrige publicações após 21h, quando já é outro dia em UTC',()=>{
 assert.equal(rss.businessDate('2026-11-17T01:28:00Z'),'2026-11-16');
 assert.equal(rss.businessDate('2026-11-17T03:01:00Z'),'2026-11-17');
 assert.equal(rss.isBusinessNewsToday({publicadoEm:'2026-11-16'},new Date('2026-11-17T01:28:00Z')),true);
 assert.equal(rss.isBusinessNewsToday({publicadoEm:'2026-11-06'},new Date('2026-11-17T01:28:00Z')),false);
 assert.equal(rss.isBusinessNewsToday({publicadoEm:''},new Date('2026-11-17T01:28:00Z')),false);
});
test('coletor diário recusa notícias antigas, sem data e financiamento humanitário',async()=>{
 const now=new Date();
 const today=now.toUTCString();
 const old=new Date(now.getTime()-86400000*3).toUTCString();
 const rssXml='<rss><channel>'+
  '<item><title>Empresa anuncia nova fábrica industrial em Porto Alegre</title><link>https://example.org/hoje</link><pubDate>'+today+'</pubDate></item>'+
  '<item><title>Empresa anuncia nova fábrica industrial em Porto Alegre</title><link>https://example.org/antiga</link><pubDate>'+old+'</pubDate></item>'+
  '<item><title>Empresa anuncia nova fábrica industrial em Porto Alegre</title><link>https://example.org/sem-data</link></item>'+
  '<item><title>Atingidos por tornado em Chapecó podem sacar FGTS e suspender financiamentos</title><link>https://example.org/fgts</link><pubDate>'+today+'</pubDate></item>'+
  '</channel></rss>';
 const result=await rss.collect(async(url)=>{
  if(url.includes('news.google.com'))throw Error('Feed Google não disponível');
  if(url.includes('bndes.gov.br'))return new Response('[]',{headers:{'Content-Type':'application/json'}});
  return new Response(rssXml,{headers:{'Content-Type':'application/rss+xml'}});
 });
 assert.equal(result.dataReferencia,rss.businessDate(new Date()));
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].url,'https://example.org/hoje');
 assert.equal(result.items[0].publicadoEm,result.dataReferencia);
});

test('manchete de CBS publicada hoje não pode ser descartada por ausência de palavras antigas',()=>{
 const title='Durigan explica no Senado alíquota de 11,3% da CBS';
 const feed=rss.FEEDS.find(x=>x.id==='ebc-economia');
 const category=rss.classify(feed,title);
 assert.ok(category,'a classificação deve permitir o assunto tributário do dia');
 assert.equal(category.setor,'Contexto econômico nacional');
 const date=new Date().toUTCString();
 const xml='<rss><channel><item><title>'+title+'</title><link>https://agenciabrasil.ebc.com.br/economia/noticia/2026-11/durigan-explica-no-senado-aliquota-de-113-da-cbs</link><pubDate>'+date+'</pubDate></item></channel></rss>';
 const rows=rss.parseFeed(feed,xml);
 assert.equal(rows.publicacoesLidas,1);
 assert.equal(rows.length,1);
 assert.equal(rows[0].publicadoEm,rss.businessDate(new Date()));
});
test('coleta distingue 8 fontes consultadas de notícias realmente elegíveis hoje',async()=>{
 const now=new Date(),recent=now.toUTCString(),old=new Date(now.getTime()-5*86400000).toUTCString();
 const xml='<rss><channel>'+
  '<item><title>Durigan explica no Senado alíquota de 11,3% da CBS</title><link>https://example.org/cbs-hoje</link><pubDate>'+recent+'</pubDate></item>'+
  '<item><title>Empresa anuncia expansão de fábrica no RS</title><link>https://example.org/antiga</link><pubDate>'+old+'</pubDate></item>'+
  '<item><title>Resultado de futebol sem relevância comercial</title><link>https://example.org/futebol</link><pubDate>'+recent+'</pubDate></item>'+
  '</channel></rss>';
 const batch=await rss.collect(async url=>{
  if(url.includes('news.google.com'))throw Error('Google fora do ar');
  if(url.includes('bndes.gov.br'))return new Response('[]',{headers:{'Content-Type':'application/json'}});
  return new Response(xml,{headers:{'Content-Type':'application/rss+xml'}});
 });
 assert.equal(batch.totais.fontes,8);
 assert.equal(batch.totais.funcionando,5);
 assert.equal(batch.totais.publicacoesLidas,12);
 assert.ok(batch.totais.elegiveisPeloTema>=1);
 assert.equal(batch.items.length,1);
 assert.match(batch.items[0].titulo,/CBS/);
 assert.equal(batch.items[0].publicadoEm,batch.dataReferencia);
 assert.equal(batch.fontes.find(x=>x.id==='ebc-economia').publicacoesLidas,3);
 assert.ok(batch.fontes.find(x=>x.id==='ebc-economia').publicadasHoje>=1);
});

test('Google Notícias usa consultas públicas separadas para RS, Canoas e Chapecó sem expor empresas',()=>{
 const sources=rss.GOOGLE_FEEDS;
 assert.deepEqual(sources.map(x=>x.id),['google-news-economia','google-news-canoas','google-news-chapeco']);
 assert.deepEqual(sources.map(x=>x.area),['Brasil','RS','SC']);
 for(const feed of sources){
  const u=new URL(feed.url),term=u.searchParams.get('q');
  assert.equal(u.hostname,'news.google.com');
  assert.match(term,/when:1d/);
  assert.ok(!/cnpj|empresa ficticia|empresa local|\d{14}/i.test(term));
 }
});
test('coleta integra notícias locais de Canoas e Chapecó sem duplicar URLs',async()=>{
 const feeds=rss.GOOGLE_FEEDS,now=new Date().toUTCString();
 const rssXml=(title,url)=>'<rss><channel><item><title>'+title+'</title><link>'+url+'</link><pubDate>'+now+'</pubDate></item></channel></rss>';
 const canoas=rssXml('Canoas: Parque de Inovação dobra empresas e prevê 250 empregos no RS','https://news.google.com/rss/articles/canoas-test');
 const chapeco=rssXml('Chapecó: indústria anuncia expansão de fábrica','https://news.google.com/rss/articles/chapeco-test');
 const batch=await rss.collect(async url=>{
  if(url===feeds[1].url)return new Response(canoas,{headers:{'Content-Type':'application/rss+xml'}});
  if(url===feeds[2].url)return new Response(chapeco,{headers:{'Content-Type':'application/rss+xml'}});
  throw Error('Fonte fora do ar nesta simulação');
 });
 assert.equal(batch.totais.fontes,8);
 assert.equal(batch.totais.funcionando,2);
 assert.equal(batch.items.length,2);
 assert.ok(batch.items.every(x=>x.publicadoEm===batch.dataReferencia));
 assert.ok(batch.items.some(x=>x.titulo.includes('Canoas')));
 assert.ok(batch.items.some(x=>x.titulo.includes('Chapecó')));
});
