const {test,expect}=require('@playwright/test');
const FEED={schema:'radar-observatorio-feed/1',items:[
 {titulo:'Empresa fictícia amplia operações regionais',url:'https://example.org/news1',fonte:'Fonte fictícia',publicadoEm:'2026-11-07',setor:'Indústria'},
 {titulo:'Investimento econômico regional',url:'https://example.org/news2',fonte:'Fonte fictícia',publicadoEm:'2026-11-07',setor:'Economia'}
]};
for(const width of [320,390,768,1440]){
 test('versão editorial mostra notícias e indicadores, sem faixas amarelas '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:860},isMobile:width<=390,hasTouch:width<=390});
  try{
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
   await page.goto('/demo/observatorio.html');
   await expect(page.locator('#environmentNotice')).toHaveClass(/sr-only/);
   await expect(page.locator('.news-live-card')).toHaveCount(2);
   await expect(page.locator('#marketSnapshot')).toBeVisible();
   const nav=width<=390?'.tabs-mobile':'.nav';
   await page.locator(nav+' [data-nav="noticias"]').click();
   await expect(page.locator('.news-live-card')).toHaveCount(2);
   await expect(page.locator('.secondary-filters')).not.toBeVisible();
   await expect(page.locator('.editorial-tools')).not.toHaveAttribute('open');
   await page.locator(nav+' [data-nav="indicadores"]').click();
   await expect(page.locator('#marketSnapshot')).toBeVisible();
   await expect(page.locator('#body')).toContainText('Câmbio e mercados globais');
   await expect(page.locator('[data-create="indicador"]')).not.toBeVisible();
   await page.locator(nav+' [data-nav="investimentos"]').click();
   await expect(page.locator('#body')).toContainText('Investimentos em acompanhamento');
   await expect(page.locator('[data-create="movimento"]')).not.toBeVisible();
   await page.locator('.editorial-tools summary').first().click();
   await expect(page.locator('[data-create="movimento"]')).toBeVisible();
   await page.locator('#openTools').click();
   await expect(page.locator('#dialogBody')).toContainText('Não utilize informações confidenciais');
   const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   expect(size.scroll).toBeLessThanOrEqual(size.width+2);
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
