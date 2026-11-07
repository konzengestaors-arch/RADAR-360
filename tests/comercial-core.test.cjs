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


test('oportunidade sintética mantém trilha e não altera estado original',()=>{
 const original=radar.initialState();
 const a=radar.addOpportunity(original,'DEMO-001','Projeto de teste','2026-11-06');
 assert.equal(original.oportunidades.length,0);
 assert.equal(a.oportunidades.length,1);
 assert.equal(a.oportunidades[0].historico.length,1);
 const b=radar.changeOpportunity(a,'OP-DEMO-001','Proposta','2026-11-07','Simulação documentada');
 assert.equal(a.oportunidades[0].status,'Identificada');
 assert.equal(b.oportunidades[0].status,'Proposta');
 assert.deepEqual(b.oportunidades[0].historico.map(h=>h.status),['Identificada','Proposta']);
 assert.equal(radar.validate(b),true);
});
test('bloqueia empresa inexistente e histórico inconsistente',()=>{
 assert.throws(()=>radar.addOpportunity(radar.initialState(),'DEMO-999','Teste','2026-11-06'));
 const state=radar.addOpportunity(radar.initialState(),'DEMO-001','Teste','2026-11-06');
 state.oportunidades[0].status='Concluída';
 assert.throws(()=>radar.validate(state),/Status sem histórico/);
});
test('backup legado sintético sem oportunidades continua aceito',()=>{
 const state=radar.initialState();delete state.oportunidades;
 assert.equal(radar.validate(state),true);
 const changed=radar.addOpportunity(state,'DEMO-001','Teste legado','2026-11-06');
 assert.equal(changed.oportunidades.length,1);
});


test('mudanças de oportunidade exigem motivo e data não retroativa',()=>{
 const start=radar.addOpportunity(radar.initialState(),'DEMO-001','Oportunidade exemplo','2026-11-06');
 assert.throws(()=>radar.changeOpportunity(start,'OP-DEMO-001','Proposta','2026-11-07',''),/Justificativa/);
 assert.throws(()=>radar.changeOpportunity(start,'OP-DEMO-001','Proposta','2026-11-05','Motivo fictício'),/Data da transição/);
 assert.equal(start.oportunidades[0].historico.length,1);
});
test('backup sintético com histórico contraditório é rejeitado',()=>{
 const start=radar.addOpportunity(radar.initialState(),'DEMO-001','Oportunidade exemplo','2026-11-06');
 const retro=structuredClone(start);
 retro.oportunidades[0].historico.push({status:'Proposta',data:'2026-11-05',motivo:'Teste'});
 retro.oportunidades[0].status='Proposta';
 assert.throws(()=>radar.validate(retro),/retroativa/);
 const noReason=structuredClone(start);
 noReason.oportunidades[0].historico.push({status:'Proposta',data:'2026-11-07',motivo:' '});
 noReason.oportunidades[0].status='Proposta';
 assert.throws(()=>radar.validate(noReason),/Justificativa/);
});
