const {test,expect}=require('@playwright/test');
const rows=Array.from({length:222},(_,i)=>({nome:'Empresa Fictícia Número '+String(i+1).padStart(3,'0'),cnpj:''}));
const FEED={schema:'radar-observatorio-feed/1',items:[{titulo:'Empresa Fictícia Número 003 anuncia fábrica',url:'https://example.org/news/003',fonte:'Fonte de teste',publicadoEm:'2026-11-07'}],totais:{fontes:1,funcionando:1,comFalha:0,candidatos:1}};
test('carrega 222 empresas da URL privada opcional sem persistir catálogo no navegador',async({page})=>{
 await page.route('**/empresas-catalogo-222.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('222');
 await expect(page.locator('.radar-company-hit')).toHaveCount(1);
 await expect(page.locator('.radar-company-hit')).toContainText('Empresa Fictícia Número 003');
 expect(await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'))).toBeNull();
});
test('importação local nunca é substituída pelo catálogo do deployment',async({page})=>{
 await page.route('**/empresas-catalogo-222.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.addInitScript(()=>localStorage.setItem('radar_empresas_publicas_nome_cnpj_v1',JSON.stringify([{nome:'Empresa Local Fictícia',cnpj:''}])));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('1');
 expect(await page.evaluate(()=>window.RadarCompanies.read())).toEqual([{nome:'Empresa Local Fictícia',cnpj:''}]);
});
test('erro de catálogo remoto não impede observatório nem notícias',async({page})=>{
 await page.route('**/empresas-catalogo-222.json',r=>r.fulfill({status:404,body:'not found'}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('0');
 await expect(page.locator('.news-live-card')).toHaveCount(1);
});

test('catálogo privado compactado de 222 empresas carrega sem persistir a lista',async({page})=>{
 const {gzipSync}=require('node:zlib');
 const gz=gzipSync(Buffer.from(JSON.stringify(rows),'utf8'));
 await page.route('**/empresas-catalogo-222.json.gz',r=>r.fulfill({status:200,contentType:'application/gzip',body:gz}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('222');
 await expect(page.locator('.radar-company-hit')).toHaveCount(1);
 expect(await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'))).toBeNull();
});
