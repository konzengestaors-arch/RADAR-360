const { test, expect } = require('@playwright/test');
const route = '/demo/observatorio.html';
const key = 'radar_obs_demo_publica_20261106';

test('abre a demonstração sem registros de origem e com aviso', async ({ page }) => {
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.goto(route);
 await expect(page.locator('#pageName')).toHaveText('Panorama Regional');
 await expect(page.locator('#environmentNotice')).toContainText('HOMOLOGAÇÃO PRIVADA');
 await expect(page.locator('#environmentNotice')).toHaveClass(/sr-only/);
 const data = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
 expect(data.movimentos).toEqual([]);
 expect(data.indicadores).toEqual([]);
 expect(errors).toEqual([]);
});

test('navega entre quatro seções e preserva dados vazios após recarregar', async ({ page }) => {
 await page.goto(route);
 for (const [tab, name] of [['investimentos','Investimentos'], ['noticias','Notícias e movimentos'], ['indicadores','Indicadores'], ['panorama','Panorama Regional']]) {
   await page.locator('.nav [data-nav="'+tab+'"]').click();
   await expect(page.locator('#pageName')).toHaveText(name);
 }
 await page.reload();
 await expect(page.locator('#pageName')).toHaveText('Panorama Regional');
 const data = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
 expect(data.movimentos).toHaveLength(0);
 expect(data.indicadores).toHaveLength(0);
});

test('não consulta chaves operacionais antigas mesmo quando existem', async ({ page }) => {
 await page.addInitScript(() => {
   localStorage.setItem('radar_observatorio_unico_v17', JSON.stringify({movimentos:[{id:'MOV-PRIVATE',titulo:'NÃO IMPORTAR'}],indicadores:[]}));
   localStorage.setItem('radar360_obs_regional_v1', JSON.stringify({movimentos:[{id:'MOV-PRIVATE',titulo:'NÃO IMPORTAR'}],indicadores:[]}));
 });
 await page.goto(route);
 const result = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
 expect(result.movimentos).toEqual([]);
 await expect(page.locator('body')).not.toContainText('NÃO IMPORTAR');
});

test('registra indicador sintético e mantém após reload', async ({ page }) => {
 await page.goto(route);
 await page.locator('.nav [data-nav="indicadores"]').click();
 await page.locator('.editorial-tools summary').click();
 await page.locator('[data-create="indicador"]').click();
 await expect(page.locator('#editor')).toBeVisible();
 await page.locator('#m-titulo').fill('Indicador sintético');
 await page.locator('#m-valor').fill('42');
 await page.locator('#m-unidade').fill('unidades');
 await page.locator('#m-periodo').fill('2026-11');
 await page.locator('#m-fonte').fill('Fonte fictícia de teste');
 await page.locator('#m-url').fill('https://example.org/teste');
 await page.locator('#dialogSave').click();
 await expect(page.locator('#editor')).not.toBeVisible();
 await page.reload();
 await page.locator('.nav [data-nav="indicadores"]').click();
 await expect(page.locator('#body')).toContainText('Indicador sintético');
 const data = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
 expect(data.indicadores).toHaveLength(1);
});
