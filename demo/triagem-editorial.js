/* Observatório 360 — triagem editorial por manchete. Não confirma fatos nem investimentos. */
(function(root){
'use strict';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const NEG=/\b(fgts|saque.aniversario|saque calamidade|auxilio emergencial|familias atingidas|suspender financiamentos|credito consignado|bolsa familia|previsao do tempo|resultado do futebol)\b/i;
const RISK=/\b(interdita\w*|paralisa\w*|interromp\w*|suspende opera\w*|acidente industrial|incendio|desabastec\w*|recuperacao judicial|falencia|embarg\w*|vazamento|quebra de safra)\b/i;
const BIZ=/\b(empresa\w*|industria\w*|industrial|fabrica\w*|operac\w*|porto\w*|terminal|usina\w*|cooperativa\w*|distribuidora\w*|fornecedor\w*|fabricante\w*|estaleiro\w*|complexo\w*|projeto\w*|rede de fibra|ferrovia\w*|rodovia\w*|aeroporto\w*|brde|bndes|concessao|licitacao|obra\w*|unidade\w*|planta\w*|centro de distribuicao|logistica)\b/i;
const ACT=/\b(anuncia\w*|anunciou|aprov\w*|invest\w*|amplia\w*|ampliacao|expan\w*|inaugur\w*|implant\w*|constroi|construc\w*|moderniz\w*|contrat\w*|contrato\w*|licit\w*|concess\w*|adquir\w*|compra\w*|instal\w*|financia\w*|financiamento\w*|conecta\w*|conexao|fornecimento|conquista\w*|lan\w* projeto|retoma\w*|abre nova|nova fabrica|preve\b|dobr\w*)\b/i;
const MACRO=/\b(dolar|cambio|inflacao|selic|taxa de juros|projec\w*|pib|economia do pais|mercado financeiro|ibovespa|bolsa de valores|crescimento economico|ranking das economias)\b/i;
function classify(article){
 const title=norm(article?.titulo||article?.title);
 if(!title||NEG.test(title))return {kind:'contexto',label:'Contexto geral',score:0};
 if(RISK.test(title)&&BIZ.test(title))return {kind:'risco',label:'Risco operacional a verificar',score:3};
 if(ACT.test(title)&&BIZ.test(title))return {kind:'empresarial',label:'Movimento empresarial a verificar',score:2};
 if(MACRO.test(title))return {kind:'contexto',label:'Contexto macroeconômico',score:0};
 return {kind:'contexto',label:'Contexto econômico regional',score:0};
}
function nextQuestion(article){
 const kind=classify(article).kind;
 if(kind==='risco')return 'Há exposição a riscos patrimoniais, interrupção de atividades ou responsabilidade civil a investigar?';
 if(kind==='empresarial')return 'O movimento envolve obras, novos ativos ou operações que demandem avaliação de seguros e garantias?';
 return '';
}
function prioritize(items,identities=[]){
 if(!Array.isArray(items))return [];
 const unique=new Set();
 return items.map((item,index)=>{
  const state=classify(item);
  const assoc=identities[index];
  const linked=assoc?.status==='candidata_revisao'&&Array.isArray(assoc.empresas)&&assoc.empresas.length===1;
  return {item,index,kind:state.kind,label:state.label,score:state.score+(linked?2:0),mention:linked?assoc.empresas[0]:'',action:nextQuestion(item)};
 }).filter(x=>x.item?.titulo&&x.item?.url&&!unique.has(x.item.url)&&unique.add(x.item.url))
 .sort((a,b)=>b.score-a.score||a.index-b.index);
}
const api=Object.freeze({classify,prioritize,nextQuestion});
if(root)root.RadarEditorial=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
