const {test,expect}=require('@playwright/test');
const route='/demo/comercial.html';
const storage='radar_comercial_demo_publica_20261106';
for(const width of [320,390,430,768,1440]){
 test('Comercial mantém controles funcionais em '+width+' px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:820},isMobile:width<=430,hasTouch:width<=430});
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(route);
  await expect(page.locator('#import')).toBeVisible();
  await expect(page.locator('#export')).toBeVisible();
  await expect(page.locator('#oppForm button')).toBeVisible();
  await page.locator('#regiao').selectOption('SC');
  await expect(page.locator('#empresas tr')).toHaveCount(1);
  await page.locator('#regiao').selectOption('');
  await expect(page.locator('#empresas tr')).toHaveCount(3);
  expect(pageErrors).toEqual([]);
  await context.close();
 });
}
test('oportunidade demonstra trilha persistente e bloqueia mudança sem justificativa',async({page})=>{
 await page.goto(route);
 await page.locator('#oppEmpresa').selectOption('DEMO-001');
 await page.locator('#oppTitulo').fill('Oportunidade sintética');
 await page.locator('#oppData').fill('2026-11-06');
 await page.locator('#oppForm button').click();
 await expect(page.locator('#oppList .opp-card')).toHaveCount(1);
 await expect(page.locator('#oppList .opp-card ol li')).toHaveCount(1);
 const card=page.locator('.opp-card');
 await card.locator('select').selectOption('Proposta');
 await card.locator('input[type=date]').fill('2026-11-07');
 await card.locator('button').click();
 await expect(page.locator('.notice')).toContainText('Justificativa obrigatória');
 await expect(card.locator('ol li')).toHaveCount(1);
 await card.locator('input[aria-label="Justificativa"]').fill('Etapa sintética validada');
 await card.locator('button').click();
 await expect(card.locator('ol li')).toHaveCount(2);
 await page.reload();
 await expect(page.locator('.opp-card ol li')).toHaveCount(2);
 const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storage);
 expect(stored.oportunidades[0].historico.map(x=>x.status)).toEqual(['Identificada','Proposta']);
});
test('restauração não aceita histórico sintético retroativo',async({page})=>{
 await page.goto(route);
 const current=await page.evaluate(k=>localStorage.getItem(k),storage);
 const backup=JSON.parse(current);
 backup.oportunidades=[{id:'OP-DEMO-001',empresaId:'DEMO-001',titulo:'Teste fictício',status:'Proposta',historico:[{status:'Identificada',data:'2026-11-07',motivo:'Abertura'},{status:'Proposta',data:'2026-11-06',motivo:'Retroativo'}]}];
 await page.locator('#backupFile').setInputFiles({name:'retroativo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await expect(page.locator('.notice')).toContainText('Restauração rejeitada');
 expect(await page.evaluate(k=>localStorage.getItem(k),storage)).toBe(current);
});
