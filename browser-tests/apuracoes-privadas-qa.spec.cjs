const {test,expect}=require('@playwright/test');
function makeCnpj(n){
 const root=String(n+1).padStart(12,'0');
 const digit=(s,w)=>{const m=w.reduce((v,x,i)=>v+x*Number(s[i]),0)%11;return String(m<2?0:11-m)};
 const d1=digit(root,[5,4,3,2,9,8,7,6,5,4,3,2]);
 return root+d1+digit(root+d1,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
}
const rows=Array.from({length:217},(_,i)=>({
 nome:'Empresa Fictícia Número '+String(i+1).padStart(3,'0'),
 cnpj:i<96?makeCnpj(i):'',conflito:i<8
}));
const newsTitle='Empresa Fictícia Número 011 anuncia expansão de fábrica industrial';
const newsUrl='https://example.org/expansao/011';
async function scenario(page,config={}){
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const dayBefore=new Date(Date.parse(today+'T12:00:00Z')-2*86400000).toISOString().slice(0,10);
 let session=config.session!==false,review=config.initialReview||null,writes=0,reads=0,privateReads=0,listReads=0;
 await page.route('**/api/sessao',r=>{
  if(r.request().method()==='DELETE')session=false;
  if(r.request().method()==='POST')session=true;
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authenticated:session,configured:true})});
 });
 await page.route('**/api/empresas',r=>{
  privateReads++;
  return r.fulfill({status:session?200:401,contentType:'application/json',body:JSON.stringify(session?{schema:'observatorio-empresas/1',total:217,items:rows}:{erro:'Sessão necessária'})});
 });
 await page.route(/\/api\/apuracoes(?:\?|$)/,r=>{
  if(r.request().method()==='POST'){
   writes++;
   if(config.rejectSave)return r.fulfill({status:503,contentType:'application/json',body:'{"erro":"Falha de persistência"}'});
   if(!session)return r.fulfill({status:401,contentType:'application/json',body:'{"erro":"Sessão necessária"}'});
   const data=r.request().postDataJSON();
   review={...data,updatedAt:new Date().toISOString()};
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:review})});
  }
  reads++;
  const single=r.request().url().includes('?noticia=');
  if(!single)listReads++;
  if(config.rejectRead||(config.rejectList&&!single))return r.fulfill({status:503,contentType:'application/json',body:'{"erro":"Falha de leitura"}'});
  return r.fulfill({status:session?200:401,contentType:'application/json',body:JSON.stringify(session?(single?{item:review}:{items:review?[review]:[]}):{erro:'Sessão necessária'})});
 });
 const news={
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  items:[],radar7d:config.noNews?[]:[{titulo:newsTitle,url:newsUrl,publicadoEm:dayBefore,fonte:'Fonte QA'}],
  totais:{fontes:8,funcionando:8,publicacoesLidas:18,elegiveisPeloTema:1,candidatos:0,radar7d:1}
 };
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(news)}));
 return {writes:()=>writes,reads:()=>reads,listReads:()=>listReads,privateReads:()=>privateReads,saved:()=>review,setSession:value=>{session=value}};
}
test('apuração manual de notícia semanal persiste e é relida, sem POST automático',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const api=await scenario(page);
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 const card=page.locator('.radar-seven-day-card').first();
 await expect(card).toContainText('expansão de fábrica industrial');
 const trigger=card.locator('[data-radar-review]');
 await expect(trigger).toBeVisible();
 expect(api.writes()).toBe(0);
 await trigger.click();
 const dialog=page.locator('#obs360ReviewDialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('#obs360ReviewMessage')).toContainText('Nenhuma apuração anterior');
 expect(api.writes()).toBe(0);
 await expect(dialog.locator('#obs360ReviewStatus')).toHaveValue('inconclusivo');
 await expect(dialog.locator('#obs360ReviewEvidence')).toHaveValue(newsUrl);
 await dialog.locator('#obs360ReviewFinding').fill('Expansão mencionada na publicação. Confirmar estágio do projeto e seguros existentes.');
 await dialog.locator('#obs360ReviewSave').click();
 await expect(dialog.locator('#obs360ReviewMessage')).toContainText('Apuração salva e relida do servidor');
 expect(api.writes()).toBe(1);
 expect(api.reads()).toBeGreaterThanOrEqual(2);
 expect(api.saved().articleUrl).toBe(newsUrl);
 expect(api.saved().status).toBe('inconclusivo');
 expect(api.saved().finding).toContain('Confirmar estágio');
 await dialog.locator('#obs360ReviewClose').click();
 await page.locator('.sidebar [data-nav="investimentos"]').click();
 const investment=page.locator('#radarInvestmentSignals [data-radar-review]');
 await expect(investment).toBeVisible();
 await investment.click();
 await expect(dialog.locator('#obs360ReviewMessage')).toContainText('Apuração já registrada');
 await expect(dialog.locator('#obs360ReviewFinding')).toHaveValue(api.saved().finding);
 expect(api.writes()).toBe(1);
 const width=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(width).toBeLessThanOrEqual(2);
});
test('sessão bloqueada não expõe formulário nem grava dados',async({page})=>{
 const api=await scenario(page,{session:false});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-seven-day-card')).toHaveCount(1);
 await expect(page.locator('[data-radar-review]')).toHaveCount(0);
 await expect(page.locator('#obs360ReviewDialog')).toHaveCount(0);
 expect(api.writes()).toBe(0);
 expect(api.privateReads()).toBe(0);
});
test('falha na leitura inicial bloqueia POST para não sobrescrever apuração desconhecida',async({page})=>{
 const api=await scenario(page,{rejectRead:true});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('.radar-seven-day-card [data-radar-review]').click();
 await expect(page.locator('#obs360ReviewMessage')).toContainText('Nenhuma alteração será permitida');
 await expect(page.locator('#obs360ReviewSave')).toBeDisabled();
 expect(api.writes()).toBe(0);
});
test('falha no salvamento não informa registro confirmado',async({page})=>{
 const api=await scenario(page,{rejectSave:true});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('.radar-seven-day-card [data-radar-review]').click();
 await expect(page.locator('#obs360ReviewMessage')).toContainText('Nenhuma apuração anterior');
 await page.locator('#obs360ReviewFinding').fill('Não há confirmação documental suficiente, precisa de diligência.');
 await page.locator('#obs360ReviewSave').click();
 await expect(page.locator('#obs360ReviewMessage')).toContainText('Gravação não confirmada (HTTP 503)');
 await expect(page.locator('#obs360ReviewMessage')).not.toContainText('Apuração salva e relida');
 expect(api.writes()).toBe(1);
});

test('biblioteca recupera apuração mesmo depois da notícia sair da janela semanal',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const oldReview={
  articleUrl:'https://example.org/antiga/noticia',
  evidenceUrl:'https://example.org/antiga/documento-oficial',
  title:'Projeto industrial com decisão anterior à janela de notícias',
  finding:'Fonte documental consultada, etapas contratuais ainda precisam de verificação.',
  status:'inconclusivo',updatedAt:'2026-10-31T16:00:00Z'
 };
 const api=await scenario(page,{noNews:true,initialReview:oldReview});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await expect(page.locator('.radar-seven-day-card')).toHaveCount(0);
 const list=page.locator('#obs360ReviewList');
 await expect(list.locator('.obs360-review-list-card')).toHaveCount(1);
 await expect(list).toContainText('Projeto industrial com decisão anterior');
 await expect(list).toContainText('Pendente de diligência');
 await expect(list.locator('a[href="https://example.org/antiga/documento-oficial"]')).toHaveCount(1);
 expect(api.listReads()).toBeGreaterThanOrEqual(1);
 expect(api.writes()).toBe(0);
 await list.locator('#obs360ReviewListFilter').selectOption('confirmado');
 await expect(list.locator('.obs360-review-list-card')).toHaveCount(0);
 await list.locator('#obs360ReviewListFilter').selectOption('inconclusivo');
 await expect(list.locator('.obs360-review-list-card')).toHaveCount(1);
 await list.locator('[data-radar-review]').click();
 await expect(page.locator('#obs360ReviewMessage')).toContainText('Apuração já registrada');
 await expect(page.locator('#obs360ReviewFinding')).toHaveValue(oldReview.finding);
 expect(api.writes()).toBe(0);
 await page.locator('#obs360ReviewClose').click();
 await page.locator('#obs360EndSession').click();
 await expect(list.locator('.obs360-review-list-card')).toHaveCount(0);
 await expect(list.locator('#obs360ReviewListRefresh')).toBeDisabled();
 await expect(list.locator('#obs360ReviewListStatus')).toContainText('Área privada');
 await page.locator('.sidebar [data-nav="investimentos"]').click();
 await page.locator('.sidebar [data-nav="panorama"]').click();
 await expect(page.locator('.obs360-review-list-card')).toHaveCount(0);
 expect(api.writes()).toBe(0);
});
test('lista autenticada usa leitura privada, não grava e não injeta HTML recebido',async({page})=>{
 const review={
  articleUrl:'https://example.org/noticia-privada',
  evidenceUrl:'https://example.org/documento-privado',
  title:'Estudo de expansão <img src=x onerror=alert(1)>',
  finding:'Avaliação documental <script>window.compromised=true</script> sem confirmação de venda.',
  status:'confirmado',updatedAt:'2026-11-10T11:00:00Z'
 };
 const api=await scenario(page,{noNews:true,initialReview:review});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.obs360-review-list-card')).toHaveCount(1);
 await expect(page.locator('.obs360-review-list-card')).toContainText('<script>window.compromised=true</script>');
 await expect(page.locator('.obs360-review-list-card img')).toHaveCount(0);
 await expect(page.locator('.obs360-review-list-card script')).toHaveCount(0);
 expect(await page.evaluate(()=>window.compromised)).toBeUndefined();
 expect(api.writes()).toBe(0);
});
test('falha na listagem não mostra registros antigos nem confirmação falsa',async({page})=>{
 await scenario(page,{rejectList:true,noNews:true});
 await page.goto('/demo/observatorio.html');
 const list=page.locator('#obs360ReviewList');
 await expect(list.locator('#obs360ReviewListStatus')).toContainText('Consulta indisponível (HTTP 503)');
 await expect(list.locator('.obs360-review-list-card')).toHaveCount(0);
 await expect(list.locator('#obs360ReviewListRefresh')).toBeEnabled();
});
test('biblioteca permanece inacessível e não realiza GET privado sem sessão',async({page})=>{
 const api=await scenario(page,{session:false,noNews:true,initialReview:{
  articleUrl:'https://example.org/x',evidenceUrl:'https://example.org/y',title:'Documento confidencial',
  finding:'Uma constatação que não pode aparecer sem autenticação',status:'confirmado',updatedAt:'2026-11-01T00:00:00Z'
 }});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#obs360ReviewListStatus')).toContainText('Área privada');
 await expect(page.locator('.obs360-review-list-card')).toHaveCount(0);
 await expect(page.locator('#obs360ReviewListFilter')).toBeDisabled();
 await expect(page.locator('#obs360ReviewListRefresh')).toBeDisabled();
 expect(api.listReads()).toBe(0);
 expect(api.writes()).toBe(0);
});
