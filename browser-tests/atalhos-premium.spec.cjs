const {test,expect}=require('@playwright/test');
const feed={schema:'radar-observatorio-feed/1',items:[{titulo:'Notícia pública fictícia para validar navegação',url:'https://example.org/news-1',publicadoEm:'2026-11-07',fonte:'Fonte sintética',setor:'Economia'}],totais:{fontes:1,funcionando:1,comFalha:0,candidatos:1}};
const companies=Array.from({length:222},(_,i)=>({nome:'Empresa Fictícia '+String(i+1).padStart(3,'0'),cnpj:''}));
for(const width of [320,390,1440]){
test('cards KPI abrem listas sem perder Panorama em '+width+'px',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width,height:850},isMobile:width<500,hasTouch:width<500});
 try{
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
 await page.route('**/empresas-catalogo-222.json.gz',r=>r.fulfill({status:404,body:'Not found'}));
 await page.route('**/empresas-catalogo-222.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(companies)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarTopCompanies')).toHaveText('222');
 await expect(page.locator('#radarTopNews')).toHaveText('1');
 await page.locator('[data-quick-target="empresas"]').click();
 await expect(page.locator('.radar-company-directory')).toHaveAttribute('open','');
 await expect(page.locator('#radarCompanySearch')).toBeFocused();
 await page.locator('#radarCompanySearch').fill('Empresa Fictícia 003');
 await expect(page.locator('.radar-directory-list li')).toHaveCount(1);
 await page.locator('[data-quick-target="noticias"]').click();
 await expect(page.locator('#radarLiveNews')).toBeFocused();
 await expect(page.locator('#radarLiveNews')).toContainText('Notícia pública fictícia');
 if(width===390)await page.evaluate(()=>{
  window.__quickTrace=[];
  document.addEventListener('click',e=>{const t=e.target.closest('[data-quick-target],summary');if(t)window.__quickTrace.push({type:'click',tag:t.tagName,dataset:t.dataset.quickTarget||'',text:t.textContent.trim().slice(0,60)})},true);
  document.addEventListener('toggle',e=>{if(e.target.matches?.('details[data-panorama-section]'))window.__quickTrace.push({type:'toggle',section:e.target.dataset.panoramaSection,open:e.target.open})},true);
 });
 await page.locator('[data-quick-target="movimentos"]').click();
 if(width===390){console.log('FOCUS-DIAG',JSON.stringify(await page.evaluate(()=>{
  const section=document.getElementById('lista-movimentos');
  const parent=section?.closest('details');
  return {active:document.activeElement?.tagName,activeId:document.activeElement?.id,activeClass:document.activeElement?.className,open:parent?.open,activeHtml:document.activeElement?.outerHTML?.slice(0,200),trace:window.__quickTrace,visible:section?{display:getComputedStyle(section).display,visibility:getComputedStyle(section).visibility,rect:section.getBoundingClientRect().toJSON()}:null};
 })));}
 await expect(page.locator('#lista-movimentos')).toBeFocused();
 await expect(page.locator('[data-panorama-section="registros"]')).toHaveAttribute('open','');
 const widths=await page.evaluate(()=>({inner:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(widths.scroll).toBeLessThanOrEqual(widths.inner+2);
 expect(errors).toEqual([]);
 }finally{await ctx.close()}
});
}
