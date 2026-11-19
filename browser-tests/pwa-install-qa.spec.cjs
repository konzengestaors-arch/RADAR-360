const {test,expect}=require('@playwright/test');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const manifest=JSON.parse(readFileSync(join(__dirname,'../demo/manifest.webmanifest'),'utf8'));
function readPngMeta(file){
 const bytes=readFileSync(join(__dirname,'../demo/icons',file));
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG signature invalid');
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
test('manifest tem ícones PNG reais, escopo isolado e janela standalone',async({page})=>{
 expect(manifest.scope).toBe('/demo/');
 expect(manifest.start_url).toMatch(/^\/demo\/observatorio\.html/);
 expect(manifest.display).toBe('standalone');
 expect(manifest.icons).toHaveLength(3);
 expect(readPngMeta('observatorio-192.png')).toEqual({width:192,height:192});
 expect(readPngMeta('observatorio-512.png')).toEqual({width:512,height:512});
 expect(readPngMeta('observatorio-maskable-512.png')).toEqual({width:512,height:512});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/demo/manifest.webmanifest');
 const response=await page.request.get('/demo/manifest.webmanifest');
 expect(response.status()).toBe(200);
 expect((await response.json()).short_name).toBe('Observatório 360');
 for(const item of manifest.icons){
  const icon=await page.request.get(item.src);
  expect(icon.status(),item.src).toBe(200);
  expect((await icon.body()).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 }
});
test('service worker registra somente demo, sem guardar notícias, catálogo ou apurações',async({page})=>{
 await page.goto('/demo/observatorio.html');
 const service=await page.evaluate(async()=>{
  const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('SW timeout')),15000))]);
  return {scope:new URL(ready.scope).pathname,active:ready.active?.state,
   caches:await caches.keys()};
 });
 expect(service.scope).toBe('/demo/');
 expect(service.active).toBe('activated');
 expect(service.caches.filter(k=>k.includes('obs360'))).toHaveLength(0);
 const worker=await (await page.request.get('/demo/pwa-qa-sw.js')).text();
 expect(worker).not.toMatch(/caches\.open\(|cache\.put\(|localStorage/);
 expect(worker).toContain("cache:'no-store'");
 const control=await page.evaluate(()=>!!navigator.serviceWorker.controller);
 expect(control).toBe(true);
});
test('botão de instalar depende da autorização do navegador e não interfere nas quatro abas',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo/observatorio.html');
 const button=page.locator('#pwaInstallButton');
 await expect(button).toBeHidden();
 await page.evaluate(()=>{
  const e=new Event('beforeinstallprompt',{cancelable:true});
  Object.defineProperty(e,'prompt',{value:async()=>undefined});
  Object.defineProperty(e,'userChoice',{value:Promise.resolve({outcome:'dismissed'})});
  window.dispatchEvent(e);
 });
 await expect(button).toBeVisible();
 await button.click();
 await expect(button).toBeHidden();
 for(const tab of ['investimentos','noticias','indicadores','panorama']){
  await page.locator('.sidebar [data-nav="'+tab+'"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-current-tab',tab);
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 expect(overflow).toBe(false);
});
