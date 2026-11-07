const {test,expect}=require('@playwright/test');
for(const width of [320,390,768]){
  test('navegação entre módulos sem vazamento de armazenamento em '+width+'px',async({browser})=>{
    const context=await browser.newContext({viewport:{width,height:820},isMobile:width<=390,hasTouch:width<=390});
    try{
      const page=await context.newPage();
      await page.goto('/demo/comercial.html');
      await expect(page.locator('.module-switcher a')).toBeVisible();
      const key='radar_comercial_demo_publica_20261106';
      const initial=await page.evaluate(k=>localStorage.getItem(k),key);
      await page.locator('.module-switcher a').click();
      await expect(page).toHaveURL(/\/demo\/observatorio\.html$/);
      const link=page.locator('.radar-module-link');
      await expect(link).toBeVisible();
      const status=await page.evaluate(k=>({
        local:localStorage.getItem(k),
        width:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth
      }),key);
      expect(status.local).toBe(initial);
      expect(status.scroll).toBeLessThanOrEqual(status.width+2);
      await link.click();
      await expect(page).toHaveURL(/\/demo\/comercial\.html$/);
      expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(initial);
    }finally{await context.close()}
  });
}
