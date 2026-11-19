/* Observatório 360 · SW privado QA v2
 * ÚNICA resposta persistida: página estática offline.
 * A página principal, APIs, notícias, empresas e sessões ficam sempre network-only.
 * O cache offline não contém tokens, cookies, dados nem HTML autenticado.
 */
'use strict';
const CACHE='obs360-pwa-offline-static-v2';
const OFFLINE_PATH='/demo/offline.html';
const OFFLINE_MARKER='<meta name="obs360-offline" content="static-only">';
const FALLBACK='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#071f1d"><title>Observatório 360 — Sem conexão</title><body style="background:#071f1d;color:#f7f2e6;font:17px/1.6 system-ui;padding:32px"><h1>Observatório 360</h1><h2>Sem conexão</h2><p>Notícias, empresas e apurações não estão disponíveis offline. Nenhum conteúdo antigo é apresentado.</p><p>Reconecte-se e autentique-se novamente se necessário.</p><a style="color:#f2d191" href="/demo/observatorio.html">Tentar reconectar</a></body></html>';
const offlineResponse=()=>new Response(FALLBACK,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Obs360-Offline':'true'}});
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  try{
   const response=await fetch(OFFLINE_PATH,{credentials:'same-origin',cache:'no-store',redirect:'error'});
   if(response.ok&&!response.redirected&&new URL(response.url).pathname===OFFLINE_PATH&&
      /^text\/html\b/i.test(response.headers.get('Content-Type')||'')){
    const body=await response.text();
    // Reject Vercel login pages or any unexpected HTML before caching.
    if(body.includes(OFFLINE_MARKER)&&body.length<12000){
     const cache=await caches.open(CACHE);
     await cache.put(OFFLINE_PATH,new Response(body,{
      status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Obs360-Offline':'true'}
     }));
    }
   }
  }catch(_error){/* SSO or network unavailable. Built-in static fallback still works. */}
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('obs360-pwa-offline-static-')&&name!==CACHE).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.mode!=='navigate'||request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith('/demo/'))return;
 event.respondWith((async()=>{
  try{
   // Never return an old authenticated HTML page. Online navigation always
   // reaches Vercel SSO, including expired-session login redirects.
   return await fetch(request,{cache:'no-store'});
  }catch(_error){
   const cache=await caches.open(CACHE);
   return (await cache.match(OFFLINE_PATH))||offlineResponse();
  }
 })());
});
