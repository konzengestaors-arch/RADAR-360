'use strict';
// Experimento isolado. Nunca confirma vínculo, investimento ou relação societária.
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const digits = s => String(s ?? '').replace(/\D/g, '');
const legal = new Set(['sa','s','a','ltda','eireli','holding','holdings','participacoes','grupo','companhia','cia']);
function classify(article, companies) {
 const title = norm(article?.title ?? article?.titulo);
 if (!title || !Array.isArray(companies)) return {status:'nao_identificada',candidates:[],reason:'titulo_ou_catalogo_ausente'};
 const candidates = [];
 for (const company of companies) {
  const name = norm(company?.nome ?? company?.name);
  const terms = name.split(' ').filter(t => t.length > 2 && !legal.has(t));
  if (!terms.length) continue;
  const phrase = terms.join(' ');
  const distinctive = terms.length > 1 || terms[0].length >= 7;
  const titleMatch = distinctive && (' '+title+' ').includes(' '+phrase+' ');
  const cnpj = digits(company?.cnpj);
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
