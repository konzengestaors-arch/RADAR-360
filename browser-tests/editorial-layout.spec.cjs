const {test,expect}=require('@playwright/test');
for(const width of [390,768,1440])test('composição editorial navegável em '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schema:'radar-observatorio-feed/1',items:Array.from({length:8},(_,i)=>({titulo:'Empresa de teste anuncia expansão regional '+(i+1),url:'https://example.org/noticia/'+i,fonte:'Fonte de teste',publicadoEm:'2026-11-07',setor:'Economia'}))})}));
 await page.route('**/empresas-catalogo-222.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{nome:'Empresa de teste',cnpj:''}])}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.news-live-card')).toHaveCount(8);
 await expect(page.locator('.news-live-card.featured h3 a')).toBeVisible();
 await expect(page.locator('.fx-grid')).toBeVisible();
 await expect(page.locator('.radar-market-details')).not.toHaveAttribute('open','');
 await page.locator('.radar-market-details>summary').click();
 await expect(page.locator('#reloadMarkets')).toBeVisible();
 await page.locator('.radar-market-details>summary').click();
 await page.locator('[data-quick-target="empresas"]').click();
 await expect(page.locator('#radarCompanySearch')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.screenshot({path:'test-results/editorial-'+width+'.png',fullPage:true});
});
