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
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('crossorigin','use-credentials');
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
 expect(service.caches.filter(k=>k.startsWith('obs360-pwa-'))).toEqual(['obs360-pwa-offline-static-v2']);
 const stored=await page.evaluate(async()=>{
  const cache=await caches.open('obs360-pwa-offline-static-v2');
  const entries=await cache.keys();
  const html=await (await cache.match('/demo/offline.html')).text();
  return {paths:entries.map(entry=>new URL(entry.url).pathname),html};
 });
 expect(stored.paths).toEqual(['/demo/offline.html']);
 expect(stored.html).toContain('Sem conexão disponível');
 expect(stored.html).not.toContain('obs360_session');
 const worker=await (await page.request.get('/demo/pwa-qa-sw.js')).text();
 expect(worker).toContain("const CACHE='obs360-pwa-offline-static-v2'");
 expect(worker).toContain("request.mode!=='navigate'");
 expect(worker).not.toContain('cache.put(request');
 expect(worker).not.toContain('localStorage');
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


test('offline no Motorola emulado entrega somente tela estática, nunca dados privados',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo/observatorio.html');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();
 await page.context().setOffline(true);
 const response=await page.goto('/demo/observatorio.html');
 expect(response.status()).toBe(200);
 await expect(page.getByRole('heading',{name:'Sem conexão disponível'})).toBeVisible();
 await expect(page.locator('body')).toContainText('Nenhum conteúdo antigo');
 await expect(page.locator('#radarCompanyDossier')).toHaveCount(0);
 await expect(page.locator('.news-live-card')).toHaveCount(0);
 expect(await page.evaluate(async()=>{
  const names=await caches.keys();
  const values=[];
  for(const name of names){
   if(!name.startsWith('obs360-pwa-'))continue;
   for(const req of await (await caches.open(name)).keys())values.push(new URL(req.url).pathname);
  }
  return values;
 })).toEqual(['/demo/offline.html']);
 await page.context().setOffline(false);
});
test('offline e arquivos PWA mantêm formato estático e escopo privado',async({page})=>{
 const offline=await page.request.get('/demo/offline.html');
 expect(offline.status()).toBe(200);
 expect(offline.headers()['content-type']).toMatch(/text\/html/i);
 expect(await offline.text()).toContain('<meta name="obs360-offline" content="static-only">');
 const sw=await page.request.get('/demo/pwa-qa-sw.js');
 expect(sw.status()).toBe(200);
 expect(sw.headers()['content-type']).toMatch(/javascript/i);
 const json=JSON.parse(readFileSync(join(__dirname,'../vercel.json'),'utf8'));
 const rule=source=>json.headers.find(x=>x.source===source)?.headers||[];
 const value=(source,key)=>rule(source).find(h=>h.key.toLowerCase()===key.toLowerCase())?.value;
 expect(value('/demo/manifest.webmanifest','Content-Type')).toMatch(/manifest\+json/i);
 expect(value('/demo/pwa-qa-sw.js','Service-Worker-Allowed')).toBe('/demo/');
 expect(value('/demo/observatorio.html','Cache-Control')).toMatch(/no-store/);
 expect(value('/api/(.*)','Cache-Control')).toMatch(/no-store/);
});


const currentDay=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
function feedQa({items=[],date=currentDay(),consultadoEm=new Date().toISOString(),funcionando=8,comFalha=0}={}){
 return {schema:'radar-observatorio-feed/1',dataReferencia:date,consultadoEm,
   items,radar7d:items,totais:{fontes:8,funcionando,comFalha,candidatos:items.length,publicacoesLidas:18,elegiveisPeloTema:items.length}};
}
test('sem notícia de hoje é diferente de erro de fonte',async({page})=>{
 await page.route('**/api/noticias',r=>r.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify(feedQa({items:[]}))
 }));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarNewsFreshness')).toContainText('NENHUMA NOTÍCIA DE HOJE ENCONTRADA NOS FILTROS');
 await expect(page.locator('#radarLiveNews')).toContainText('Nenhuma publicação de hoje');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
 await page.unroute('**/api/noticias');
 await page.route('**/api/noticias',r=>r.fulfill({status:503,contentType:'application/json',body:'{"erro":"Fonte indisponível"}'}));
 await page.locator('#refreshNewsLive').click();
 await expect(page.locator('#radarNewsFreshness')).toContainText('ERRO NA CONSULTA');
 await expect(page.locator('#radarLiveNews')).not.toContainText('Nenhuma publicação de hoje');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
});
test('consulta de ontem não pode produzir manchete identificada como hoje',async({page})=>{
 const old=new Date(Date.now()-86400000).toISOString();
 const title='Notícia empresarial de um dia anterior';
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feedQa({
  date:new Date(Date.now()-86400000).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}),
  consultadoEm:old,items:[{titulo:title,fonte:'Fonte de teste',url:'https://example.org/yesterday',publicadoEm:currentDay()}]
 }))}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarNewsFreshness')).toContainText('CONTEÚDO ANTIGO OU INDISPONÍVEL');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
 await expect(page.locator('#radarSevenDayList')).not.toContainText(title);
 await expect(page.locator('#radarInvestmentSignals')).not.toContainText(title);
});
test('consulta vencida há uma hora não é tratada como atualização recente',async({page})=>{
 const title='Investimento que não pode permanecer em vitrine vencida';
 const stale=new Date(Date.now()-3600000).toISOString();
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feedQa({
  consultadoEm:stale,items:[{titulo:title,fonte:'Fonte QA',url:'https://example.org/stale',publicadoEm:currentDay()}]
 }))}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarNewsFreshness')).toContainText('CONTEÚDO ANTIGO OU INDISPONÍVEL');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
});
test('notícia verificada traz fonte, publicação, hora da consulta e alerta de fonte parcial',async({page})=>{
 const date=currentDay();
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feedQa({
  funcionando:6,comFalha:2,items:[{titulo:'Empresa amplia fábrica nesta data',url:'https://example.org/today',fonte:'Fonte institucional QA',publicadoEm:date}]
 }))}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarNewsFreshness')).toContainText('NOTÍCIAS DE HOJE · RECEBIDAS COM SUCESSO');
 await expect(page.locator('#radarNewsFreshness')).toContainText('COBERTURA PARCIAL: 2 fonte(s) falharam');
 await expect(page.locator('#radarNewsFreshness')).toContainText('Consulta');
 await expect(page.locator('.news-live-card')).toContainText('Fonte: Fonte institucional QA');
 await expect(page.locator('.news-live-card time')).toHaveAttribute('datetime',date);
 await expect(page.locator('.news-live-card')).toContainText('Publicado em '+date);
});
test('item antigo em lote atual fica fora do boletim diário',async({page})=>{
 const old=new Date(Date.now()-86400000).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const title='Relatório publicado ontem';
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feedQa({
  items:[{titulo:title,fonte:'Fonte QA',url:'https://example.org/old',publicadoEm:old}]
 }))}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarNewsFreshness')).toContainText('NENHUMA NOTÍCIA DE HOJE ENCONTRADA NOS FILTROS');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
 await expect(page.locator('#radarLiveNews')).not.toContainText(title);
});
