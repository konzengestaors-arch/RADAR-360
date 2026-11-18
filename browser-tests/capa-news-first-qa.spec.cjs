const { test, expect } = require('@playwright/test');
const sizes = [{name:'android-390',width:390,height:844},{name:'android-360',width:360,height:800},{name:'desktop',width:1366,height:900}];
for(const size of sizes){
 test('capa news-first '+size.name,async ({page})=>{
  await page.setViewportSize({width:size.width,height:size.height});
  await page.goto('/demo/observatorio.html');
  const news=page.locator('.radar-edition-cover');
  const intel=page.locator('.radar-cover-intel');
  const directory=page.locator('.radar-directory-feature');
  await expect(news).toBeVisible();
  await expect(intel).toBeVisible();
  await expect(directory).toBeVisible();
  const newsBox=await news.boundingBox();
  const intelBox=await intel.boundingBox();
  const dirBox=await directory.boundingBox();
  expect(newsBox.y).toBeLessThan(intelBox.y);
  expect(intelBox.y).toBeLessThan(dirBox.y);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow,'horizontal overflow').toBe(false);
  await page.screenshot({path:'test-results/capa-'+size.name+'.png',fullPage:true});
 });
}

test('tema premium aplica verde escuro e dourado sem inventar métricas',async ({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  items:[{titulo:'Empresa anuncia fábrica na região',url:'https://example.org/teste',fonte:'Fonte de teste',publicadoEm:today}],
  radar7d:[{titulo:'Empresa anuncia fábrica na região',url:'https://example.org/teste',fonte:'Fonte de teste',publicadoEm:today}],
  totais:{fontes:8,funcionando:8,candidatos:1,radar7d:1}
 })}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radar-premium-qa')).toHaveAttribute('href','observatorio-premium-qa.css');
 await expect(page.locator('body')).toHaveAttribute('data-current-tab','panorama');
 await expect(page.locator('.news-live-card.featured')).toBeVisible();
 const colors=await page.evaluate(()=>{
  const hero=document.querySelector('.radar-issue-lead');
  const radar=document.querySelector('.radar-seven-day');
  const featured=document.querySelector('.news-live-card.featured');
  const metrics=document.querySelector('.radar-command-strip');
  return {
   heroRadius:getComputedStyle(hero).borderRadius,
   heroHeadline:getComputedStyle(hero.querySelector('h2')).color,
   radarBackground:getComputedStyle(radar).backgroundImage,
   featuredBackground:getComputedStyle(featured).backgroundImage,
   metricsDisplay:getComputedStyle(metrics).display,
   pageOverflow:document.documentElement.scrollWidth>window.innerWidth+2
  };
 });
 expect(colors.heroRadius).toBe('19px');
 expect(colors.heroHeadline).toBe('rgb(255, 248, 237)');
 expect(colors.radarBackground).toContain('linear-gradient');
 expect(colors.featuredBackground).toContain('linear-gradient');
 expect(colors.metricsDisplay).toBe('grid');
 expect(colors.pageOverflow).toBe(false);
 await expect(page.locator('#radarTopCompanies')).toHaveText('🔒');
 await expect(page.locator('.radar-seven-day-card')).toHaveCount(1);
 await expect(page.locator('.radar-seven-day-card')).not.toContainText('500 empregos');
});
test('tema não afeta a navegação dos outros módulos',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo/observatorio.html');
 await page.locator('[data-nav="investimentos"]').first().click();
 await expect(page.locator('body')).toHaveAttribute('data-current-tab','investimentos');
 const state=await page.evaluate(()=>({
  color:getComputedStyle(document.body).getPropertyValue('--portal-paper').trim(),
  visible:document.documentElement.scrollWidth<=window.innerWidth+2
 }));
 expect(state.visible).toBe(true);
 expect(state.color).not.toBe('#f7f5ef');
});
