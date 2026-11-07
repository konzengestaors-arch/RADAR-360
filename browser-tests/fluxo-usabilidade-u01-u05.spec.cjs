const {test,expect}=require('@playwright/test');

/*
 * Ensaios remotos de percurso U01–U05: verificam possibilidades técnicas,
 * sem simular observação de usuário, hesitações ou compreensão no Android físico.
 * Dados fictícios são criados exclusivamente no contexto isolado do Playwright.
 */
test('U01-U05: percurso sintético funcional em viewport Android',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 try {
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/demo/observatorio.html');
  const seeded=await page.evaluate(()=>{
   const api=window.__RADAR_TEST__, next=api.getState();
   const now='2026-11-07';
   const curr={titulo:'Indicador exclusivamente sintético U01',valor:'42',unidade:'unidades',territorio:'RS',periodo:'2026-11',fonte:'Fonte fictícia para teste',url:'https://example.org/indicador-u01'};
   next.indicadores.push({id:'IND-001',...curr,versao:1,atualizadoEm:now,historico:[{versao:1,registradoEm:now,motivo:'Registro sintético',depois:curr}]});
   next.movimentos.push({
    id:'MOV-001',titulo:'Projeto fictício Porto Alegre U04',municipios:'Porto Alegre',territorio:'RS',setor:'Tecnologia',
    estagio:'Informação insuficiente',tipo:'Investimento',valorOriginal:'Não informado',
    dataFato:now,dataPublicacao:now,prioridade:'Em análise',fato:'Cenário de teste sem base factual',
    interpretacao:'',incerteza:'',proximaVerificacaoData:'2026-11-20',
    proximaVerificacaoMotivo:'Revisar documentos sintéticos de teste',versao:1,
    fontes:[{id:'MOV-001-F01',titulo:'Fonte fictícia de ensaio',url:'https://example.org/movimento-u04',
      tipoDocumento:'Publicação complementar',referencia:'Referência fictícia',publicadoEm:now,consultadoEm:now,
      classificacao:'fornecida pelo usuário; conteúdo não verificado automaticamente'}],
    createdAt:now,updatedAt:now,
    historico:[{versao:1,registradoEm:now,motivo:'Novo movimento fictício',antes:null,
      depois:{estagio:'Informação insuficiente',valorOriginal:'Não informado',
      proximaVerificacaoData:'2026-11-20'},fonteId:'MOV-001-F01'}]
   });
   return api.commit(next);
  });
  expect(seeded).toBe(true);
  // U01 — KPI indicador e destino correto
  await page.locator('[data-stat-target="indicadores"]').click();
  await expect(page.locator('#lista-indicadores')).toBeVisible();
  await expect(page.locator('#lista-indicadores')).toContainText('Indicador exclusivamente sintético U01');
  // U02 — expandir, voltar e continuar
  await page.locator('.tabs-mobile [data-nav="panorama"]').click();
  const brief=page.locator('[data-panorama-section="prioridades"]');
  await brief.locator('summary').click();
  await expect(brief).toHaveAttribute('open','');
  await brief.locator('summary').click();
  await expect(brief).not.toHaveAttribute('open');
  await expect(page.locator('#marketSnapshot')).toBeVisible();
  // U03 — abrir agenda e localizar data do registro
  const agenda=page.locator('[data-panorama-section="agenda"]');
  await agenda.locator('summary').click();
  await expect(agenda).toContainText('2026-11-20');
  // U04 — filtro e dossiê
  const records=page.locator('[data-panorama-section="registros"]');
  await records.locator('summary').click();
  await page.locator('#f-search').fill('Projeto fictício Porto Alegre U04');
  await expect(records).toHaveAttribute('open','');
  await expect(page.locator('[data-movement="MOV-001"]')).toBeVisible();
  await page.locator('[data-movement="MOV-001"] [data-open="MOV-001"]').click();
  await expect(page.locator('#overlay')).toHaveClass(/open/);
  await expect(page.locator('#detailBody')).toContainText('Projeto fictício Porto Alegre U04');
  // U05 — localizar controles de backup sem executar importação
  await page.locator('#openTools').click();
  await expect(page.locator('#toolExport')).toBeVisible();
  await expect(page.locator('#toolImport')).toBeVisible();
  expect(errors).toEqual([]);
 });
 finally {await context.close()}
});
