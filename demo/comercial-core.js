'use strict';
// RADAR Comercial — modelo sintético independente; sem dados de clientes.
const SCHEMA = 'radar-comercial-demo/1';
const STORAGE_KEY = 'radar_comercial_demo_publica_20261106';
const SAMPLE = Object.freeze([
  Object.freeze({id:'DEMO-001',nome:'Empresa Exemplo Alfa',segmento:'Indústria',regiao:'RS',etapa:'Qualificação',proximaAcao:'2026-11-12'}),
  Object.freeze({id:'DEMO-002',nome:'Empresa Exemplo Beta',segmento:'Logística',regiao:'SC',etapa:'Contato inicial',proximaAcao:'2026-11-16'}),
  Object.freeze({id:'DEMO-003',nome:'Empresa Exemplo Gama',segmento:'Serviços',regiao:'RS',etapa:'Diagnóstico',proximaAcao:'2026-11-20'})
]);
function initialState() {
 return {schema:SCHEMA,origem:'dados 100% sintéticos',empresas:SAMPLE.map(x=>({...x})),acoes:[],oportunidades:[]};
}
function validate(state) {
 if(!state||state.schema!==SCHEMA||!Array.isArray(state.empresas)||!Array.isArray(state.acoes)||!(state.oportunidades===undefined||Array.isArray(state.oportunidades)))throw Error('Backup de outra aplicação ou estrutura inválida');
 if(state.empresas.length>1000||state.acoes.length>5000||(state.oportunidades||[]).length>1000)throw Error('Limite de segurança excedido');
 const ids=new Set();
 for(const e of state.empresas){
  if(!e||typeof e.id!=='string'||!/^DEMO-[0-9]{3,}$/.test(e.id)||ids.has(e.id)||
    typeof e.nome!=='string'||!e.nome.trim()||e.nome.length>120||
    !['RS','SC'].includes(e.regiao)||typeof e.segmento!=='string'||
    typeof e.etapa!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(e.proximaAcao))throw Error('Empresa inválida ou duplicada');
  ids.add(e.id);
 }
 for(const a of state.acoes){
  if(!a||!ids.has(a.empresaId)||typeof a.descricao!=='string'||!a.descricao.trim()||
     a.descricao.length>400||typeof a.data!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(a.data))throw Error('Ação inválida');
 }
 const oppIds=new Set();
 for(const o of state.oportunidades||[]){
  if(!o||typeof o.id!=='string'||!/^OP-DEMO-[0-9]{3,}$/.test(o.id)||oppIds.has(o.id)||!ids.has(o.empresaId)||
    typeof o.titulo!=='string'||!o.titulo.trim()||o.titulo.length>120||
    !['Identificada','Qualificação','Proposta','Concluída','Descartada'].includes(o.status)||
    !Array.isArray(o.historico)||o.historico.length<1||o.historico.length>100)throw Error('Oportunidade inválida');
  oppIds.add(o.id);
  for(const h of o.historico){
   if(!h||!['Identificada','Qualificação','Proposta','Concluída','Descartada'].includes(h.status)||
      typeof h.data!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(h.data)||
      typeof h.motivo!=='string'||h.motivo.length>250)throw Error('Histórico inválido');
  }
  if(o.historico.at(-1).status!==o.status)throw Error('Status sem histórico consistente');
 }
 return true;
}
function clone(s){return JSON.parse(JSON.stringify(s))}
function addAction(state,empresaId,descricao,data){
 validate(state);
 const next=clone(state);
 next.acoes.push({empresaId,descricao,data});
 validate(next);
 return next;
}
function addOpportunity(state,empresaId,titulo,data){
 validate(state);const next=clone(state);next.oportunidades=next.oportunidades||[];
 const number=next.oportunidades.reduce((m,x)=>Math.max(m,Number(x.id.split('-').at(-1))||0),0)+1;
 next.oportunidades.push({id:'OP-DEMO-'+String(number).padStart(3,'0'),empresaId,titulo,status:'Identificada',historico:[{status:'Identificada',data,motivo:'Abertura sintética'}]});
 validate(next);return next;
}
function changeOpportunity(state,id,status,data,motivo){
 validate(state);const next=clone(state),opp=(next.oportunidades||[]).find(x=>x.id===id);
 if(!opp)throw Error('Oportunidade não localizada');
 if(opp.status===status)throw Error('Novo status deve ser diferente');
 opp.status=status;opp.historico.push({status,data,motivo});validate(next);return next;
}
function filterCompanies(state,{busca='',regiao=''}={}){
 validate(state);
 const q=String(busca).trim().toLocaleLowerCase('pt-BR');
 return state.empresas.filter(x=>(!regiao||x.regiao===regiao)&&(!q||(x.nome+' '+x.segmento).toLocaleLowerCase('pt-BR').includes(q)));
}
function summary(state){
 validate(state);
 return {empresas:state.empresas.length,acoes:state.acoes.length,oportunidades:(state.oportunidades||[]).length,regioes:[...new Set(state.empresas.map(x=>x.regiao))].length};
}
if(typeof module!=='undefined')module.exports={SCHEMA,STORAGE_KEY,initialState,validate,clone,addAction,addOpportunity,changeOpportunity,filterCompanies,summary};
