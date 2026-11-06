const test=require('node:test');
const assert=require('node:assert/strict');
const radar=require('../demo/comercial-core.js');

test('base sintética não contém dependência operacional e usa chave exclusiva',()=>{
 const x=radar.initialState();
 assert.equal(x.schema,'radar-comercial-demo/1');
 assert.ok(radar.STORAGE_KEY.startsWith('radar_comercial_demo_'));
 assert.ok(x.empresas.every(c=>c.id.startsWith('DEMO-')&&c.nome.includes('Exemplo')));
 assert.equal(x.acoes.length,0);
 assert.equal(radar.validate(x),true);
});
test('filtra empresas por região e busca sem mutar base',()=>{
 const x=radar.initialState(),b=JSON.stringify(x);
 assert.equal(radar.filterCompanies(x,{regiao:'RS'}).length,2);
 assert.equal(radar.filterCompanies(x,{busca:'beta'}).length,1);
 assert.equal(JSON.stringify(x),b);
});
test('cadência sintética não altera a versão anterior',()=>{
 const x=radar.initialState(),y=radar.addAction(x,'DEMO-001','Contato fictício','2026-11-20');
 assert.equal(x.acoes.length,0);
 assert.equal(y.acoes.length,1);
 assert.equal(radar.summary(y).acoes,1);
});
test('backup alheio e identificador desconhecido são rejeitados',()=>{
 assert.throws(()=>radar.validate({...radar.initialState(),schema:'radar-observatorio-unico/1.7'}));
 assert.throws(()=>radar.addAction(radar.initialState(),'REAL-001','contato','2026-11-20'));
});
test('impede duplicidade de empresas e ações inválidas',()=>{
 const x=radar.initialState();x.empresas.push({...x.empresas[0]});
 assert.throws(()=>radar.validate(x));
 assert.throws(()=>radar.addAction(radar.initialState(),'DEMO-001','','2026-11-20'));
});
