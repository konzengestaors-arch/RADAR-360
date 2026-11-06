const {test,expect}=require('@playwright/test');
const path='/demo/comercial.html';
const key='radar_comercial_demo_publica_20261106';

test('demonstração comercial abre com três empresas fictícias',async({page})=>{
 await page.goto(path);
 await expect(page.locator('h1')).toHaveText('Inteligência comercial');
 await expect(page.locator('#numEmpresas')).toHaveText('3');
 await expect(page.locator('#empresas tr')).toHaveCount(3);
 await expect(page.locator('body')).toContainText('Não insira dados de clientes');
 const data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 expect(data.empresas.every(c=>c.nome.includes('Exemplo'))).toBeTruthy();
});
test('busca, filtro regional e seleção funcionam',async({page})=>{
 await page.goto(path);
 await page.locator('#regiao').selectOption('SC');
 await expect(page.locator('#empresas tr')).toHaveCount(1);
 await page.locator('#regiao').selectOption('');
 await page.locator('#busca').fill('Gama');
 await expect(page.locator('#empresas tr')).toHaveCount(1);
 await page.locator('#empresas button').click();
 await expect(page.locator('#empresaId')).toHaveValue('DEMO-003');
});
test('ação sintética persiste após reload sem tocar chave do Observatório',async({page})=>{
 const original='{"historico":"OBS NÃO ALTERAR"}';
 await page.addInitScript(x=>localStorage.setItem('radar_obs_demo_publica_20261106',x),original);
 await page.goto(path);
 await page.locator('#empresaId').selectOption('DEMO-001');
 await page.locator('#descricao').fill('Ação de teste sintética');
 await page.locator('#data').fill('2026-11-20');
 await page.locator('#acaoForm button').click();
 await expect(page.locator('#numAcoes')).toHaveText('1');
 await page.reload();
 await expect(page.locator('#numAcoes')).toHaveText('1');
 expect(await page.evaluate(()=>localStorage.getItem('radar_obs_demo_publica_20261106'))).toBe(original);
});
test('esquema incompatível na chave comercial entra em leitura sem sobrescrever',async({page})=>{
 const alien='{"schema":"radar-observatorio-unico/1.7","empresas":[],"acoes":[]}';
 await page.addInitScript(({k,v})=>localStorage.setItem(k,v),{k:key,v:alien});
 await page.goto(path);
 await expect(page.locator('.notice')).toContainText('Modo somente leitura');
 await expect(page.locator('#acaoForm button')).toBeDisabled();
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(alien);
});
test('exporta somente registro sintético',async({page})=>{
 await page.goto(path);
 const downloadWait=page.waitForEvent('download');
 await page.locator('#export').click();
 const dl=await downloadWait;
 expect(dl.suggestedFilename()).toBe('RADAR_COMERCIAL_DEMO_SINTETICO.json');
 const backup=JSON.parse(require('node:fs').readFileSync(await dl.path(),'utf8'));
 expect(backup.schema).toBe('radar-comercial-demo/1');
 expect(backup.empresas).toHaveLength(3);
 expect(backup.acoes).toHaveLength(0);
});
