const {test,expect}=require('@playwright/test');
function makeCnpj(n){
 const root=String(n+1).padStart(12,'0');
 const digit=(s,w)=>{const m=w.reduce((v,x,i)=>v+x*Number(s[i]),0)%11;return String(m<2?0:11-m)};
 const a=digit(root,[5,4,3,2,9,8,7,6,5,4,3,2]);
 return root+a+digit(root+a,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
}
const rows=Array.from({length:217},(_,i)=>({nome:'Empresa Fictícia Número '+String(i+1).padStart(3,'0'),cnpj:i<96?makeCnpj(i):'',conflito:i<8}));
const FEED={schema:'radar-observatorio-feed/1',items:[{titulo:'Empresa Fictícia Número 011 anuncia fábrica',url:'https://example.org/news/011',fonte:'Fonte de teste',publicadoEm:'2026-11-16'}],totais:{fontes:1,funcionando:1,comFalha:0,candidatos:1}};
async function mock(page,body={schema:'observatorio-empresas/1',total:217,items:rows},code=200){
 let active=true;
 await page.route('**/api/sessao',r=>{
  const method=r.request().method();
  if(method==='DELETE')active=false;
  if(method==='POST')active=true;
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authenticated:active,configured:true})});
 });
 await page.route('**/api/empresas',r=>r.fulfill({status:code,contentType:'application/json',body:JSON.stringify(body)}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
}
test('217 empresas autenticadas são exibidas sem localStorage',async({page})=>{
 await mock(page);await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await expect(page.locator('#radarCompanyMessage')).toContainText('217 empresas reais');
 await expect(page.locator('.radar-directory-list li')).toHaveCount(24);
 await page.locator('#radarCompanySearch').fill('Número 011');
 await expect(page.locator('.radar-directory-list li')).toHaveCount(1);
 expect(await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'))).toBeNull();
});
test('lista local permanece salva, mas a sessão exibe o catálogo privado',async({page})=>{
 await mock(page);await page.addInitScript(()=>localStorage.setItem('radar_empresas_publicas_nome_cnpj_v1',JSON.stringify([{nome:'Empresa Local Antiga',cnpj:''}])));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 expect(await page.evaluate(()=>localStorage.getItem('radar_empresas_publicas_nome_cnpj_v1'))).toContain('Empresa Local Antiga');
});
test('401 ou 503 nunca expõem dados locais ou fictícios no catálogo privado',async({page})=>{
 await mock(page,{erro:'Não autorizado'},401);
 await page.addInitScript(()=>localStorage.setItem('radar_empresas_publicas_nome_cnpj_v1',JSON.stringify([{nome:'Empresa Local Antiga',cnpj:''}])));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('0');
 await expect(page.locator('#radarCompanyMessage')).toContainText('Acesso não autorizado');
 expect(await page.evaluate(()=>window.RadarCompanies.read())).toEqual([]);
});
test('catálogo de 222 empresas é rejeitado e notícias públicas continuam',async({page})=>{
 await mock(page,{schema:'observatorio-empresas/1',total:222,items:rows.concat(rows.slice(0,5))});
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('0');
 await expect(page.locator('.news-live-card')).toHaveCount(1);
});
test('registros com conflito são excluídos do vínculo automático com notícia',async({page})=>{
 await mock(page);await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 const result=await page.evaluate(()=>window.RadarCompanies.classifyNews([{titulo:'Empresa Fictícia Número 003 anuncia fábrica'},{titulo:'Empresa Fictícia Número 011 anuncia fábrica'}]));
 expect(result[0].empresas).toHaveLength(0);expect(result[1].empresas).toHaveLength(1);
});

test('dossiê de empresa sem conflito abre e mostra apenas fatos disponíveis',async({page})=>{
 await mock(page);await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('#radarCompanySearch').fill('Número 011');
 await page.locator('[data-obs-company-index="10"]').click();
 const dialog=page.locator('#radarCompanyDossier');
 await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('Empresa Fictícia Número 011');
 await expect(dialog).toContainText('Dígitos do CNPJ consistentes');
 await expect(dialog).toContainText('cadastro oficial não verificado');
 await expect(dialog.locator('#radarCloseDossier')).toBeVisible();
 await dialog.locator('#radarCloseDossier').click();
 await expect(dialog).not.toBeVisible();
});
test('dossiê com conflito sinaliza conferência e não atribui notícias automaticamente',async({page})=>{
 await mock(page);await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('#radarCompanySearch').fill('Número 003');
 await page.locator('[data-obs-company-index="2"]').click();
 const dialog=page.locator('#radarCompanyDossier');
 await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('Identidade em conferência');
 await expect(dialog).toContainText('Nenhuma menção textual elegível');
 await expect(dialog).not.toContainText('Empresa Fictícia Número 011 anuncia fábrica');
});
test('QA privado não oferece importação de planilha inoperante',async({page})=>{
 await mock(page);await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await expect(page.locator('#radarCompanyFile')).toHaveCount(0);
 await expect(page.locator('.radar-company-import')).toHaveCount(0);
});


test('sessão privada abre, encerra e revoga o catálogo no navegador móvel',async({page})=>{
 await mock(page);await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await expect(page.locator('#obs360EndSession')).toBeVisible();
 await page.locator('#obs360EndSession').click();
 await expect(page.locator('.radar-company-count')).toHaveText('0');
 await expect(page.locator('#obs360BeginSession')).toBeVisible();
 await expect(page.locator('#radarCompanyMessage')).toContainText('Sessão do Observatório revogada');
 await page.reload();
 await expect(page.locator('.radar-company-count')).toHaveText('0');
 await page.locator('#obs360BeginSession').click();
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await expect(page.locator('#obs360EndSession')).toBeVisible();
});
test('aplicação não consulta catálogo enquanto sessão não for confirmada',async({page})=>{
 let called=0;
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authenticated:false})}));
 await page.route('**/api/empresas',r=>{called++;return r.fulfill({status:401,contentType:'application/json',body:'{}'});});
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#obs360BeginSession')).toBeVisible();
 await expect(page.locator('.radar-company-count')).toHaveText('0');
 expect(called).toBe(0);
});

test('catálogo real de 217 não é contabilizado como apuração manual zerada',async({page})=>{
 await mock(page);
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await expect(page.locator('#radarTopCompanies')).toHaveText('217');
 await expect(page.locator('#radarTopSignals')).toHaveText('1');
 await expect(page.locator('.radar-manual-records')).toBeVisible();
 await expect(page.locator('.radar-manual-records')).toContainText('ainda sem registros nesta prévia');
 await expect(page.locator('.radar-manual-records .stats')).toHaveCount(0);
 await page.locator('.radar-manual-records > summary').click();
 await expect(page.locator('[data-observatorio-local-state="empty"]')).toBeVisible();
 await expect(page.locator('[data-observatorio-local-state="empty"]')).toContainText('Não são a contagem de empresas');
 await expect(page.locator('.quick-updates')).toContainText('Nenhuma publicação enviada à revisão manual');
});
test('falha da API de empresas não informa catálogo vazio por engano',async({page})=>{
 await mock(page,{erro:'Acesso não autorizado'},401);
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#radarCompanyMessage')).toContainText('Acesso não autorizado');
 await expect(page.locator('#radarTopCompanies')).toHaveText('🔒');
 await expect(page.locator('.radar-manual-records')).toBeVisible();
});

test('radar de sete dias abre dossiê somente para menção exata sem conflito em sessão privada',async({page})=>{
 await mock(page);
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const ago=new Date(Date.parse(today+'T12:00:00Z')-3*86400000).toISOString().slice(0,10);
 const older=[
  {titulo:'Empresa Fictícia Número 011 anuncia expansão de fábrica',url:'https://example.org/fabrica/011',fonte:'Fonte editorial de teste',publicadoEm:ago},
  {titulo:'Empresa Fictícia Número 003 anuncia expansão de fábrica',url:'https://example.org/fabrica/003',fonte:'Fonte editorial de teste',publicadoEm:ago},
  {titulo:'Dólar fecha em alta no mercado financeiro',url:'https://example.org/cambio',fonte:'Economia fictícia',publicadoEm:ago}
 ];
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  items:[],radar7d:older,totais:{fontes:8,funcionando:8,publicacoesLidas:130,candidatos:0,radar7d:3}
 })}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 const panel=page.locator('.radar-seven-day');
 await expect(panel.locator('.radar-seven-day-card')).toHaveCount(2);
 await expect(panel).toContainText('Publicado em '+ago);
 await expect(panel).not.toContainText('Dólar fecha');
 await expect(panel.locator('[data-radar-dossier]')).toHaveCount(1);
 await expect(panel).toContainText('Pergunta de seguros:');
 await panel.locator('[data-radar-dossier]').click();
 const dialog=page.locator('#radarCompanyDossier');
 await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('Empresa Fictícia Número 011');
 await expect(dialog).toContainText('expansão de fábrica');
 await expect(dialog.locator('a[href="https://example.org/fabrica/011"]')).toHaveCount(1);
});
test('radar de sete dias não abre dossiês quando o catálogo privado está bloqueado',async({page})=>{
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'}));
 await page.route('**/api/empresas',r=>{throw Error('API privada não deveria ser consultada')});
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const older=new Date(Date.parse(today+'T12:00:00Z')-2*86400000).toISOString().slice(0,10);
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  items:[],radar7d:[{titulo:'Empresa Fictícia Número 011 anuncia nova fábrica',url:'https://example.org/empresa',fonte:'Fonte de teste',publicadoEm:older}],
  totais:{fontes:8,funcionando:8,candidatos:0,radar7d:1}
 })}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#obs360BeginSession')).toBeVisible();
 await expect(page.locator('.radar-seven-day-card')).toHaveCount(1);
 await expect(page.locator('[data-radar-dossier]')).toHaveCount(0);
 await expect(page.locator('#radarCompanyDossier')).toHaveCount(0);
});


test('diagnóstico no Android comprova respostas reais mockadas sem exibir nomes, CNPJ ou segredos',async({page})=>{
 await mock(page);
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 await page.route('**/api/apuracoes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  schema:'radar-observatorio-feed/1',dataReferencia:today,consultadoEm:new Date().toISOString(),
  items:[{titulo:'Indústria anuncia expansão',url:'https://example.org/hoje',publicadoEm:today,fonte:'Fonte QA'}],
  radar7d:[{titulo:'Indústria anuncia expansão',url:'https://example.org/hoje',publicadoEm:today,fonte:'Fonte QA'}],
  totais:{fontes:8,funcionando:8,candidatos:1,radar7d:1}
 })}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('#obs360RunDiagnostic').click();
 const diagnostic=page.locator('#obs360DiagnosticResult');
 await expect(diagnostic).toContainText('CONEXÕES BÁSICAS APROVADAS');
 await expect(diagnostic).toContainText('217 empresas');
 await expect(diagnostic).toContainText('8 em conferência');
 await expect(diagnostic).toContainText('1 de hoje');
 await expect(diagnostic).toContainText('1 na janela de 7 dias');
 await expect(diagnostic).toContainText('0 registro(s) recentes');
 await expect(diagnostic).not.toContainText('Empresa Fictícia');
 await expect(diagnostic).not.toContainText(makeCnpj(0));
 await page.locator('#obs360EndSession').click();
 await expect(page.locator('#obs360DiagnosticResult')).toContainText('Sessão encerrada');
});
test('diagnóstico bloqueado não consulta catálogo nem apurações privadas',async({page})=>{
 let privateCalls=0;
 await page.route('**/api/sessao',r=>r.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'}));
 await page.route('**/api/empresas',r=>{privateCalls++;return r.fulfill({status:401,contentType:'application/json',body:'{"erro":"Sessão necessária"}'});});
 await page.route('**/api/apuracoes',r=>{privateCalls++;return r.fulfill({status:401,contentType:'application/json',body:'{"erro":"Sessão necessária"}'});});
 await page.route('**/api/noticias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FEED)}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('#obs360BeginSession')).toBeVisible();
 await page.locator('#obs360RunDiagnostic').click();
 await expect(page.locator('#obs360DiagnosticResult')).toContainText('Sessão privada: bloqueada');
 expect(privateCalls).toBe(0);
});
test('diagnóstico não simula sucesso diante de falha na API persistente',async({page})=>{
 await mock(page);
 await page.route('**/api/apuracoes',r=>r.fulfill({status:503,contentType:'application/json',body:'{"erro":"Indisponível"}'}));
 await page.goto('/demo/observatorio.html');
 await expect(page.locator('.radar-company-count')).toHaveText('217');
 await page.locator('#obs360RunDiagnostic').click();
 await expect(page.locator('#obs360DiagnosticResult')).toContainText('RESULTADO: PARCIAL');
 await expect(page.locator('#obs360DiagnosticResult')).toContainText('Apurações persistentes: indisponível (HTTP 503)');
});
