/* RADAR 360 — Fontes oficiais verificadas manualmente em 07/11/2026.
   Não são um feed, não atualizam automaticamente e não são projetos homologados. */
(function(root){
'use strict';
const reviewedAt='2026-11-07';
const references=Object.freeze([
 Object.freeze({
  id:'bndes-fibra-sc-20261106',titulo:'Financiamento de R$ 10 milhões para fibra óptica no Oeste de SC',
  fonte:'Agência BNDES de Notícias',data:'2026-11-06',territorio:'Oeste SC',
  etapa:'Financiamento aprovado',tipo:'Infraestrutura digital',
  url:'https://agenciadenoticias.bndes.gov.br/noticia/BNDES-aprova-R$-10-mi-para-rede-de-fibra-otica-no-Oeste-de-SC/'
 }),
 Object.freeze({
  id:'bndes-navios-sc-20261103',titulo:'BNDES aprova até R$ 2,18 bilhões para construir quatro navios em SC',
  fonte:'Agência BNDES de Notícias',data:'2026-11-03',territorio:'SC',
  etapa:'Financiamento aprovado',tipo:'Construção naval',
  url:'https://agenciadenoticias.bndes.gov.br/noticia/BNDES-aprova-R$-218-bi-para-construcao-de-quatro-navios-de-apoio-maritimo-em-SC/'
 }),
 Object.freeze({
  id:'invest-rs-china-20261103',titulo:'Invest RS apresenta projetos de energia limpa a investidores na China',
  fonte:'Governo do Rio Grande do Sul',data:'2026-11-03',territorio:'RS',
  etapa:'Prospecção de investidores',tipo:'Transição energética',
  url:'https://www.estado.rs.gov.br/invest-rs-apresenta-projetos-de-transicao-energetica-do-rio-grande-do-sul-em-evento-para-investidores-na-china'
 }),
 Object.freeze({
  id:'rs-deeptech-20261028',titulo:'RS institui programa de inovação com fundo previsto de R$ 100 milhões',
  fonte:'Secretaria de Desenvolvimento Econômico do RS',data:'2026-10-28',territorio:'RS',
  etapa:'Programa instituído; fundo em estruturação',tipo:'Inovação',
  url:'https://desenvolvimento.rs.gov.br/governo-do-estado-institui-programa-avancar-deep-tech-para-impulsionar-inovacao-e-desenvolvimento-economico'
 }) ,Object.freeze({
  id:'brde-mercopar-rs-20261021',
  titulo:'BRDE anuncia R$ 12,4 milhões em novos financiamentos para inovação na Serra e Vale do Taquari',
  fonte:'BRDE · Imprensa RS',data:'2026-10-21',territorio:'RS',
  etapa:'Operações de crédito anunciadas',tipo:'Inovação e crédito empresarial',
  url:'https://www.brde.com.br/noticia/brde-celebra-r-124-milhoes-em-novos-financiamentos-para-apoiar-a-inovacao-durante-a-mercopar/'
 }),
 Object.freeze({
  id:'brde-faex-sc-20261016',
  titulo:'BRDE prospecta cerca de R$ 250 milhões em projetos de energia na FAEX Energy',
  fonte:'BRDE · Imprensa SC',data:'2026-10-16',territorio:'Oeste SC',
  etapa:'Prospecção de projetos; não contratados',tipo:'Energia renovável e infraestrutura',
  url:'https://www.brde.com.br/noticia/brde-apresenta-oportunidades-de-financiamento-e-prospecta-r250-milhoes-em-projetos-para-o-setor-de-energia-na-faex-energy/'
 })
]);
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function classifyTitle(title){
 const t=normalize(title);
 // Apenas pistas no título, não confirmação de investimento ou execução.
 if(/\b(investiment\w*|ampli\w*|expans\w*|nova[s]? fabric\w*|novas? unidades?|inaugur\w*|implant\w*|moderniz\w*|construc\w*|obras?|licitac\w*|concess\w*|projetos? (de|para) (infraestrutura|energia|industria|logistica))\b/i.test(t))return 'Sinal em manchete';
 if(/\b(financiam\w*|aporte\w*|credito para|linha de credito)\b/i.test(t))return 'Financiamento mencionado';
 if(/\b(aprova|aprovou|libera|liberou)\b/i.test(t)&&/\br\$\s*\d+[\d.,]*\s*(mi|milh\w*|bi|bilh\w*)\b/i.test(t)&&/\b(para|em)\b/i.test(t))return 'Financiamento mencionado';
 return null;
}
const api=Object.freeze({reviewedAt,references,classifyTitle});
if(root)root.RadarInvestmentSources=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
