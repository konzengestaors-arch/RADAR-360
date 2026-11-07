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
