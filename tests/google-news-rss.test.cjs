'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildGoogleNewsUrl,parseGoogleNewsRss}=require('../experiments/axiom/google-news-rss.cjs');
test('query brasileira codificada, janela temporal e sem catalogo',()=>{
 const url=new URL(buildGoogleNewsUrl('energia solar'));
 assert.equal(url.hostname,'news.google.com');
 assert.equal(url.searchParams.get('q'),'"energia solar" when:7d');
 assert.equal(url.searchParams.get('gl'),'BR');
});
test('RSS sintetico gera noticias nao verificadas',()=>{
 const xml='<rss><channel><item><title>Energia &amp; negócios</title><link>https://news.google.com/articles/test</link><pubDate>Tue, 10 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>';
 const items=parseGoogleNewsRss(xml);
 assert.equal(items.length,1);assert.equal(items[0].title,'Energia & negócios');
 assert.equal(items[0].verification,'unverified');
});
test('recusa HTML, payload grande e links sem HTTPS',()=>{
 assert.throws(()=>parseGoogleNewsRss('<html>error</html>'),/invalid_rss/);
 assert.throws(()=>parseGoogleNewsRss('x'.repeat(120001)),/invalid_rss/);
 assert.equal(parseGoogleNewsRss('<rss><channel><item><title>A</title><link>javascript:alert(1)</link></item></channel></rss>').length,0);
});
test('recusa buscas vazias ou extensas',()=>{
 assert.throws(()=>buildGoogleNewsUrl(' '),/invalid_query/);
 assert.throws(()=>buildGoogleNewsUrl('x'.repeat(121)),/invalid_query/);
});
