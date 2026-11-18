const { test, expect } = require('@playwright/test');
const sizes = [{name:'android-390',width:390,height:844},{name:'android-360',width:360,height:800},{name:'desktop',width:1366,height:900}];
for(const size of sizes){
 test('capa news-first '+size.name,async ({page})=>{
  await page.setViewportSize({width:size.width,height:size.height});
  await page.goto('/demo/observatorio.html');
  const news=page.locator('.radar-edition-cover');
  const intel=page.locator('.radar-cover-intel');
  const directory=page.locator('.radar-directory-feature');
  await expect(news).toBeVisible();
  await expect(intel).toBeVisible();
  await expect(directory).toBeVisible();
  const newsBox=await news.boundingBox();
  const intelBox=await intel.boundingBox();
  const dirBox=await directory.boundingBox();
  expect(newsBox.y).toBeLessThan(intelBox.y);
  expect(intelBox.y).toBeLessThan(dirBox.y);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow,'horizontal overflow').toBe(false);
  await page.screenshot({path:'test-results/capa-'+size.name+'.png',fullPage:true});
 });
}

test('tema premium aplica verde escuro e dourado sem inventar métricas',async ({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  items:[{titulo:'Empresa anuncia fábrica na região',url:'https://example.org/teste',fonte:'Fonte de teste',publicadoEm:today}],
  radar7d:[{titulo:'Empresa anuncia fábrica na região',url:'https://example.org/teste',fonte:'Fonte de teste',publicadoEm:today}],
  totais:{fontes:8,funcionando:8,candidatos:1,radar7d:1}
 })}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radar-premium-qa')).toHaveAttribute('href','observatorio-premium-qa.css');
 await expect(page.locator('body')).toHaveAttribute('data-current-tab','panorama');
 await expect(page.locator('.news-live-card.featured')).toBeVisible();
 const colors=await page.evaluate(()=>{
  const hero=document.querySelector('.radar-issue-lead');
  const radar=document.querySelector('.radar-seven-day');
  const featured=document.querySelector('.news-live-card.featured');
  const metrics=document.querySelector('.radar-command-strip');
  return {
   heroRadius:getComputedStyle(hero).borderRadius,
   heroHeadline:getComputedStyle(hero.querySelector('h2')).color,
   radarBackground:getComputedStyle(radar).backgroundImage,
   featuredBackground:getComputedStyle(featured).backgroundImage,
   metricsDisplay:getComputedStyle(metrics).display,
   pageOverflow:document.documentElement.scrollWidth>window.innerWidth+2
  };
 });
 expect(colors.heroRadius).toBe('19px');
 expect(colors.heroHeadline).toBe('rgb(255, 248, 237)');
 expect(colors.radarBackground).toContain('linear-gradient');
 expect(colors.featuredBackground).toContain('linear-gradient');
 expect(colors.metricsDisplay).toBe('grid');
 expect(colors.pageOverflow).toBe(false);
 await expect(page.locator('#radarTopCompanies')).toHaveText('🔒');
 await expect(page.locator('.radar-seven-day-card')).toHaveCount(1);
 await expect(page.locator('.radar-seven-day-card')).not.toContainText('500 empregos');
});
test('tema não afeta a navegação dos outros módulos',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo/observatorio.html');
 await page.locator('[data-nav="investimentos"]').first().click();
 await expect(page.locator('body')).toHaveAttribute('data-current-tab','investimentos');
 const state=await page.evaluate(()=>({
  color:getComputedStyle(document.body).getPropertyValue('--portal-paper').trim(),
  visible:document.documentElement.scrollWidth<=window.innerWidth+2
 }));
 expect(state.visible).toBe(true);
 expect(state.color).toBe('#f7f5ef');
});

/* Visual QA: nenhuma aba pode permanecer com tema antigo ou perder navegação.
   Conteúdo de notícias simulado SOMENTE nos testes, nunca no app. */
for(const view of [
 {label:'Android 360',width:360,height:800},
 {label:'Motorola 390',width:390,height:844},
 {label:'Desktop 1366',width:1366,height:900}
]){
 test('Premium consistente nas 4 abas · '+view.label,async({page})=>{
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  await page.setViewportSize({width:view.width,height:view.height});
  await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'}));
  await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   schema:'radar-observatorio-feed/1',consultadoEm:new Date().toISOString(),dataReferencia:today,
   items:[{titulo:'Empresa anuncia ampliação de parque industrial',url:'https://example.org/noticia-qa',publicadoEm:today,fonte:'Fonte QA'}],
   radar7d:[],totais:{fontes:8,funcionando:8,candidatos:1,radar7d:0}
  })}));
  await page.goto('/demo/observatorio.html');
  await expect(page.locator('#radar-premium-qa')).toHaveAttribute('href','observatorio-premium-qa.css');
  const tabs=[
   {id:'panorama',content:'.radar-issue-lead'},
   {id:'investimentos',content:'.radar-invest-editorial'},
   {id:'noticias',content:'.news-live-card.featured'},
   {id:'indicadores',content:'.market-board'}
  ];
  for(const tab of tabs){
   const button=page.locator('.nav [data-nav="'+tab.id+'"]');
   await button.click();
   await expect(page.locator('body')).toHaveAttribute('data-current-tab',tab.id);
   await expect(button).toHaveClass(/active/);
   await expect(page.locator(tab.content).first()).toBeVisible();
   const result=await page.evaluate(({id,selector})=>{
    const hero=document.querySelector(id==='panorama'?'.radar-issue-lead':'.editorial-lead');
    const title=hero.querySelector('h2');
    const sidebar=document.querySelector('.sidebar');
    const tabContent=document.querySelector(selector);
    const theme=getComputedStyle(hero),heading=getComputedStyle(title),menu=getComputedStyle(sidebar);
    const nodeStyle=getComputedStyle(tabContent);
    const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+2;
    return {heroGradient:theme.backgroundImage.includes('linear-gradient'),
      heroBorder:parseFloat(theme.borderTopWidth)>=1,
      whiteTitle:(()=>{const v=heading.color.match(/\d+/g)?.map(Number)||[];return v[0]>=245&&v[1]>=240&&v[2]>=220;})(),
      darkSidebar:menu.backgroundImage.includes('linear-gradient'),
      tabNodeVisible:nodeStyle.display!=='none',
      tabThemeBorder:parseFloat(nodeStyle.borderTopWidth)>=1,
      overflow};
   },{id:tab.id,selector:tab.content});
   expect(result.heroGradient,tab.id+' hero gradient').toBe(true);
   expect(result.heroBorder,tab.id+' hero border').toBe(true);
   expect(result.whiteTitle,tab.id+' title contrast').toBe(true);
   expect(result.darkSidebar,tab.id+' sidebar').toBe(true);
   expect(result.tabNodeVisible,tab.id+' content').toBe(true);
   expect(result.tabThemeBorder,tab.id+' premium card border').toBe(true);
   expect(result.overflow,tab.id+' horizontal overflow').toBe(false);
  }
 });
}
test('abas fora do Panorama conservam ações e estados vazios sem números simulados',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}),
  consultadoEm:new Date().toISOString(),items:[],radar7d:[],totais:{fontes:8,funcionando:8,candidatos:0,radar7d:0}
 })}));
 await page.goto('/demo/observatorio.html');
 await page.locator('.nav [data-nav="investimentos"]').click();
 await expect(page.locator('.editorial-empty')).toContainText('Nenhum projeto documentado');
 await expect(page.locator('.editorial-tools')).toBeVisible();
 await page.locator('.nav [data-nav="noticias"]').click();
 await expect(page.locator('#radarLiveNews')).toContainText('Nenhuma publicação de hoje');
 await expect(page.locator('#refreshNewsLive')).toBeEnabled();
 await page.locator('.nav [data-nav="indicadores"]').click();
 await expect(page.locator('#lista-indicadores')).toContainText('Sem indicadores documentais');
 await expect(page.locator('#refreshFx')).toBeVisible();
});

const premiumPages=[
 {tab:'investimentos',title:'Investimentos',module:'.radar-invest-editorial'},
 {tab:'noticias',title:'Notícias e movimentos',module:'.news-live-section'},
 {tab:'indicadores',title:'Indicadores econômicos',module:'.market-board'}
];
const premiumSizes=[
 {name:'motorola-390',width:390,height:844},
 {name:'desktop-1366',width:1366,height:900}
];
for(const info of premiumPages)for(const size of premiumSizes){
 test('identidade premium '+info.tab+' / '+size.name,async({page})=>{
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  await page.setViewportSize({width:size.width,height:size.height});
  await page.route('**/api/sessao',r=>r.fulfill({
   status:200,contentType:'application/json',body:'{"authenticated":false}'
  }));
  await page.route('**/api/noticias',r=>r.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({
    schema:'radar-observatorio-feed/1',
    dataReferencia:today,consultadoEm:new Date().toISOString(),
    items:[{titulo:'Empresa anuncia expansão industrial',url:'https://example.org/fonte',fonte:'Fonte de teste',publicadoEm:today}],
    radar7d:[{titulo:'Empresa anuncia expansão industrial',url:'https://example.org/fonte',fonte:'Fonte de teste',publicadoEm:today}],
    totais:{fontes:8,funcionando:8,candidatos:1,radar7d:1}
   })
  }));
  await page.goto('/demo/observatorio.html');
  await page.locator('.sidebar [data-nav="'+info.tab+'"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-current-tab',info.tab);
  await expect(page.locator('.editorial-lead')).toBeVisible();
  await expect(page.locator('.editorial-lead h2')).toHaveText(info.title);
  await expect(page.locator(info.module).first()).toBeVisible();
  await expect(page.locator('.sidebar [data-nav="'+info.tab+'"]')).toHaveClass(/active/);
  const style=await page.evaluate(()=>{
    const css=e=>getComputedStyle(e);
    const lead=document.querySelector('.editorial-lead');
    const nav=document.querySelector('.sidebar');
    const topbar=document.querySelector('.topbar');
    const heading=lead.querySelector('h2');
    const main=document.querySelector('.content');
    return {
     bg:css(document.body).backgroundColor,
     paper:css(document.body).getPropertyValue('--portal-paper').trim(),
     shell:css(document.querySelector('.shell')).display,
     sidebarBg:css(nav).backgroundImage,
     headerBg:css(topbar).backgroundColor,
     leadBg:css(lead).backgroundImage,
     headline:css(heading).color,
     column:css(main).maxWidth,
     scrollWidth:document.documentElement.scrollWidth,
     clientWidth:document.documentElement.clientWidth
    };
  });
  expect(style.bg).toBe('rgb(247, 245, 239)');
  expect(style.paper).toBe('#f7f5ef');
  expect(style.shell).toBe('block');
  expect(style.sidebarBg).toContain('linear-gradient');
  expect(style.headerBg).toBe('rgb(10, 41, 38)');
  expect(style.leadBg).toContain('linear-gradient');
  expect(style.headline).toBe('rgb(255, 248, 235)');
  expect(style.scrollWidth).toBeLessThanOrEqual(style.clientWidth+2);
  if(info.tab==='noticias'){
    await expect(page.locator('.news-live-card.featured')).toBeVisible();
    const featured=await page.locator('.news-live-card.featured').evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(featured).toContain('linear-gradient');
  }else if(info.tab==='indicadores'){
    await expect(page.locator('.market-board-head')).toBeVisible();
    const title=await page.locator('.market-board-head h2').evaluate(el=>getComputedStyle(el).color);
    expect(title).toBe('rgb(255, 248, 233)');
  }else{
    await expect(page.locator('.radar-invest-editorial')).toHaveCount(3);
  }
 });
}
test('premium em todas as abas preserva navegação e dados de origem',async({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/noticias',r=>r.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({
   schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
   items:[{titulo:'Empresa anuncia expansão industrial',url:'https://example.org/fonte',fonte:'Fonte de teste',publicadoEm:today}],
   radar7d:[],totais:{fontes:8,funcionando:8,candidatos:1,radar7d:0}
  })
 }));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarTopCompanies')).toHaveText('🔒');
 for(const tab of ['investimentos','noticias','indicadores','panorama']){
  await page.locator('.sidebar [data-nav="'+tab+'"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-current-tab',tab);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  expect(overflow,'without horizontal overflow on '+tab).toBe(false);
 }
 await expect(page.locator('.radar-issue-lead')).toBeVisible();
 await expect(page.locator('#radarTopCompanies')).toHaveText('🔒');
});
