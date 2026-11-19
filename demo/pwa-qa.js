/* QA PWA setup. Installation requires the browser's native install prompt.
   No simulated install success, persistence or offline promises. */
(function(){
'use strict';
// An already-open tab must also hide previously rendered material when the
// connection drops. No old news, market values or private DOM stays visible.
// Reconnection always reloads through Vercel SSO instead of restoring a snapshot.
let offlineShown=false;
function showOffline(){
 if(offlineShown)return;
 offlineShown=true;
 const wrapper=document.createElement('main');
 wrapper.setAttribute('role','main');
 wrapper.style.cssText='box-sizing:border-box;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#071f1d;color:#f7f2e6;font:16px/1.6 system-ui,sans-serif';
 wrapper.innerHTML='<section style="max-width:530px;padding:30px;border:1px solid #c19e62;border-radius:18px;background:#113b32">'+
  '<small style="color:#e4c482;letter-spacing:.1em">OBSERVATÓRIO 360 · ACESSO PRIVADO</small>'+
  '<h1 style="font:500 34px/1.15 Georgia,serif;margin:15px 0;color:#fff7e7">Sem conexão disponível</h1>'+
  '<p>Nenhum conteúdo antigo será apresentado. Notícias, empresas, indicadores e apurações exigem acesso online e autenticação.</p>'+
  '<p>Quando a conexão voltar, entre novamente no Observatório.</p>'+
  '<a href="/demo/observatorio.html" style="color:#f4d28c">Tentar reconectar</a></section>';
 document.body.replaceChildren(wrapper);
 document.title='Observatório 360 — Sem conexão';
}
window.addEventListener('offline',showOffline);
window.addEventListener('online',()=>{if(offlineShown)location.reload()});
if(navigator.onLine===false)showOffline();

const button=document.getElementById('pwaInstallButton');
if(!button)return;
let deferredPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function updateButton(){button.style.display=deferredPrompt&&!standalone()?'inline-flex':'none'}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 deferredPrompt=event;
 updateButton();
});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;updateButton()});
button.addEventListener('click',async()=>{
 const prompt=deferredPrompt;
 if(!prompt){button.style.display='none';return}
 deferredPrompt=null;updateButton();
 try{await prompt.prompt();await prompt.userChoice}catch(_error){/* Browser controls install confirmation. */}
});
if('serviceWorker' in navigator&&(location.protocol==='https:'||['127.0.0.1','localhost'].includes(location.hostname))){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('/demo/pwa-qa-sw.js',{scope:'/demo/',updateViaCache:'none'})
   .catch(()=>{/* PWA remains usable as HTTPS site if service worker is unavailable. */});
 },{once:true});
}
updateButton();
})();
