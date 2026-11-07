const {test,expect}=require('@playwright/test');
for(const width of [320,390,768]){
 test('Panorama progressivo preserva indicadores e atalhos '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:820},isMobile:width<721,hasTouch:width<721});
  try{
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('/demo/observatorio.html');
   await expect(page.locator('#marketSnapshot')).toBeVisible();
   await expect(page.locator('.overview-section .stats')).toBeVisible();
   const details=page.locator('details[data-panorama-section]');
   await expect(details).toHaveCount(3);
   await expect(page.locator('[data-panorama-section="prioridades"]')).not.toHaveAttribute('open');
   await expect(page.locator('[data-panorama-section="agenda"]')).not.toHaveAttribute('open');
   await expect(page.locator('[data-panorama-section="registros"]')).not.toHaveAttribute('open');
   await page.locator('[data-panorama-section="prioridades"] summary').click();
   await expect(page.locator('[data-panorama-section="prioridades"]')).toHaveAttribute('open','');
   await page.locator('[data-stat-target="movimentos"]').click();
   await expect(page.locator('[data-panorama-section="registros"]')).toHaveAttribute('open','');
   await expect(page.locator('#lista-movimentos')).toBeVisible();
   await page.locator('#f-search').fill('Empresa fictícia');
   await expect(page.locator('[data-panorama-section="registros"]')).toHaveAttribute('open','');
   const geom=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   expect(geom.scroll).toBeLessThanOrEqual(geom.width+2);
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
