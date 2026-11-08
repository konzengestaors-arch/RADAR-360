const {test,expect}=require('@playwright/test');
const fixture={schema:'radar-observatorio-feed/1',consultadoEm:'2026-11-07T20:00:00Z',
 totais:{fontes:1,funcionando:1},items:[
 {titulo:'BRDE anuncia financiamento para expansão de fábrica',url:'https://example.org/financiamento',fonte:'Fonte simulada',publicadoEm:'2026-11-07',setor:'Economia'},
 {titulo:'Inflação apresenta oscilação no mês',url:'https://example.org/inflacao',fonte:'Fonte simulada',publicadoEm:'2026-11-07',setor:'Economia'}
]};
for(const width of [320,390,1440]){
 test('briefing editorial visível e reversível em '+width+'px',async({browser})=>{
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700});
  try{
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('/demo/observatorio.html');
   await expect(page.locator('#radarLiveNews .news-live-card')).toHaveCount(2);
   const brief=page.locator('#radarLiveNews .radar-decision-brief').first();
   await expect(brief).toBeVisible();
   await brief.locator('summary').click();
   await expect(brief).toHaveAttribute('open','');
   await expect(brief).toContainText('O que falta confirmar?');
   await expect(brief).toContainText('Triagem não verificada');
   await expect(brief).toContainText('nenhuma ação comercial automática');
   expect(await page.evaluate(()=>window.__RADAR_TEST__.getState().movimentos.length)).toBe(0);
   const g=await page.evaluate(()=>({screen:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
   expect(g.content).toBeLessThanOrEqual(g.screen+2);
   expect(errors).toEqual([]);
  }finally{await ctx.close()}
 });
}
test('falha no feed não produz análise falsa',async({page})=>{
 await page.route('**/api/noticias',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarLiveNews')).toContainText('Notícias temporariamente indisponíveis');
 await expect(page.locator('#radarLiveNews .radar-decision-brief')).toHaveCount(0);
});
