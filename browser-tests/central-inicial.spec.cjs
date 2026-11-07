const {test,expect}=require('@playwright/test');
const HOME='/demo/index.html';
for (const width of [320,390,768,1440]) {
 test('central RADAR acessível, sem overflow, em '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:800},isMobile:width<=390,hasTouch:width<=390});
  try{
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(HOME);
   await expect(page).toHaveTitle(/RADAR 360/);
   await expect(page.getByRole('link',{name:'Abrir Comercial'})).toHaveCount(0);
   await expect(page.getByRole('link',{name:'Abrir Observatório'})).toBeVisible();
   await expect(page.locator('.card')).toHaveCount(1);
   await expect(page.locator('.notice')).toContainText('importado apenas neste dispositivo');
   const geometry=await page.evaluate(()=>{
      const links=[...document.querySelectorAll('.card a')].map(x=>{
       const r=x.getBoundingClientRect();
       return {left:r.left,right:r.right,height:r.height};
      });
      return {viewport:document.documentElement.clientWidth,
              scroll:document.documentElement.scrollWidth,links};
   });
   expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport+2);
   for(const link of geometry.links){
    expect(link.left).toBeGreaterThanOrEqual(-2);
    expect(link.right).toBeLessThanOrEqual(geometry.viewport+2);
    expect(link.height).toBeGreaterThanOrEqual(44);
   }
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
