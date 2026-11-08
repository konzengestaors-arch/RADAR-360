'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const page=fs.readFileSync(require('node:path').join(__dirname,'../demo/observatorio.html'),'utf8');
test('nome oficial em cabeçalho, mobile e título dinâmico',()=>{
 assert.match(page,/<strong class="brand-title">OBSERVATÓRIO<\/strong><small class="brand-subtitle">360 · INTELIGÊNCIA<\/small>/);
 assert.match(page,/<span class="mobile-brand"><img src="observatorio-mark\.svg"[^>]*><span>OBSERVATÓRIO <b>360<\/b><\/span><\/span>/);
 assert.match(page,/document\.title='Observatório 360 \| '/);
 assert.match(page,/brand-observatorio\.css/);
 assert.doesNotMatch(page,/<strong>RADAR<\/strong>/);
});
test('contrato de dados, associação empresarial e scripts do briefing preservados',()=>{
 assert.match(page,/radar-observatorio-unico\/1\.7/);
 assert.match(page,/window\.__RADAR_SEED__/);
 assert.match(page,/empresas-publicas\.js/);
 assert.match(page,/briefing-decisao\.js/);
 assert.match(page,/briefing-interface\.js/);
});
