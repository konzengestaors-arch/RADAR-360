const {test,expect}=require('@playwright/test');
const FEED={schema:'radar-observatorio-feed/1',items:[
 {titulo:'Empresa fictícia anuncia ampliação de operação',url:'https://example.org/empresa-ficticia',fonte:'Fonte demonstrativa',publicadoEm:'2026-11-07',setor:'Indústria'},
 {titulo:'Novos investimentos industriais na região',url:'https://example.org/investimentos',fonte:'Fonte demonstrativa',publicadoEm:'2026-11-06',setor:'Investimentos'}
],totais:{fontes:1,funcionando:1,comFalha:0,candidatos:2}};
for(const width of [320,390,768,1440]){
 test('painel premium prioriza noticias e empresas com responsividade em '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:860},isMobile:width<=390,hasTouch:width<=390});
  try{
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
   await page.goto('/demo/observatorio.html');
   const news=page.locator('.news-live-section'),companies=page.locator('.radar-company-panel'),markets=page.locator('#marketSnapshot');
   await expect(news.getByRole('heading',{name:'Notícias em destaque'})).toBeVisible();
   await expect(news.locator('.news-live-card')).toHaveCount(2);
   await expect(news.locator('.featured')).toHaveCount(1);
   await expect(companies).toBeVisible();
   await expect(page.locator('.radar-command-metric')).toHaveCount(3);
   await expect(page.locator('#radarTopNews')).toHaveText('2');
   const pos=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().top+window.scrollY;return {news:rect('.news-live-section'),companies:rect('.radar-company-panel'),market:rect('#marketSnapshot'),width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}});
   expect(pos.market).toBeLessThan(pos.news);
   expect(pos.news).toBeLessThan(pos.companies);
   await expect(page.locator('[data-quick-target]')).toHaveCount(3);
   expect(pos.scroll).toBeLessThanOrEqual(pos.width+2);
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
