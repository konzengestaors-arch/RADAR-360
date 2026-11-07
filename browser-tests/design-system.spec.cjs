const {test,expect}=require('@playwright/test');
for(const width of [320,390,1440]){
 test('Design System 1.0 carregado e acessível em '+width+'px',async({browser})=>{
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700});
  try{
   const page=await ctx.newPage();
   const failed=[];page.on('pageerror',err=>failed.push(err.message));
   await page.route('**/api/noticias',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
   await page.goto('/demo/observatorio.html');
   await expect(page.locator('link[href="design-system.css"]')).toHaveCount(1);
   const tokens=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--o360-accent').trim());
   expect(tokens).toBe('#087e69');
   const nav=page.locator('.sidebar .nav button').first();
   await expect(nav).toBeVisible();
   expect((await nav.boundingBox()).height).toBeGreaterThanOrEqual(43);
   if(width<=390){
    const buttons=page.locator('.top-actions .btn');
    let visibleCount=0;
    for(let i=0;i<await buttons.count();i++){
     const button=buttons.nth(i);
     if(!(await button.isVisible()))continue;
     visibleCount++;
     const rect=await button.boundingBox();
     expect(rect,'Botão visível deve ter geometria mensurável').not.toBeNull();
     expect(rect.height).toBeGreaterThanOrEqual(43);
    }
    expect(visibleCount,'Ao menos um botão superior visível').toBeGreaterThan(0);
   }
   const metrics=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+2);
   expect(failed).toEqual([]);
  }finally{await ctx.close()}
 });
}
