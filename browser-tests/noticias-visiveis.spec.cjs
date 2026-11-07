const {test,expect}=require('@playwright/test');
const fixture={schema:'radar-observatorio-feed/1',consultadoEm:'2026-11-07T10:00:00Z',items:[
 {titulo:'Empresa fictícia anuncia novo investimento',url:'https://example.org/noticia-1',publicadoEm:'2026-11-07',fonte:'Fonte pública de teste',setor:'Indústria'},
 {titulo:'Movimento econômico regional de teste',url:'https://example.org/noticia-2',publicadoEm:'2026-11-06',fonte:'Fonte regional de teste',territorio:'RS'}
],totais:{fontes:1,funcionando:1,comFalha:0,candidatos:2},fontes:[]};

test('noticias aparecem sem filtros no Panorama e links apontam à fonte',async({page})=>{
 const requests=[];await page.route('**/api/noticias',async route=>{requests.push(route.request().url());await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)})});
 await page.goto('/demo/observatorio.html');
 const section=page.locator('.news-live-section');
 await expect(section).toBeVisible();
 await expect(section.locator('.news-live-card')).toHaveCount(2);
 await expect(section).toContainText('Empresa fictícia anuncia novo investimento');
 const link=section.getByRole('link',{name:'Ler matéria original ↗'}).first();
 await expect(link).toHaveAttribute('href','https://example.org/noticia-1');
 await expect(link).toHaveAttribute('rel',/noopener noreferrer/);
 expect(requests.length).toBe(1);
 const state=await page.evaluate(()=>window.__RADAR_TEST__.getState());
 expect(state.movimentos).toHaveLength(0);
 expect(state.caixaAtualizacoes||[]).toHaveLength(0);
});
test('falha no RSS mostra erro visivel sem inventar noticias',async({page})=>{
 await page.route('**/api/noticias',r=>r.fulfill({status:503,contentType:'application/json',body:'{"erro":"indisponivel"}'}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarLiveNews')).toContainText('temporariamente indisponíveis');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
 await expect(page.locator('#refreshNewsLive')).toBeEnabled();
});
test('vitrine de noticias cabe em mobile e atualiza sem duplicar',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:320,height:820},isMobile:true,hasTouch:true});
 try{
 const page=await ctx.newPage();
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.news-live-card')).toHaveCount(2);
 await page.locator('#refreshNewsLive').click();
 await expect(page.locator('.news-live-card')).toHaveCount(2);
 const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(size.scroll).toBeLessThanOrEqual(size.client+2);
 }finally{await ctx.close()}
});
