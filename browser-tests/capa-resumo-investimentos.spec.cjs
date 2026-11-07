const {test,expect}=require('@playwright/test');
const feed={schema:'radar-observatorio-feed/1',consultadoEm:'2026-11-07T17:30:00.000Z',totais:{fontes:3,funcionando:2,comFalha:1,candidatos:3},items:[
 {titulo:'Indústria fictícia anuncia investimento em fábrica regional',url:'https://example.org/investimento',publicadoEm:'2026-11-07',fonte:'Fonte sintética A',setor:'Economia'},
 {titulo:'Concessão de rodovia fictícia tem nova etapa',url:'https://example.org/rodovia',publicadoEm:'2026-11-07',fonte:'Fonte sintética B',setor:'Economia'},
 {titulo:'Taxa de juros da economia no radar',url:'https://example.org/juros',publicadoEm:'2026-11-07',fonte:'Fonte sintética C',setor:'Economia'}
]};
for(const width of [320,390,1440])test('capa sintetiza manchetes e investimentos sem inventar projetos em '+width+'px',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width,height:850},isMobile:width<500,hasTouch:width<500});
 try{
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
  await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
  await page.goto('/demo/observatorio.html');
  await expect(page.locator('.radar-cover-intel')).toBeVisible();
  await expect(page.locator('#radarCoverTopics li')).toHaveCount(3);
  await expect(page.locator('#radarCoverNewsStatus')).toContainText('2/3 fontes');
  await expect(page.locator('#radarNewsFreshness')).toContainText('Atualização sob demanda');
  await expect(page.locator('.news-live-card')).toHaveCount(3);
  await page.locator('#openTools').click();
  await expect(page.locator('#dialogTitle')).toHaveText('Dados e backup');
  await expect(page.locator('#toolExport')).toBeVisible();
  await expect(page.locator('#toolImport')).toBeVisible();
  await page.locator('#dialogClose').click();
  await page.locator('.nav [data-nav="investimentos"]').click();
  await expect(page.locator('#radarInvestmentSignals .radar-invest-list li')).toHaveCount(2);
  await expect(page.locator('#body')).toContainText('Nenhum projeto documentado');
  expect(await page.evaluate(()=>window.__RADAR_TEST__.getState().movimentos.length)).toBe(0);
  const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(size.scroll).toBeLessThanOrEqual(size.client+2);
  expect(errors).toEqual([]);
 }finally{await ctx.close()}
});
