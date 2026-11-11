'use strict';
// Read-only integration check: fetches all public feeds without mocks.
// Outputs aggregate counts only, never article bodies, private catalog or credentials.
const handler=require('../api/noticias.js');
(async()=>{
 const {collect,GOOGLE_FEED}=handler._test;
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
