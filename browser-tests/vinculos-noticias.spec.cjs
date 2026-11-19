const {test,expect}=require('@playwright/test');
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const makeFeed=(items=[])=>({schema:'radar-observatorio-feed/1',dataReferencia:today(),consultadoEm:new Date().toISOString(),items,radar7d:items,totais:{fontes:1,funcionando:1,comFalha:0}});
async function mock(page,title,source={}) {
 const rows=[{nome:'Empresa Exemplo Industrial SA',cnpj:'11222333000181',conflito:false}];
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authenticated:true})}));
 await page.route('**/api/empresas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schema:'observatorio-empresas/1',total:217,items:[...rows,...Array.from({length:216},(_,i)=>({nome:'Empresa Fictícia Número '+String(i+1).padStart(3,'0'),cnpj:i<95?String(i+1).padStart(14,'0'):'',conflito:i<8}))]})}));
 const item={titulo:title,url:'https://example.org/qa-hoje',fonte:'Fonte de teste',publicadoEm:today(),publicadoEmISO:new Date().toISOString()};
 await page.route('**/api/noticias',r=>r.fulfill({status:source.status||200,contentType:'application/json',body:JSON.stringify(source.status?{erro:'indisponível'}:makeFeed(source.empty?[]:[item]))}));
}
test('notícia de hoje com identificação literal é explicada no dossiê, sem promover oportunidade',async({page})=>{
 await mock(page,'Empresa Exemplo Industrial SA (CNPJ 11.222.333/0001-81) anuncia obra');
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('#radarCompanySearch').fill('Empresa Exemplo Industrial');
 await page.locator('[data-obs-company-index="0"]').click();
 await expect(page.locator('#radarCompanyDossier .obs-news-evidence')).toContainText('Confirmado por identificador publicado');
 await expect(page.locator('#radarCompanyDossier .obs-news-evidence a')).toHaveAttribute('href','https://example.org/qa-hoje');
 await expect(page.locator('#radarCompanyDossier .obs-news-evidence')).not.toContainText('score');
});
test('nenhuma notícia de hoje não oferece vínculo antigo',async({page})=>{
 await mock(page,'Empresa Exemplo Industrial SA anuncia obra',{empty:true});
 await page.goto('/demo/observatorio.html');
 await page.locator('#radarCompanySearch').fill('Empresa Exemplo Industrial');
 await page.locator('[data-obs-company-index="0"]').click();
 await expect(page.locator('#radarCompanyDossier .obs-news-evidence')).toContainText('Nenhuma notícia publicada hoje');
});
test('falha de fonte não é ausência de notícia',async({page})=>{
 await mock(page,'Empresa Exemplo Industrial SA anuncia obra',{status:503});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarNewsFreshness')).toContainText('ERRO NA CONSULTA');
 await page.locator('#radarCompanySearch').fill('Empresa Exemplo Industrial');
 await page.locator('[data-obs-company-index="0"]').click();
 await expect(page.locator('#radarCompanyDossier .obs-news-evidence')).toContainText('indisponíveis');
});
