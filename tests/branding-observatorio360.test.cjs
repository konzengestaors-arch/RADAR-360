'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const page=fs.readFileSync(require('node:path').join(__dirname,'../demo/observatorio.html'),'utf8');
test('nome oficial em cabeçalho, mobile e título dinâmico',()=>{
 assert.match(page,/<strong>OBSERVATÓRIO<\/strong><small>360 · INTELIGÊNCIA<\/small>/);
 assert.match(page,/◉ OBSERVATÓRIO 360/);
 assert.match(page,/document\.title='Observatório 360 \| '/);
 assert.doesNotMatch(page,/<strong>RADAR<\/strong>/);
});
test('contrato de dados, associação empresarial e scripts do briefing preservados',()=>{
 assert.match(page,/radar-observatorio-unico\/1\.7/);
 assert.match(page,/window\.__RADAR_SEED__/);
 assert.match(page,/empresas-publicas\.js/);
 assert.match(page,/briefing-decisao\.js/);
 assert.match(page,/briefing-interface\.js/);
});
