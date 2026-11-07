const {test,expect}=require('@playwright/test');
const HOME='/demo/index.html';
for(const width of [320,390,768,1440]){
 test('raiz abre o Observatório sem etapa intermediária em '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:800},isMobile:width<=390,hasTouch:width<=390});
  try{
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(HOME,{waitUntil:'domcontentloaded'});
   await expect(page).toHaveURL(/\/demo\/observatorio\.html$/);
   await expect(page.locator('#pageName')).toHaveText('Panorama Regional');
   await expect(page.getByRole('heading',{name:'Notícias em destaque'})).toBeVisible();
   await expect(page.getByRole('link',{name:'Abrir Comercial'})).toHaveCount(0);
   await expect(page.getByRole('link',{name:'Abrir Observatório'})).toHaveCount(0);
   const sizes=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+2);
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
