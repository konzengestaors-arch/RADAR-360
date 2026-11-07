const { test, expect } = require('@playwright/test');
const route = '/demo/observatorio.html';
const KEY = 'radar_obs_demo_publica_20261106';
const OLD = 'radar_observatorio_unico_v17';

test('base local corrompida não é sobrescrita na inicialização', async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, '{invalid-json'), KEY);
  await page.goto(route);
  await expect(page.locator('body')).toContainText('modo somente leitura ativado');
  const result = await page.evaluate(k => ({
    before: localStorage.getItem(k),
    accepted: window.__RADAR_TEST__.commit(window.__RADAR_TEST__.getState()),
    after: localStorage.getItem(k)
  }), KEY);
  expect(result.before).toBe('{invalid-json');
  expect(result.after).toBe(result.before);
  expect(result.accepted).toBe(false);
});

test('falha de gravação impede confirmação e preserva estado em memória', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k,v) {
      if (k === 'radar_obs_demo_publica_20261106') throw new DOMException('Quota excedida', 'QuotaExceededError');
      return original.call(this,k,v);
    };
  });
  await page.goto(route);
  const result = await page.evaluate(() => {
    const original = window.__RADAR_TEST__.getState();
    const next = structuredClone(original);
    next.indicadores.push({id:'IND-FAKE',titulo:'Registro não gravável',unidade:'unidades',periodo:'2026-11',fonte:'sintética'});
    const accepted = window.__RADAR_TEST__.commit(next);
    const after = window.__RADAR_TEST__.getState();
    return {accepted, old:original.indicadores, after:after.indicadores, persisted:localStorage.getItem('radar_obs_demo_publica_20261106')};
  });
  expect(result.accepted).toBe(false);
  expect(result.after).toEqual(result.old);
  expect(result.persisted).toBeNull();
  await expect(page.locator('body')).toContainText('Salvamento NÃO confirmado');
});

test('chave operacional histórica não é lida nem alterada na demonstração', async ({ page }) => {
  const legacy = JSON.stringify({movimentos:[{titulo:'DADO HISTÓRICO PARTICULAR'}],indicadores:[]});
  await page.addInitScript(({k,v}) => localStorage.setItem(k,v), {k:OLD,v:legacy});
  await page.goto(route);
  const found = await page.evaluate(({old,key}) => ({
    old:localStorage.getItem(old),
    demo:JSON.parse(localStorage.getItem(key))
  }), {old:OLD,key:KEY});
  expect(found.old).toBe(legacy);
  expect(found.demo.movimentos).toEqual([]);
  await expect(page.locator('body')).not.toContainText('DADO HISTÓRICO PARTICULAR');
});

test('restauração cancelada não modifica o armazenamento', async ({ page }) => {
  await page.goto(route);
  const before = await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.locator('#openTools').click();
  page.once('dialog', d=>d.dismiss());
  await page.locator('#fileInput').setInputFiles({
    name:'backup-demo.json',mimeType:'application/json',
    buffer:Buffer.from(before)
  });
  await expect.poll(async()=>page.evaluate(()=>document.querySelector('#fileInput').value)).toBe('');
  expect(await page.evaluate(k=>localStorage.getItem(k),KEY)).toBe(before);
});


test('esquema comercial na chave da demo não é lido ou sobrescrito', async ({ page }) => {
  const foreign = JSON.stringify({schema:'radar-comercial/1.5',movimentos:[],indicadores:[]});
  await page.addInitScript(({key,data}) => localStorage.setItem(key,data), {key:KEY,data:foreign});
  await page.goto(route);
  await expect(page.locator('body')).toContainText('modo somente leitura ativado');
  const v = await page.evaluate(key => ({
    local:localStorage.getItem(key),
    accepted:window.__RADAR_TEST__.commit(window.__RADAR_TEST__.getState())
  }),KEY);
  expect(v.local).toBe(foreign);
  expect(v.accepted).toBe(false);
});

test('base inválida pode ser restaurada por backup válido sem alterar outra chave', async ({ page }) => {
  const foreign = '{"schema":"radar-comercial/1.5","movimentos":[],"indicadores":[]}';
  const historical = '{"dado":"histórico que deve permanecer"}';
  // Preparação determinística: gravar uma vez na origem e reabrir.
  // addInitScript reinjetaria a chave inválida caso houvesse novo documento.
  await page.goto(route);
  await page.evaluate(({key,old,data,historical}) => {
    localStorage.setItem(key,data);
    localStorage.setItem(old,historical);
  }, {key:KEY,old:OLD,data:foreign,historical});
  await page.reload();
  await expect(page.locator('body')).toContainText('modo somente leitura ativado');
  const valid = await page.evaluate(() => window.__RADAR_TEST__.getState());
  await page.locator('#openTools').click();
  const confirmation=page.waitForEvent('dialog');
  await page.locator('#fileInput').setInputFiles({
    name:'recuperacao-sintetica.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(valid))
  });
  const dialog=await confirmation;
  expect(dialog.message()).toContain('Importar');
  await dialog.accept();
  await expect.poll(async () => page.evaluate(key => {
    try { return JSON.parse(localStorage.getItem(key)).schema } catch {return null;}
  },KEY),{timeout:10000}).toBe('radar-observatorio-unico/1.7');
  await expect(page.locator('body')).toContainText('Backup do Observatório restaurado com sucesso.');
  expect(await page.evaluate(old=>localStorage.getItem(old),OLD)).toBe(historical);
});
