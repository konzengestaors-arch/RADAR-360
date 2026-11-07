const {test,expect}=require('@playwright/test');
test('Observatório rejeita URL executável e tipos inválidos no backup sem mutação',async({page})=>{
 await page.goto('/demo/observatorio.html');
 for(const patch of [{url:'javascript:alert(1)'},{titulo:{texto:'inválido'}}]){
  const before=await page.evaluate(()=>localStorage.getItem(window.__RADAR_TEST__.getKEY()));
  const backup=JSON.parse(before);
  backup.indicadores.push({id:'IND-SINTETICO',titulo:'Indicador fictício',unidade:'unidades',periodo:'2026-11',fonte:'Fonte sintética',url:'https://example.org',...patch});
  await page.locator('#openTools').click();
  await page.locator('#fileInput').setInputFiles({name:'sintetico.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await expect(page.locator('#toast')).toContainText('Indicador com campos ou URL inválidos');
  expect(await page.evaluate(()=>localStorage.getItem(window.__RADAR_TEST__.getKEY()))).toBe(before);
  await page.locator('#dialogClose').click();
 }
});

test('abas desatualizadas não sobrescrevem ações comerciais confirmadas',async({context,page})=>{
 await page.goto('/demo/comercial.html');
 const other=await context.newPage();await other.goto('/demo/comercial.html');
 for(const [tab,text] of [[page,'Primeira ação sintética'],[other,'Segunda ação sintética']]){
  await tab.locator('#descricao').fill(text);await tab.locator('#data').fill('2026-11-06');
  await tab.locator('#acaoForm button').click();
 }
 await expect(other.locator('.notice')).toContainText('Base alterada em outra aba');
 await other.reload();await expect(other.locator('#acoes li')).toHaveCount(1);
 await expect(other.locator('#acoes')).toContainText('Primeira ação sintética');
});
test('abas desatualizadas não sobrescrevem indicadores confirmados',async({context,page})=>{
 await page.goto('/demo/observatorio.html');const other=await context.newPage();await other.goto('/demo/observatorio.html');
 const result=await page.evaluate(()=>{const s=window.__RADAR_TEST__.getState();s.indicadores.push({id:'IND-SINTETICO',titulo:'Indicador sintético',unidade:'unidades',periodo:'2026-11',fonte:'Fonte sintética'});return window.__RADAR_TEST__.commit(s)});
 expect(result).toBe(true);
 expect(await other.evaluate(()=>window.__RADAR_TEST__.commit(window.__RADAR_TEST__.getState()))).toBe(false);
 await expect(other.locator('#toast')).toContainText('Base alterada em outra aba');
 await other.reload();expect(await other.evaluate(()=>window.__RADAR_TEST__.getState().indicadores.length)).toBe(1);
});

test('câmbio permite nova tentativa após erro de rede',async({page})=>{
 let attempts=0;
 await page.route('https://api.frankfurter.dev/**',r=>{attempts++;return r.abort()});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#marketError')).toContainText('Câmbio indisponível');
 await expect(page.locator('#refreshFx')).toBeEnabled();
 expect(attempts).toBe(1);
 await page.locator('#refreshFx').click();
 await expect.poll(()=>attempts).toBe(2);
 await expect(page.locator('#refreshFx')).toBeEnabled();
});


test('Comercial não exporta fallback se armazenamento local estiver inválido',async({page})=>{
 const key='radar_comercial_demo_publica_20261106';
 const invalid='{"schema":"radar-comercial-v1.5","empresas":[]}';
 await page.addInitScript(({k,v})=>localStorage.setItem(k,v),{k:key,v:invalid});
 await page.goto('/demo/comercial.html');
 await expect(page.locator('#export')).toBeDisabled();
 await expect(page.locator('.notice')).toContainText('Modo somente leitura');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(invalid);
});
test('Comercial reabilita exportação somente após recuperação válida',async({page})=>{
 const key='radar_comercial_demo_publica_20261106';
 await page.goto('/demo/comercial.html');
 const valid=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.evaluate(k=>localStorage.setItem(k,'{corrompido'),key);
 await page.reload();
 await expect(page.locator('#export')).toBeDisabled();
 page.once('dialog',d=>d.accept());
 await page.locator('#backupFile').setInputFiles({
  name:'backup-sintetico.json',mimeType:'application/json',buffer:Buffer.from(valid)
 });
 await expect(page.locator('#export')).toBeEnabled();
 const dl=page.waitForEvent('download');
 await page.locator('#export').click();
 expect((await dl).suggestedFilename()).toBe('RADAR_COMERCIAL_DEMO_SINTETICO.json');
});
test('Comercial bloqueia exportação de aba desatualizada sem sobrescrever backup',async({context,page})=>{
 const key='radar_comercial_demo_publica_20261106';
 await page.goto('/demo/comercial.html');
 const other=await context.newPage();await other.goto('/demo/comercial.html');
 await page.locator('#descricao').fill('Ação fictícia validada');
 await page.locator('#data').fill('2026-11-06');
 await page.locator('#acaoForm button').click();
 const prior=await page.evaluate(k=>localStorage.getItem(k),key);
 await other.locator('#export').click();
 await expect(other.locator('.notice')).toContainText('Exportação bloqueada');
 expect(await other.evaluate(k=>localStorage.getItem(k),key)).toBe(prior);
});
