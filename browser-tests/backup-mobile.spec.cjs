const { test, expect } = require('@playwright/test');
const route = '/demo/observatorio.html';
const key = 'radar_obs_demo_publica_20261106';

test('exportação e restauração preservam indicador sintético sem misturar bases', async ({ page }) => {
  await page.goto(route);
  const synthetic = await page.evaluate(() => {
    const state = window.__RADAR_TEST__.getState();
    state.indicadores.push({
      id: 'IND-TEST-001', titulo: 'Indicador exclusivamente sintético',
      unidade: 'unidades', periodo: '2026-11', fonte: 'Fonte de teste',
      url: 'https://example.org/teste', valorOriginal: '42'
    });
    if (!window.__RADAR_TEST__.commit(state)) throw Error('Falha ao persistir fixture');
    return window.__RADAR_TEST__.getState();
  });
  await page.locator('#openTools').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#toolExport').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^RADAR_OBSERVATORIO_BACKUP_\d{4}-\d{2}-\d{2}\.json$/);
  const json = require('node:fs').readFileSync(await download.path(), 'utf8');
  const backup = JSON.parse(json);
  expect(backup.indicadores).toHaveLength(1);
  expect(backup.indicadores[0].titulo).toBe('Indicador exclusivamente sintético');

  await page.evaluate(k => localStorage.removeItem(k), key);
  await page.reload();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).indicadores.length, key)).toBe(0);
  await page.locator('#openTools').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fileInput').setInputFiles({
    name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(json)
  });
  await expect.poll(async () => page.evaluate(k => JSON.parse(localStorage.getItem(k)).indicadores.length, key)).toBe(1);
  const recovered = await page.evaluate(() => window.__RADAR_TEST__.getState());
  expect(recovered.indicadores).toEqual(synthetic.indicadores);
  expect(await page.evaluate(() => localStorage.getItem('radar_observatorio_unico_v17'))).toBeNull();
});

test('backup de outra aplicação é rejeitado sem substituir a base atual', async ({ page }) => {
  await page.goto(route);
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  await page.locator('#openTools').click();
  await page.locator('#fileInput').setInputFiles({
    name: 'comercial.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schema:'radar-observatorio-unico/1.7', movimentos:[], indicadores:[], companies:[{id:'private'}] }))
  });
  await expect(page.locator('body')).toContainText('Arquivo de outra aplicação');
  const after = await page.evaluate(k => localStorage.getItem(k), key);
  expect(after).toBe(before);
});

for (const width of [320, 390, 430, 768, 1440]) {
  test('viewport ' + width + ' mantém navegação e cabeçalho acessíveis', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: width <= 430, hasTouch: width <= 430 });
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.locator('#pageName')).toBeVisible();
    await expect(page.locator('#openTools')).toBeVisible();
    const mobile = width <= 430;
    const nav = mobile ? page.locator('.nav [data-nav="indicadores"]') : page.locator('.sidebar [data-nav="indicadores"]');
    await expect(nav).toBeVisible();
    await nav.click();
    await expect(page.locator('#pageName')).toHaveText('Indicadores');
    await context.close();
  });
}


test('rejeita JSON sem esquema e conserva indicador existente', async ({ page }) => {
  await page.goto(route);
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  await page.locator('#openTools').click();
  await page.locator('#fileInput').setInputFiles({
    name:'arquivo-sem-esquema.json', mimeType:'application/json',
    buffer: Buffer.from(JSON.stringify({movimentos:[], indicadores:[], notas:'Sem origem comprovada'}))
  });
  await expect(page.locator('body')).toContainText('Esquema não reconhecido');
  const after = await page.evaluate(k => localStorage.getItem(k), key);
  expect(after).toBe(before);
});

test('rejeita esquema comercial e mantém os dados locais intactos', async ({ page }) => {
  await page.goto(route);
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  await page.locator('#openTools').click();
  await page.locator('#fileInput').setInputFiles({
    name:'backup-comercial.json', mimeType:'application/json',
    buffer: Buffer.from(JSON.stringify({schema:'radar-comercial/1.5',movimentos:[],indicadores:[]}))
  });
  await expect(page.locator('body')).toContainText('Esquema não reconhecido');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
});

test('rejeita backup JSON sintaticamente inválido sem alterar a base', async ({ page }) => {
  await page.goto(route);
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  await page.locator('#openTools').click();
  await page.locator('#fileInput').setInputFiles({
    name:'corrompido.json', mimeType:'application/json', buffer: Buffer.from('{"schema":')
  });
  await expect(page.locator('body')).toContainText('Importação cancelada');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
});


test('O02 emulação móvel: indicador persiste após reabrir sem modificar a base Comercial', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    const fixture = await page.evaluate(() => {
      const commercialKey = 'radar_comercial_demo_publica_20261106';
      localStorage.setItem(commercialKey, '{"sentinela":"COMERCIAL NAO ALTERAR"}');
      const next = window.__RADAR_TEST__.getState();
      next.indicadores.push({
        id: 'IND-ANDROID-O02-001',
        titulo: 'Indicador sintético de persistência Android',
        unidade: 'unidades', periodo: '2026-11', fonte: 'Laboratório sintético',
        url: 'https://example.org/ensaio', valorOriginal: '42'
      });
      if (!window.__RADAR_TEST__.commit(next)) throw Error('Falha ao gravar indicador sintético');
      return {
        obs: localStorage.getItem('radar_obs_demo_publica_20261106'),
        comercial: localStorage.getItem(commercialKey)
      };
    });
    expect(fixture.obs).toContain('IND-ANDROID-O02-001');
    await page.reload();
    const after = await page.evaluate(() => ({
      obs: localStorage.getItem('radar_obs_demo_publica_20261106'),
      commercial: localStorage.getItem('radar_comercial_demo_publica_20261106'),
      indicator: window.__RADAR_TEST__.getState().indicadores
        .find(item => item.id === 'IND-ANDROID-O02-001')
    }));
    expect(after.obs).toBe(fixture.obs);
    expect(after.commercial).toBe(fixture.comercial);
    expect(after.indicator.titulo).toBe('Indicador sintético de persistência Android');
  } finally {
    await context.close();
  }
});
