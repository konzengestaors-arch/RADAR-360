const {test,expect}=require('@playwright/test');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const dir=path.resolve(__dirname,'../dist/android');

test('pacote Comercial autocontido abre e executa scripts com CSP restritiva',async({page})=>{
 const file=path.join(dir,'RADAR_COMERCIAL_DEMO_LOCAL.html');
 expect(fs.existsSync(file)).toBeTruthy();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto(pathToFileURL(file).href);
 await expect(page.locator('h1')).toHaveText('Inteligência comercial');
 await expect(page.locator('#numEmpresas')).toHaveText('3');
 await expect(page.locator('#empresas tr')).toHaveCount(3);
 await page.locator('#busca').fill('Beta');
 await expect(page.locator('#empresas tr')).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('pacote Observatório mantém navegação e aviso de demonstração',async({page})=>{
 const file=path.join(dir,'RADAR_OBSERVATORIO_DEMO_LOCAL.html');
 expect(fs.existsSync(file)).toBeTruthy();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto(pathToFileURL(file).href);
 await expect(page.locator('#pageName')).toBeVisible();
 await expect(page.locator('#openTools')).toBeVisible();
 await expect(page.locator('body')).toContainText('DEMONSTRAÇÃO DE DESENVOLVIMENTO');
 expect(errors).toEqual([]);
});

// Complementa file://; HTTP não comprova suporte a arquivos locais no Android.
for(const [file,heading] of [['RADAR_COMERCIAL_DEMO_LOCAL.html','Inteligência comercial'],['RADAR_OBSERVATORIO_DEMO_LOCAL.html','Panorama Regional']]){
 test('HTML empacotado servido por HTTP: '+file,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():r.abort());
  await page.goto('/dist/android/'+file);
  await expect(page.locator('h1')).toHaveText(heading);
  if(file.includes('COMERCIAL')){
   await page.locator('#busca').fill('Beta');
   await expect(page.locator('#empresas tr')).toHaveCount(1);
  }else{
   await page.locator('#openTools').click();
   await expect(page.getByRole('dialog',{name:'Fontes, histórico e backup'})).toBeVisible();
  }
  expect(errors).toEqual([]);
 });
}
