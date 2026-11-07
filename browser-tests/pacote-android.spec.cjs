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
