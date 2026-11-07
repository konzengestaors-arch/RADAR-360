const {test,expect}=require('@playwright/test');
for(const width of [320,390,430]){
 test('Observatorio mobile '+width+' abre Dados & backup e exporta JSON',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true,acceptDownloads:true});
  try{
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('/demo/observatorio.html');
   const backup=page.locator('#openTools');
   await expect(backup).toBeVisible();
   const rect=await backup.boundingBox();
   expect(rect.x).toBeGreaterThanOrEqual(0);
   expect(rect.x+rect.width).toBeLessThanOrEqual(width+2);
   await backup.click();
   await expect(page.locator('#toolExport')).toBeVisible();
   await expect(page.locator('#toolImport')).toBeVisible();
   const dlPromise=page.waitForEvent('download');
   await page.locator('#toolExport').click();
   const dl=await dlPromise;
   expect(dl.suggestedFilename()).toMatch(/^RADAR_OBSERVATORIO_BACKUP_\d{4}-\d{2}-\d{2}\.json$/);
   const fs=require('node:fs');
   const backupData=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
   expect(backupData.schema).toBe('radar-observatorio-unico/1.7');
   const geometry=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+2);
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
