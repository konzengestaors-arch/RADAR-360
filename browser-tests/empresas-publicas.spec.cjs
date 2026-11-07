const {test,expect}=require('@playwright/test');
const FEED={schema:'radar-observatorio-feed/1',items:[
 {titulo:'Cooperativa Teste anuncia investimento na região',url:'https://example.org/noticia-c',fonte:'Fonte fictícia',publicadoEm:'2026-11-07'},
 {titulo:'Empresas brasileiras ampliam negócios',url:'https://example.org/noticia-g',fonte:'Fonte fictícia',publicadoEm:'2026-11-07'}
],totais:{fontes:1,funcionando:1,comFalha:0,candidatos:2}};
test('importacao local armazena somente nome e CNPJ e vincula apenas noticia por nome exato',async({page})=>{
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 const rows=[
 {nome:'Cooperativa Teste',cnpj:'81.616.807/0001-55',carteira:'CLIENTES CORP',prioridade:'P1',reuniao:'Confidencial',telefone:'555-1234'},
 {nome:'Empresa Sem Menção',cnpj:'',acao:'Não enviar ao servidor'}
 ];
 const html='<html><script>const RECORDS='+JSON.stringify(rows)+';\nconst ISSUES=[];</script></html>';
 await page.locator('#radarCompanyFile').setInputFiles({name:'lista-sintetica.html',mimeType:'text/html',buffer:Buffer.from(html)});
 await expect(page.locator('.radar-company-count')).toHaveText('2');
 await expect(page.locator('.radar-company-hit')).toHaveCount(1);
 await expect(page.locator('.radar-company-hit')).toContainText('Cooperativa Teste');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1')));
 expect(stored).toEqual([{nome:'Cooperativa Teste',cnpj:'81616807000155'},{nome:'Empresa Sem Menção',cnpj:''}]);
 await expect(page.locator('.radar-company-panel')).not.toContainText('Confidencial');
 await page.reload();
 await expect(page.locator('.radar-company-count')).toHaveText('2');
});
test('arquivo malformado nao substitui catalogo preservado',async({page})=>{
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 await page.locator('#radarCompanyFile').setInputFiles({name:'ok.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{nome:'Empresa Fictícia Teste',cnpj:''}]))});
 await expect(page.locator('.radar-company-count')).toHaveText('1');
 const before=await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'));
 await page.locator('#radarCompanyFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"carteira":"privado"}')});
 await expect(page.locator('#radarCompanyMessage')).toContainText('Importação não realizada');
 const after=await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'));
 expect(after).toBe(before);
});
