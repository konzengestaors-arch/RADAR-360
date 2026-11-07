const {test,expect}=require('@playwright/test');
const records=[
 {nome:'Empresa Sem Risco',cnpj:'81616807000155'},
 {nome:'Empresa Identidade Ruim',cnpj:'00000000000000'},
 {nome:'Empresa Duplicada Alfa',cnpj:'94261534000115'},
 {nome:'Empresa Duplicada Beta',cnpj:'94261534000115'},
 {nome:'Empresa Com Acento',cnpj:''},
 {nome:'Empresa Com Acênto',cnpj:''}
];
const headlines=records.map((row,i)=>({titulo:row.nome+' anuncia investimento regional',url:'https://example.org/noticia-'+i,fonte:'Fonte fictícia',publicadoEm:'2026-11-07',territorio:'RS'}));
test('exclui identidades inconsistentes de sugestoes mas preserva pesquisa local',async({page})=>{
 await page.route('**/empresas-catalogo-222.json.gz',r=>r.fulfill({status:404,body:'not found'}));
 await page.route('**/empresas-catalogo-222.json',r=>r.fulfill({status:404,body:'not found'}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schema:'radar-observatorio-feed/1',items:headlines})}));
 await page.goto('/demo/observatorio.html');
 await page.locator('#radarCompanyFile').setInputFiles({name:'empresas.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(records))});
 await expect(page.locator('.radar-company-count')).toHaveText('6');
 await expect(page.locator('.radar-company-meta')).toContainText('5 registro(s) em conferência');
 await expect(page.locator('.radar-company-hit')).toHaveCount(1);
 await expect(page.locator('.radar-company-hit')).toContainText('Empresa Sem Risco');
 await page.locator('#radarCompanySearch').fill('Empresa Identidade Ruim');
 await expect(page.locator('.radar-directory-list li')).toHaveCount(1);
 await expect(page.locator('.radar-directory-list')).toContainText('00000000000000'.replace(/^(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})$/,'$1.$2.$3/$4-$5'));
 const source=await page.evaluate(()=>window.RadarCompanies.read());
 expect(source).toHaveLength(6);
});
