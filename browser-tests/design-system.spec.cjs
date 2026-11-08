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
   await expect(page.locator('link[href="brand-observatorio.css"]')).toHaveCount(1);
   const brandReady=await page.evaluate(async()=>{
    const stylesheet=document.querySelector('link[href="brand-observatorio.css"]');
    const img=new Image();img.src='observatorio-mark.svg';
    try{await img.decode()}catch{return false}
    return Boolean(stylesheet?.sheet?.cssRules?.length>4 && img.naturalWidth>=90);
   });
   expect(brandReady,'Marca SVG e estilos de marca devem carregar').toBe(true);
   await expect(page.locator('.sidebar .brand-title')).toHaveText('OBSERVATÓRIO');
   await expect(page.locator('.sidebar .brand-subtitle')).toContainText('360');
   if(width<=390){
    const lockup=page.locator('.topbar .mobile-brand');
    await expect(lockup).toBeVisible();
    await expect(lockup).toContainText('OBSERVATÓRIO 360');
    const b=await lockup.boundingBox();
    expect(b).not.toBeNull();
    expect(b.width).toBeLessThanOrEqual(width-12);
   }
   await expect(page.locator('link[href="editorial-portal.css"]')).toHaveCount(1);
   await expect(page.locator('link[href="editorial-panels.css"]')).toHaveCount(1);
   const panelCss=await page.evaluate(()=>document.querySelector('link[href="editorial-panels.css"]')?.sheet?.cssRules?.length||0);
   expect(panelCss,'Estilos de painéis devem estar acessíveis').toBeGreaterThan(15);
   const externalCss=await page.evaluate(()=>{
    const link=document.querySelector('link[href="editorial-portal.css"]');
    return link?.sheet?.cssRules?.length||0;
   });
   expect(externalCss,'CSS editorial deve carregar e conter regras').toBeGreaterThan(20);
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
