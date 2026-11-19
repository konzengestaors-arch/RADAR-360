/* PWA QA: network-only, no offline snapshots, no Cache Storage, no company/news data stored. */
'use strict';
self.addEventListener('install',()=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode!=='navigate')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith('/demo/'))return;
 // Navigation always hits the server, including Vercel SSO. Never cache HTML or API data.
 event.respondWith(fetch(request,{cache:'no-store',redirect:'follow'}));
});
