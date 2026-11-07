const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');
for(const module of ['comercial','observatorio'])test('acessibilidade automatizada móvel: '+module,async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():r.abort());
 await page.goto('/demo/'+module+'.html');
 if(module==='observatorio')await expect(page.locator('#tvIndicesStatus')).toHaveAttribute('data-state','unavailable');
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(result.violations).toEqual([]);
 if(module==='observatorio'){
  await expect(page.locator('#tvIndicesMount')).toHaveAttribute('data-unavailable','true');
  await page.locator('#openTools').click();
  await expect(page.getByRole('dialog',{name:'Fontes, histórico e backup'})).toBeVisible();
  const overflow=await page.locator('#dialogBody').evaluate(e=>e.scrollWidth>e.clientWidth+1);
  expect(overflow).toBe(false);
 }
 await context.close();
});
