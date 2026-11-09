'use strict';
// Gate anônimo read-only: nunca enviar cookies, token ou bypass.
const raw = process.env.PREVIEW_ORIGIN;
if (!raw) { console.error('PREVIEW_ORIGIN obrigatório: não testar deployment implícito'); process.exit(2); }
let origin;
try {
 const url = new URL(raw);
 if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('URL inválida');
 origin = url.origin;
} catch { console.error('PREVIEW_ORIGIN deve ser URL HTTPS raiz de preview Vercel'); process.exit(2); }
const routes=['/','/observatorio.html','/empresas-catalogo-222.json','/api/noticias','/design-system.css'];
(async()=>{
 const outcomes=[];
 for(const route of routes){
  try{
   const r=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(12000),credentials:'omit'});
   const location=r.headers.get('location')||'';
   const dest=location?new URL(location,origin):null;
   const authRedirect=dest && /(^|\.)vercel\.(?:com|app)$/i.test(dest.hostname) && /(login|sso|authentication|auth)/i.test(dest.pathname+dest.search);
   const blocked=[401,403].includes(r.status)||Boolean(authRedirect);
   outcomes.push({route,status:r.status,blocked,redirectHost:dest?.hostname||null,redirectPath:dest?.pathname?.slice(0,120)||null});
  }catch(e){outcomes.push({route,status:null,blocked:false,reason:String(e.name||'network_error')})}
 }
 console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),outcomes},null,2));
 if(outcomes.some(x=>!x.blocked)){console.error('GATE P0 ABERTO: bloqueio anônimo não comprovado em todas as rotas');process.exitCode=1;}
 else console.log('GATE ANÔNIMO OK: cinco rotas exigem autenticação. Não prova identidade do commit nem permissões por usuário.');
})().catch(e=>{console.error('Falha do gate',e.message);process.exitCode=1});
