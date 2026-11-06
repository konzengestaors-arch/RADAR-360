const test = require('node:test');
const assert = require('node:assert/strict');
const { _test: rss } = require('../api/noticias.js');

test('feeds configurados usam HTTPS e não são URLs fornecidas pelo cliente', () => {
  assert.equal(rss.FEEDS.length, 3);
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
