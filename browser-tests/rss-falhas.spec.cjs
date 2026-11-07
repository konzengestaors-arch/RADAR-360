const {test,expect}=require('@playwright/test');
const pagePath='/demo/observatorio.html', storage='radar_obs_demo_publica_20261106';
const feeds=[
 {id:'ebc-economia',nome:'Fonte sintética A',url:'https://example.org/a',status:'erro',selecionadas:0,erro:'rede indisponível'},
 {id:'g1-rs',nome:'Fonte sintética B',url:'https://example.org/b',status:'erro',selecionadas:0,erro:'rede indisponível'},
 {id:'g1-sc',nome:'Fonte sintética C',url:'https://example.org/c',status:'erro',selecionadas:0,erro:'rede indisponível'}
];
const batch=(overrides={})=>({
 schema:'radar-observatorio-feed/1',consultadoEm:'2026-11-07T02:00:00.000Z',items:[],
 totais:{fontes:3,funcionando:0,comFalha:3,candidatos:0},fontes:feeds,
 aviso:'Fontes sintéticas de regressão; sem rede externa.',...overrides
});
async function openInbox(page){
 await page.goto(pagePath);
 await page.locator('[data-open-inbox]').first().click();
 await expect(page.locator('#inboxFetch')).toBeVisible();
}
test('HTTP 503 RSS estruturado não parece sucesso nem substitui histórico',async({page})=>{
 await page.route('**/api/noticias',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify(batch())}));
 await openInbox(page);
 const before=await page.evaluate(k=>localStorage.getItem(k),storage);
 await page.locator('#inboxFetch').click();
 await expect(page.locator('#toast')).toContainText('Consulta RSS indisponível');
 await expect(page.locator('#toast')).toContainText('Nenhuma fonte RSS respondeu');
 await expect(page.locator('#inboxFetch')).toBeEnabled();
 expect(await page.evaluate(k=>localStorage.getItem(k),storage)).toBe(before);
});
test('HTTP 200 com zero fontes acessíveis também não altera base',async({page})=>{
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(batch())}));
 await openInbox(page);
 const before=await page.evaluate(k=>localStorage.getItem(k),storage);
 await page.locator('#inboxFetch').click();
 await expect(page.locator('#toast')).toContainText('Nenhuma fonte RSS acessível');
 expect(await page.evaluate(k=>localStorage.getItem(k),storage)).toBe(before);
});
test('HTTP 200 com coleta parcial exibe aviso e registra fontes indisponíveis',async({page})=>{
 const partial=batch({totais:{fontes:3,funcionando:1,comFalha:2,candidatos:0},
  fontes:[{...feeds[0],status:'ok',erro:''},feeds[1],feeds[2]]});
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(partial)}));
 await openInbox(page);
 await page.locator('#inboxFetch').click();
 await expect(page.locator('#toast')).toContainText('Consulta parcial: 1/3 fontes acessíveis');
 await expect(page.locator('#dialogBody')).toContainText('Última consulta:');
 const persisted=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).ultimaColetaRSS,storage);
 expect(persisted.fontesOk).toBe(1);
 expect(persisted.erros).toContain('rede indisponível');
});
