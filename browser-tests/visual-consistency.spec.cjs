const {test,expect}=require('@playwright/test');
const fixture={
 schema:'radar-observatorio-feed/1',consultadoEm:'2026-11-07T20:00:00Z',
 totais:{fontes:1,funcionando:1,comFalha:0,candidatos:2},
 items:[
  {titulo:'BRDE anuncia crédito para expansão industrial no Sul',url:'https://example.org/industria',fonte:'Fonte de teste',publicadoEm:'2026-11-07',setor:'Indústria'},
  {titulo:'Setor portuário divulga investimentos regionais',url:'https://example.org/portos',fonte:'Fonte de teste',publicadoEm:'2026-11-07',setor:'Logística'}
 ]
};
for(const width of [320,390,1440]){
 test('consistência editorial e evidência de tela em '+width+'px',async({browser},testInfo)=>{
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1});
  try{
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('/demo/observatorio.html');
   await expect(page.locator('.radar-issue-lead')).toBeVisible();
   await expect(page.locator('.radar-issue-meta')).toContainText('OBSERVATÓRIO 360');
   await expect(page.locator('#radarLiveNews .news-live-card')).toHaveCount(2);
   await expect(page.locator('#radarLiveNews .radar-decision-brief')).toHaveCount(2);
   const box=await page.locator('.radar-issue-lead').boundingBox();
   expect(box).not.toBeNull();
   expect(box.width).toBeGreaterThan(180);
   const geometry=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+2);
   expect(errors).toEqual([]);
   require('node:fs').mkdirSync('visual-evidence',{recursive:true});
   const output='visual-evidence/observatorio-360-'+width+'px.png';
   await page.screenshot({path:output,fullPage:true,animations:'disabled'});
   await testInfo.attach('observatorio-360-'+width+'px',{path:output,contentType:'image/png'});
  }finally{await ctx.close()}
 });
}

test('catálogo local divergente mantém 50 empresas e mostra alerta no Android',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await ctx.addInitScript(()=>{
   const rows=Array.from({length:50},(_,i)=>({nome:'Empresa Local '+i,cnpj:''}));
   localStorage.setItem('radar_empresas_publicas_nome_cnpj_v1',JSON.stringify(rows));
  });
  const page=await ctx.newPage();
  await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.goto('/demo/observatorio.html');
  const diagnostic=page.locator('[data-catalog-diagnostic="true"]');
  await expect(diagnostic).toBeVisible();
  await expect(diagnostic).toContainText('ATENÇÃO: lista local com 50 registros');
  await expect(page.locator('.radar-company-panel')).toHaveAttribute('data-catalog-source','local');
  await expect(page.locator('.radar-company-count')).toHaveText('50');
 }finally{await ctx.close();}
});

test('catálogo privado simulado carrega 222 sem persistir no navegador',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const page=await ctx.newPage();
  await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.route('**/empresas-catalogo-222.json.gz',route=>route.fulfill({status:404,body:'not found'}));
  await page.route('**/empresas-catalogo-222.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Array.from({length:222},(_,i)=>({nome:'Empresa Simulada '+i,cnpj:''})))}));
  await page.goto('/demo/observatorio.html');
  await expect(page.locator('.radar-company-panel')).toHaveAttribute('data-catalog-source','staging');
  await expect(page.locator('.radar-company-count')).toHaveText('222');
  await expect(page.locator('[data-catalog-diagnostic="true"]')).toContainText('Identidade não verificada individualmente');
  const persisted=await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'));
  expect(persisted).toBeNull();
 }finally{await ctx.close();}
});

test('222 empresas locais não equivalem a catálogo privado validado',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await ctx.addInitScript(()=>localStorage.setItem('radar_empresas_publicas_nome_cnpj_v1',JSON.stringify(Array.from({length:222},(_,i)=>({nome:'Empresa Local '+i,cnpj:''})))));
  const page=await ctx.newPage();
  await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.goto('/demo/observatorio.html');
  await expect(page.locator('.radar-company-panel')).toHaveAttribute('data-catalog-source','local');
  await expect(page.locator('.radar-company-count')).toHaveText('222');
  await expect(page.locator('[data-catalog-diagnostic="true"]')).toContainText('identidade e atualização não verificadas');
 }finally{await ctx.close();}
});
test('catálogo privado indisponível não inventa empresas',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const page=await ctx.newPage();
  await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.route('**/empresas-catalogo-222.json.gz',route=>route.fulfill({status:404,body:'not found'}));
  await page.route('**/empresas-catalogo-222.json',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.goto('/demo/observatorio.html');
  await expect(page.locator('.radar-company-panel')).toHaveAttribute('data-catalog-source','none');
  await expect(page.locator('.radar-company-count')).toHaveText('0');
  await expect(page.locator('[data-catalog-diagnostic="true"]')).toContainText('Catálogo indisponível ou vazio');
 }finally{await ctx.close();}
});

test('catálogo com 222 registros inválidos é rejeitado sem persistência',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const page=await ctx.newPage();
  await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.route('**/empresas-catalogo-222.json.gz',route=>route.fulfill({status:404,body:'not found'}));
  await page.route('**/empresas-catalogo-222.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Array.from({length:222},(_,i)=>({nome:i===17?'<script>':'Empresa Simulada '+i,cnpj:''})))}));
  await page.goto('/demo/observatorio.html');
  await expect(page.locator('.radar-company-panel')).toHaveAttribute('data-catalog-source','none');
  await expect(page.locator('.radar-company-count')).toHaveText('0');
  await expect(page.locator('#radarCompanyMessage')).toContainText('não pôde ser carregado');
  expect(await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'))).toBeNull();
 }finally{await ctx.close();}
});
