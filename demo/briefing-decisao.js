/* RADAR 360 | Motor conservador de briefing, sem inferir verificação factual */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RadarDecisionBriefing=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const RULES=Object.freeze([
 {pattern:/\b(expans[aã]o|amplia(?:ç[aã]o|r|rá)|nova unidade|nova f[aá]brica|inaugura(?:ç[aã]o|r))\b/i,reason:'Possível expansão operacional',next:'Verificar anúncio oficial, localização, cronograma e aprovação do investimento.'},
 {pattern:/\b(financiamento|cr[eé]dito|empr[eé]stimo|bndes|brde)\b/i,reason:'Movimento de financiamento',next:'Distinguir prospecção, aprovação, contratação e desembolso.'},
 {pattern:/\b(obra|rodovia|ferrovia|porto|energia|concess[aã]o|licita(?:ç[aã]o|r))\b/i,reason:'Sinal de infraestrutura',next:'Conferir órgão responsável, processo e estágio documentado.'}
 ]);
 function safeHttps(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password}catch(_){return false}}
 function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===s}
 function toBriefing(news,options={}){
  if(!news||typeof news!=='object')return null;
  const titulo=String(news.titulo||'').trim(),url=String(news.url||'').trim();
  if(!titulo||!safeHttps(url))return null;
  const matches=RULES.filter(r=>r.pattern.test(titulo));
  const verified=Array.isArray(options.empresasVerificadas)?options.empresasVerificadas.filter(c=>c&&c.verificado===true&&/^\d{14}$/.test(String(c.cnpj||'').replace(/\D/g,''))&&String(c.nome||'').trim()).map(c=>({cnpj:String(c.cnpj).replace(/\D/g,''),nome:String(c.nome)})):[];
  const data=String(news.publicadoEm||'').trim();
  return Object.freeze({
   titulo,url,fonte:String(news.fonte||'Fonte não informada'),publicadoEm:validDate(data)?data:null,
   sinal:matches.length?matches.map(r=>r.reason).join(' / '):'Sinal não classificado',
   estagio:'Triagem inicial — não verificado',
   confianca:'Não avaliada — requer conferência da fonte primária',
   empresas:verified,
   lacunas:['Conferir conteúdo integral e autoria da notícia','Confirmar data, localização e estágio documentado',...(verified.length?[]:['Nenhum vínculo empresarial confirmado'])],
   acao:matches.length?matches.map(r=>r.next).join(' '):'Ler a matéria original e contextualizar antes de atribuir prioridade.',
   decisao:'Investigar — nenhuma ação comercial automática',
   inferenciaAutomatica:true
  });
 }
 return Object.freeze({toBriefing});
});
