'use strict';
/* Gate read-only. Nunca enviar cookies, token ou bypass em verificações anônimas. */
const origin='https://radar-360-homologacao-isolada-m07iqb4xx-konzengestaors-2191.vercel.app';
const routes=['/','/observatorio.html','/empresas-catalogo-222.json','/api/noticias','/design-system.css'];
(async()=>{
 const outcomes=[];
 for(const route of routes){
  try{
   const r=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(12000)});
   const location=r.headers.get('location')||'';
   const dest=location?new URL(location,origin):null;
   const authRedirect=dest && /(^|\\.)vercel\\.(?:com|app)$/i.test(dest.hostname) && /(login|sso|authentication|auth)/i.test(dest.pathname+dest.search);
   const blocked=[401,403].includes(r.status)||Boolean(authRedirect);
   outcomes.push({route,status:r.status,blocked,redirectHost:dest?.hostname||null});
  }catch(e){outcomes.push({route,status:null,blocked:false,reason:String(e.name||'network_error')})}
 }
 console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),outcomes},null,2));
 if(outcomes.some(x=>!x.blocked)){console.error('GATE P0 ABERTO: bloqueio anônimo não comprovado em todas as rotas');process.exitCode=1;}
 else console.log('GATE ANÔNIMO OK: cinco rotas exigem autenticação. Não prova permissões por usuário.');
})().catch(e=>{console.error('Falha do gate',e.message);process.exitCode=1});
