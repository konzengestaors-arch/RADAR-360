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
  assert.equal(result.totais.comFalha, rss.FEEDS.length);
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
  const xml='<rss><channel><item><title>Investimento industrial em Porto Alegre</title><link>https://example.org/rss-good</link><pubDate>Sat, 07 Nov 2026 09:00:00 GMT</pubDate></item></channel></rss>';
  const fakeResponse={ok:true,status:200,headers:{get:()=> 'application/rss+xml'},text:async()=>xml};
  const batch=await rss.collect(async url=>{
    if(url.includes('bndes.gov.br'))throw new Error('JSON indisponível');
    return fakeResponse;
  });
  assert.equal(batch.totais.fontes,5);
  assert.equal(batch.totais.funcionando,4);
  assert.equal(batch.totais.comFalha,1);
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
 assert.equal(result.totais.fontes,5);
 assert.equal(result.totais.funcionando,4);
 assert.equal(result.totais.comFalha,1);
 assert.equal(result.fontes.find(x=>x.id==='brde-regional').status,'erro');
});
