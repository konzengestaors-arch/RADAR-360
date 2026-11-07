const {test,expect}=require('@playwright/test');
const fixture={schema:'radar-observatorio-feed/1',consultadoEm:'2026-11-07T20:00:00Z',
 totais:{fontes:3,funcionando:2,comFalha:1,candidatos:3},items:[
  {titulo:'BNDES aprova R$ 10 mi para rede de fibra ótica no Oeste de SC',url:'https://example.org/fibra',publicadoEm:'2026-11-07',fonte:'Fonte simulada'},
  {titulo:'Financiamento para construir novas instalações industriais',url:'https://example.org/fabrica',publicadoEm:'2026-11-06',fonte:'Fonte simulada'},
  {titulo:'Índice de inflação e taxa de juros',url:'https://example.org/juros',publicadoEm:'2026-11-07',fonte:'Fonte simulada'}
 ]};
for(const width of [320,390,1440])test('referências oficiais e sinais são categorias distintas em '+width+'px',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700});
 try{
  const page=await ctx.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
  await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.goto('/demo/observatorio.html');
  await page.locator('.nav [data-nav="investimentos"]').click();
  await expect(page.locator('#radarInvestmentSignals .radar-invest-list li')).toHaveCount(2);
  await expect(page.locator('.radar-official-reference-list li')).toHaveCount(6);
  await expect(page.locator('.radar-official-reference-list')).toContainText('BNDES');
  await expect(page.locator('.radar-invest-editorial[aria-label="Investimentos com documentos cadastrados"]')).toContainText('Projetos documentados');
  await expect(page.locator('#body')).toContainText('Nenhum projeto documentado');
  const links=await page.locator('.radar-official-reference-list a').evaluateAll(a=>a.map(x=>({href:x.href,rel:x.rel,target:x.target})));
  for(const link of links){expect(link.href).toMatch(/^https:/);expect(link.rel).toContain('noopener');expect(link.target).toBe('_blank')}
  expect(await page.evaluate(()=>window.__RADAR_TEST__.getState().movimentos.length)).toBe(0);
  const geom=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
  expect(geom.s).toBeLessThanOrEqual(geom.w+2);
  expect(errors).toEqual([]);
 }finally{await ctx.close()}
});
test('fontes oficiais continuam visíveis se RSS falhar',async({page})=>{
 await page.route('**/api/noticias',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto('/demo/observatorio.html');
 await page.locator('.nav [data-nav="investimentos"]').click();
 await expect(page.locator('#radarInvestmentSignals')).toContainText('Não foi possível consultar');
 await expect(page.locator('.radar-official-reference-list li')).toHaveCount(6);
});
