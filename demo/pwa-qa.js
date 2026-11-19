/* QA PWA setup. Installation requires the browser's native install prompt.
   No simulated install success, persistence or offline promises. */
(function(){
'use strict';
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
