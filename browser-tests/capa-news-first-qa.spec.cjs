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
