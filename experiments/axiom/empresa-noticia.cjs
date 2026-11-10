'use strict';
// Experimento isolado. Nunca confirma vínculo, investimento ou relação societária.
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const digits = s => String(s ?? '').replace(/\D/g, '');
const legal = new Set(['sa','s','a','ltda','eireli','holding','holdings','participacoes','grupo','companhia','cia']);
function validCNPJ(c){
 if(!/^\\d{14}$/.test(c)||/^(\\d)\\1{13}$/.test(c))return false;
 const digit=(len,w)=>{let sum=0;for(let i=0;i<len;i++)sum+=Number(c[i])*w[i];const d=sum%11;return d<2?0:11-d;};
 return digit(12,[5,4,3,2,9,8,7,6,5,4,3,2])===Number(c[12])&&digit(13,[6,5,4,3,2,9,8,7,6,5,4,3,2])===Number(c[13]);
}
function classify(article, companies) {
 const title = norm(article?.title ?? article?.titulo);
 if (!title || !Array.isArray(companies)) return {status:'nao_identificada',candidates:[],reason:'titulo_ou_catalogo_ausente'};
 const candidates = [];
 // Identidades inconsistentes nunca devem gerar sugestões, mesmo no experimento.
 const nameCounts=new Map(),cnpjCounts=new Map();
 for(const row of companies){
  const n=norm(row?.nome??row?.name),c=digits(row?.cnpj);
  if(n)nameCounts.set(n,(nameCounts.get(n)||0)+1);
  if(c)cnpjCounts.set(c,(cnpjCounts.get(c)||0)+1);
 }
 for (const company of companies) {
  const name = norm(company?.nome ?? company?.name);
  const cnpj = digits(company?.cnpj);
  if(nameCounts.get(name)>1 || (cnpj && (cnpjCounts.get(cnpj)>1 || !validCNPJ(cnpj))))continue;
  const terms = name.split(' ').filter(t => t.length > 2 && !legal.has(t));
  if (!terms.length) continue;
  const phrase = terms.join(' ');
  const distinctive = terms.length > 1 || terms[0].length >= 7;
  const titleMatch = distinctive && (' '+title+' ').includes(' '+phrase+' ');
  // Só aceita CNPJ completo como sequência isolada no título original.
  const rawTitle = String(article?.title ?? article?.titulo ?? '');
  const tokens = rawTitle.match(/(?:\d[.\/-]?\s*){14}/g) || [];
  const cnpjMatch = cnpj.length === 14 && tokens.some(t => digits(t) === cnpj);
  if (titleMatch || cnpjMatch) candidates.push({nome:company.nome ?? company.name,cnpj:cnpj||null,signal:cnpjMatch?'cnpj_no_titulo':'nome_no_titulo'});
 }
 if (!candidates.length) return {status:'nao_identificada',candidates:[],reason:'sem_correspondencia_forte'};
 if (candidates.length > 1) return {status:'ambigua',candidates,reason:'multiplas_empresas'};
 return {status:'candidata_revisao',candidates,reason:'mencao_no_titulo_nao_comprova_relacao'};
}
module.exports = {classify};
