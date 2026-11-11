'use strict';
// Isolated Google News RSS adapter: no network calls, private catalog, or production writes.
const MAX_XML_BYTES=120000;
function buildGoogleNewsUrl(term){
 if(typeof term!=='string'||term.trim().length<2||term.length>120)throw Error('invalid_query');
 const q='"'+term.trim().replace(/["<>]/g,'')+'" when:7d';
 return 'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=pt-BR&gl=BR&ceid=BR:pt-419';
}
function decodeEntities(s){return s.replace(/&(?:amp|lt|gt|quot|apos|#(\d+));/g,(m,n)=>n?String.fromCodePoint(Math.min(Number(n),0x10ffff)):({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m]||m));}
function value(xml,tag){const match=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));return match?decodeEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g,'').trim()):'';}
function parseGoogleNewsRss(xml){
 if(typeof xml!=='string'||Buffer.byteLength(xml,'utf8')>MAX_XML_BYTES||!/<rss\b/i.test(xml)||!/<channel\b/i.test(xml))throw Error('invalid_rss');
 const items=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[];
 return items.slice(0,50).map(item=>{
   const title=value(item,'title').replace(/<[^>]*>/g,'').trim();
   const link=value(item,'link').trim();
   const published=value(item,'pubDate');
   if(!title||!/^https:\/\/(news\.google\.com|[\w.-]+)\//i.test(link))return null;
   const date=Date.parse(published);
   return {title,link,source:'google-news-rss',publishedAt:Number.isFinite(date)?new Date(date).toISOString():null,verification:'unverified'};
 }).filter(Boolean);
}
module.exports={buildGoogleNewsUrl,parseGoogleNewsRss};
