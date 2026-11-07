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


test('restauração de backup sintético recupera ações após limpeza da chave', async ({page})=>{
 await page.goto(path);
 await page.locator('#empresaId').selectOption('DEMO-001');
 await page.locator('#descricao').fill('Ação sintética para recuperar');
 await page.locator('#data').fill('2026-11-20');
 await page.locator('#acaoForm button').click();
 await expect(page.locator('#numAcoes')).toHaveText('1');
 const fixture=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.evaluate(k=>localStorage.removeItem(k),key);
 await page.reload();
 await expect(page.locator('#numAcoes')).toHaveText('0');
 page.once('dialog',d=>d.accept());
 await page.locator('#backupFile').setInputFiles({name:'demo.json',mimeType:'application/json',buffer:Buffer.from(fixture)});
 await expect(page.locator('#numAcoes')).toHaveText('1');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(fixture);
});

test('backup comercial de esquema diferente é rejeitado e chave preservada',async({page})=>{
 await page.goto(path);
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('#backupFile').setInputFiles({name:'outro.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'radar-comercial/1.5',empresas:[],acoes:[]}))});
 await expect(page.locator('.notice')).toContainText('Restauração rejeitada');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});

test('arquivo corrompido é rejeitado sem afetar registros',async({page})=>{
 await page.goto(path);
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('#backupFile').setInputFiles({name:'corrompido.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
 await expect(page.locator('.notice')).toContainText('Restauração rejeitada');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});

test('cancelar a confirmação mantém a base intacta',async({page})=>{
 await page.goto(path);
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 page.once('dialog',d=>d.dismiss());
 await page.locator('#backupFile').setInputFiles({name:'valido.json',mimeType:'application/json',buffer:Buffer.from(before)});
 await expect.poll(()=>page.locator('#backupFile').evaluate(e=>e.value)).toBe('');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});

test('restauração aceita backup válido após armazenamento local incompatível',async({page})=>{
 const foreign='{"schema":"radar-observatorio-unico/1.7","empresas":[],"acoes":[]}';
 await page.addInitScript(({k,v})=>localStorage.setItem(k,v),{k:key,v:foreign});
 await page.goto(path);
 await expect(page.locator('#acaoForm button')).toBeDisabled();
 const valid={
   schema:'radar-comercial-demo/1',origem:'dados 100% sintéticos',
   empresas:[{id:'DEMO-001',nome:'Empresa Exemplo Alfa',segmento:'Indústria',regiao:'RS',etapa:'Qualificação',proximaAcao:'2026-11-12'}],acoes:[]
 };
 page.once('dialog',d=>d.accept());
 await page.locator('#backupFile').setInputFiles({name:'recuperado.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(valid))});
 await expect(page.locator('#acaoForm button')).toBeEnabled();
 await expect(page.locator('#numEmpresas')).toHaveText('1');
 expect(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).schema).toBe(valid.schema);
});


test('oportunidade sintética mantém histórico após reload e backup',async({page})=>{
 await page.goto(path);
 await page.locator('#oppEmpresa').selectOption('DEMO-002');
 await page.locator('#oppTitulo').fill('Proposta demonstrativa');
 await page.locator('#oppData').fill('2026-11-06');
 await page.locator('#oppForm button').click();
 await expect(page.locator('#oppCount')).toHaveText('1 oportunidades fictícias');
 const card=page.locator('.opp-card').first();
 await card.locator('select').selectOption('Proposta');
 await card.locator('input[type=date]').fill('2026-11-07');
 await card.locator('input[placeholder]').fill('Avanço apenas simulado');
 await card.locator('button').click();
 await expect(page.locator('.opp-card ol li')).toHaveCount(2);
 await page.reload();
 await expect(page.locator('.opp-card ol li')).toHaveCount(2);
 const data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 expect(data.oportunidades[0].status).toBe('Proposta');
 expect(data.oportunidades[0].historico[1].motivo).toBe('Avanço apenas simulado');
});

for(const width of [320,390,430]){
 test('comercial móvel '+width+' mantém ações e oportunidades visíveis',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:780},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto(path);
  await expect(page.locator('#import')).toBeVisible();
  await expect(page.locator('#export')).toBeVisible();
  await expect(page.locator('#oppForm button')).toBeVisible();
  await expect(page.locator('#oppHeading')).toBeVisible();
  await context.close();
 });
}


test('C08: JSON de teste inválido rejeitado após restauração conserva a ação sintética', async ({page})=>{
 await page.goto(path);
 await page.locator('#empresaId').selectOption('DEMO-001');
 await page.locator('#descricao').fill('Ação preservada no ensaio C08');
 await page.locator('#data').fill('2026-11-20');
 await page.locator('#acaoForm button').click();
 await expect(page.locator('#numAcoes')).toHaveText('1');
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('#backupFile').setInputFiles({
  name:'RADAR_TESTE_BACKUP_INVALIDO.json',mimeType:'application/json',
  buffer:Buffer.from('{"schema":"invalido","origem":"teste sintético de rejeição"}\\n'.replace('\\n','\n'))
 });
 await expect(page.locator('.notice')).toContainText('Restauração rejeitada');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
 await expect(page.locator('#acoes')).toContainText('Ação preservada no ensaio C08');
 await page.reload();
 await expect(page.locator('#numAcoes')).toHaveText('1');
 await expect(page.locator('#acoes')).toContainText('Ação preservada no ensaio C08');
});
