const {test,expect}=require('@playwright/test');
const pageUrl='/demo/comercial.html';
const sizes=[320,390,430,768,1440];

for(const width of sizes){
  test('auditoria de layout e foco Comercial '+width+'px',async({browser})=>{
    const context=await browser.newContext({viewport:{width,height:800},isMobile:width<=430,hasTouch:width<=430});
    const page=await context.newPage();
    const failures=[];
    page.on('pageerror',e=>failures.push(e.message));
    await page.goto(pageUrl);
    const geometry=await page.evaluate(()=>{
      const viewport=document.documentElement.clientWidth;
      const scroll=document.documentElement.scrollWidth;
      const table=document.querySelector('.tablewrap');
      const r=table.getBoundingClientRect();
      const buttons=[...document.querySelectorAll('#import,#export,#acaoForm button,#oppForm button')].map(x=>{
        const b=x.getBoundingClientRect();return {name:x.id||x.textContent.trim(),width:b.width,height:b.height,x:b.x,right:b.right};
      });
      return {viewport,scroll,table:{left:r.left,right:r.right,scroll:table.scrollWidth,client:table.clientWidth},buttons};
    });
    expect(geometry.scroll,'Rolagem horizontal global não planejada').toBeLessThanOrEqual(geometry.viewport+2);
    expect(geometry.table.right).toBeLessThanOrEqual(geometry.viewport+2);
    for(const b of geometry.buttons){
      expect(b.x,'Botão fora da viewport: '+b.name).toBeGreaterThanOrEqual(-2);
      expect(b.right,'Botão fora da viewport: '+b.name).toBeLessThanOrEqual(geometry.viewport+2);
      expect(b.height,'Alvo de toque pequeno: '+b.name).toBeGreaterThanOrEqual(40);
    }
    await page.locator('#busca').focus();
    expect(await page.locator('#busca').evaluate(el=>document.activeElement===el)).toBe(true);
    expect(failures).toEqual([]);
    await context.close();
  });
}

test('laboratório comercial não acessa origens externas ao carregar e operar',async({page})=>{
  const requests=[];
  page.on('request',req=>{
    const url=new URL(req.url());
    if(url.origin!=='http://127.0.0.1:4173')requests.push(req.url());
  });
  await page.goto(pageUrl);
  await page.locator('#busca').fill('Beta');
  await page.locator('#regiao').selectOption('SC');
  await page.locator('#oppEmpresa').selectOption('DEMO-001');
  await page.locator('#oppTitulo').fill('Projeto fictício');
  await page.locator('#oppData').fill('2026-11-07');
  await page.locator('#oppForm button').click();
  await expect(page.locator('.opp-card')).toHaveCount(1);
  expect(requests).toEqual([]);
});
