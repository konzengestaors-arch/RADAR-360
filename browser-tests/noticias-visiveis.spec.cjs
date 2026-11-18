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


test('investimentos dos últimos sete dias não confundem FGTS nem exibem arquivo antigo como atual',async({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const feed={
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  totais:{fontes:6,funcionando:6,comFalha:0,candidatos:3},
  items:[
   {titulo:'Atingidos por tornado em Chapecó podem sacar R$ 6,6 mil do FGTS e suspender financiamentos',
    url:'https://example.org/fgts',publicadoEm:today,fonte:'Fonte de teste',territorio:'Oeste SC'},
   {titulo:'Empresa anuncia investimento industrial e expansão de fábrica em Porto Alegre',
    url:'https://example.org/industria',publicadoEm:today,fonte:'Fonte de teste',territorio:'RS'},
   {titulo:'Empresa anuncia fábrica e investimentos antigos em Porto Alegre',
    url:'https://example.org/antigo',publicadoEm:'2026-11-06',fonte:'Fonte histórica de teste',territorio:'RS'}
  ]
 };
 // As notícias de hoje e o radar semanal têm coleções distintas na API.
 // A notícia antiga permanece como prova de que o filtro temporal funciona.
 feed.radar7d=[feed.items[1],feed.items[2]];
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.news-live-card')).toHaveCount(2);
 await expect(page.locator('.news-live-section')).not.toContainText('investimentos antigos');
 await page.locator('.nav [data-nav="investimentos"]').click();
 await expect(page.locator('#radarInvestmentSignals .radar-invest-list li')).toHaveCount(1);
 await expect(page.locator('#radarInvestmentSignals')).not.toContainText('FGTS');
 await expect(page.locator('#radarInvestmentSignals')).toContainText('expansão de fábrica');
 await expect(page.locator('.radar-invest-archive')).toBeVisible();
 await expect(page.locator('.radar-official-reference-list')).not.toBeVisible();
});
test('sem notícias de hoje, não recicla manchetes históricas',async({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const feed={schema:'radar-observatorio-feed/1',dataReferencia:today,
  consultadoEm:new Date().toISOString(),
  totais:{fontes:6,funcionando:5,comFalha:1,candidatos:0},
  items:[{titulo:'Investimento antigo em Porto Alegre',url:'https://example.org/antigo',
   fonte:'Fonte antiga',publicadoEm:'2026-11-06'}]};
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.news-live-card')).toHaveCount(0);
 await expect(page.locator('#radarLiveNews')).toContainText('Nenhuma publicação de hoje passou pelos filtros');
 await page.locator('.nav [data-nav="investimentos"]').click();
 await expect(page.locator('#radarInvestmentSignals')).toContainText('Nenhuma pista de investimento identificada nos últimos sete dias');
});

test('triagem editorial separa sinais empresariais das notícias macro no Android',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const page=await ctx.newPage();
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  const articles=[
   {titulo:'Dólar sobe para R$ 5,77 e fecha no maior valor desde abril',url:'https://example.org/dolar',publicadoEm:today,fonte:'Economia fictícia'},
   {titulo:'Empresa anuncia expansão de fábrica industrial em Porto Alegre',url:'https://example.org/empresa',publicadoEm:today,fonte:'Noticiário fictício'},
   {titulo:'Mercado reduz projeções para inflação e PIB',url:'https://example.org/ipca',publicadoEm:today,fonte:'Economia fictícia'}
  ];
  await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
   totals:{},totais:{fontes:6,funcionando:6,comFalha:0,candidatos:3},items:articles})}));
  await page.goto('/demo/observatorio.html');
  const lead=page.locator('.radar-cover-reading');
  await expect(lead).toContainText('Movimentos empresariais para investigar');
  await expect(lead.locator('#radarCoverTopics li')).toHaveCount(1);
  await expect(lead.locator('#radarCoverTopics')).toContainText('expansão de fábrica');
  await expect(lead.locator('#radarCoverMacro li')).toHaveCount(2);
  await expect(lead.locator('#radarCoverTopics')).not.toContainText('Dólar sobe');
  await lead.locator('summary').click();
  await expect(lead.locator('#radarCoverMacro')).toBeVisible();
  await expect(lead.locator('#radarCoverMacro')).toContainText('Dólar sobe');
  const cards=page.locator('#radarLiveNews .news-live-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText('expansão de fábrica');
  const financial=page.locator('.radar-cover-economy');
  await expect(financial).toContainText('Não é o fechamento do dólar comercial');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(width.scroll).toBeLessThanOrEqual(width.client+2);
 }finally{await ctx.close()}
});
test('somente câmbio e inflação não simulam oportunidades ou vínculos com empresas',async({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  totais:{fontes:6,funcionando:6,comFalha:0,candidatos:2},
  items:[
   {titulo:'Dólar sobe e fecha em alta no Brasil',url:'https://example.org/dolar',publicadoEm:today,fonte:'Fonte 1'},
   {titulo:'Mercado projeta inflação e PIB',url:'https://example.org/inflacao',publicadoEm:today,fonte:'Fonte 2'}
  ]})}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarCoverTopics')).toContainText('Sem sinais empresariais nas manchetes selecionadas hoje');
 await expect(page.locator('#radarCoverMacro li')).toHaveCount(2);
 await expect(page.locator('.news-live-card')).toHaveCount(2);
});

test('mostra manchete realista de CBS do dia como contexto e explica funil da coleta',async({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const title='Durigan explica no Senado alíquota de 11,3% da CBS';
 await page.route('**/api/noticias',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({
   schema:'radar-observatorio-feed/1',consultadoEm:new Date().toISOString(),dataReferencia:today,
   totais:{fontes:6,funcionando:6,comFalha:0,publicacoesLidas:83,elegiveisPeloTema:1,candidatos:1},
   items:[{titulo:title,url:'https://agenciabrasil.ebc.com.br/economia/noticia/2026-11/durigan-explica-no-senado-aliquota-de-113-da-cbs',
    fonte:'Agência Brasil · Economia',publicadoEm:today,territorio:'',setor:'Contexto econômico nacional'}]
  })}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarLiveNews')).toContainText(title);
 await expect(page.locator('#radarNewsFreshness')).toContainText('Publicações recebidas: 83');
 await expect(page.locator('#radarNewsFreshness')).toContainText('Publicadas hoje após filtros: 1');
 await expect(page.locator('#radarCoverMacro')).toContainText(title);
 await expect(page.locator('#radarCoverTopics')).toContainText('Sem sinais empresariais');
});

test('Investimentos exibe sinal de três dias mesmo quando o boletim de hoje está vazio',async({page})=>{
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const relative=days=>new Date(Date.parse(today+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);
 const recentTitle='Empresa anuncia expansão de fábrica no Rio Grande do Sul';
 const outdatedTitle='Empresa anuncia construção de fábrica antiga no Rio Grande do Sul';
 await page.route('**/api/noticias',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  totais:{fontes:8,funcionando:8,candidatos:0,radar7d:2},
  items:[],
  radar7d:[
   {titulo:recentTitle,url:'https://example.org/expansao-tres-dias',fonte:'Fonte regional QA',publicadoEm:relative(3)},
   {titulo:outdatedTitle,url:'https://example.org/expansao-antiga',fonte:'Fonte regional QA',publicadoEm:relative(8)}
  ]
 })}));
 await page.goto('/demo/observatorio.html');
 await page.locator('.sidebar [data-nav="investimentos"]').click();
 const signals=page.locator('#radarInvestmentSignals');
 await expect(signals).toContainText(recentTitle);
 await expect(signals).toContainText('Publicado em '+relative(3));
 await expect(signals).not.toContainText(outdatedTitle);
 await expect(page.locator('.radar-invest-editorial').first()).toContainText('últimos 7 dias');
 await page.locator('.sidebar [data-nav="noticias"]').click();
 await expect(page.locator('#radarLiveNews')).toContainText('Nenhuma publicação de hoje');
 await page.locator('.sidebar [data-nav="panorama"]').click();
 await expect(page.locator('.radar-seven-day-card')).toHaveCount(1);
 await expect(page.locator('.radar-seven-day-card')).toContainText(recentTitle);
 await expect(page.locator('.radar-seven-day-card')).not.toContainText(outdatedTitle);
});
