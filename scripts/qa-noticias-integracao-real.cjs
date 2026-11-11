'use strict';
// Read-only integration check: fetches all public feeds without mocks.
// Outputs aggregate counts only, never article bodies, private catalog or credentials.
const handler=require('../api/noticias.js');
(async()=>{
 const {collect,GOOGLE_FEED}=handler._test;
 const {requestGoogleNews,classify}=handler._test;
 const {parseGoogleNewsRss}=require('../experiments/axiom/google-news-rss.cjs');
 const feed=GOOGLE_FEED;
 const googleDiag={query:new URL(feed.url).searchParams.get('q'),httpStatus:null,contentType:null,bytes:0,parsed:0,rejected:{missingDate:0,economicOrTerritorial:0,invalidUrl:0},selected:0,samples:[]};
 try{
  const response=await fetch(feed.url,{signal:AbortSignal.timeout(7000),redirect:'manual',headers:{Accept:'application/rss+xml,application/xml,text/xml;q=0.9'}});
  googleDiag.httpStatus=response.status;googleDiag.contentType=response.headers.get('content-type');
  const data=await response.arrayBuffer();googleDiag.bytes=data.byteLength;
  if(response.ok&&data.byteLength<=262144&&/(xml|rss)/i.test(googleDiag.contentType||'')){
   const parsed=parseGoogleNewsRss(Buffer.from(data).toString('utf8'));googleDiag.parsed=parsed.length;
   for(const item of parsed){let reason='selected';if(!item.publishedAt)reason='missingDate';else if(!classify(feed,item.title))reason='economicOrTerritorial';else if(!item.link||new URL(item.link).hostname!=='news.google.com')reason='invalidUrl';
    if(reason==='selected')googleDiag.selected++;else googleDiag.rejected[reason]++;
    if(googleDiag.samples.length<6)googleDiag.samples.push({title:item.title.slice(0,110),reason});
   }
  }
 }catch(e){googleDiag.error=String(e.message||e).slice(0,120)}
 console.log('GOOGLE_DIAGNOSTIC '+JSON.stringify(googleDiag));
 const collected=await collect();
 const counts=Object.fromEntries(collected.fontes.map(f=>[f.id,{status:f.status,selecionadas:f.selecionadas,erro:f.erro}]));
 const google=collected.fontes.find(f=>f.id===GOOGLE_FEED.id);
 const selectedGoogle=collected.items.filter(i=>i.fonte===GOOGLE_FEED.nome);
 const req={method:'GET'};
 let status=0,body=null;
 const res={setHeader(){},status(n){status=n;return this},json(v){body=v;return this}};
 // Invoke actual HTTP handler: it fetches real sources independently.
 await handler(req,res);
 const keys=['titulo','url','publicadoEm','fonte','territorio','setor','resumo'];
 const contract=Array.isArray(body?.items)&&body.items.every(i=>keys.every(k=>typeof i[k]==='string'));
 const unique=body?.items?.length===new Set(body.items.map(i=>i.url)).size;
 const httpGoogle=body?.fontes?.find(f=>f.id===GOOGLE_FEED.id);
 const summary={checkedAt:new Date().toISOString(),firstCollection:{fontes:collected.totais,porFonte:counts,googleSelecionadasAntesDoLimite:google?.selecionadas||0,googleNoResultadoFinal:selectedGoogle.length},api:{httpStatus:status,totais:body?.totais||null,googleStatus:httpGoogle?.status||null,googleSelecionadas:httpGoogle?.selecionadas||0,googleNoResultadoFinal:body?.items?.filter(i=>i.fonte===GOOGLE_FEED.nome).length||0,contractValid:contract,urlsUnique:unique,sourceCounts:Object.fromEntries((body?.fontes||[]).map(f=>[f.id,{status:f.status,selecionadas:f.selecionadas,erro:f.erro}]))}};
 console.log(JSON.stringify(summary,null,2));
 if(status!==200||!contract||!unique||summary.api.googleNoResultadoFinal===0)process.exitCode=1;
})().catch(e=>{console.error(JSON.stringify({error:String(e.message||e).slice(0,150)}));process.exitCode=1});
