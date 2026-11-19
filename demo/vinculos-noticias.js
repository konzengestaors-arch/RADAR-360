/* Observatório 360 | prova de associação editorial | somente memória da sessão.
 * Nenhuma inferência comercial, persistência, requisição adicional ou score.
 */
(function(root){
'use strict';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=value=>String(value||'').replace(/\D/g,'');
const today=(now=new Date())=>new Date(now).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const goodURL=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
function fresh(feed,now=new Date()){
 if(!feed||feed.error||!Array.isArray(feed.items)||feed.dataReferencia!==today(now)||Number(feed.totais?.funcionando)<=0)return false;
 const stamp=Date.parse(feed.consultadoEm||''),t=new Date(now).getTime();
 return Number.isFinite(stamp)&&stamp<=t+120000&&t-stamp<=20*60000;
}
function publishedToday(article,now=new Date()){
 if(!article||article.publicadoEm!==today(now)||!goodURL(article.url)||!String(article.titulo||'').trim())return false;
 if(article.publicadoEmISO){
  const ts=Date.parse(article.publicadoEmISO);
  if(!Number.isFinite(ts)||today(ts)!==article.publicadoEm)return false;
 }
 return true;
}
function headlineCNPJs(title){
 const hits=String(title||'').match(/(?:^|[^\d])(?:\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})(?!\d)/g)||[];
 return new Set(hits.map(digits).filter(x=>x.length===14));
}
function exactName(title,name){
 const n=norm(name),t=norm(title);
 // Short generic names and fragments cannot substantiate an identity.
 if(n.length<10||n.split(' ').length<2)return false;
 return (' '+t+' ').includes(' '+n+' ');
}
function evaluate(article,companies,feed,now=new Date()){
 if(!fresh(feed,now)||!publishedToday(article,now)||!Array.isArray(companies)||!companies.length)return [];
 const headline=String(article.titulo||''),ids=headlineCNPJs(headline),nameCounts=new Map(),idCounts=new Map();
 for(const c of companies){
  const name=norm(c?.nome),id=digits(c?.cnpj);
  if(name)nameCounts.set(name,(nameCounts.get(name)||0)+1);
  if(id.length===14)idCounts.set(id,(idCounts.get(id)||0)+1);
 }
 const found=[];
 for(const company of companies){
  const name=String(company?.nome||''),normalized=norm(name),id=digits(company?.cnpj);
  const withId=id.length===14&&ids.has(id),withName=exactName(headline,name);
  if(!withId&&!withName)continue;
  const conflict=company.conflito===true||(nameCounts.get(normalized)||0)>1||
    (id.length===14&&(idCounts.get(id)||0)>1);
  const status=conflict?'ambigua':withId?'identificador_confirmado':'nome_nao_verificado';
  const reason=conflict?'Identidade em conferência, homônimo ou identificador duplicado; não há vínculo confirmado.':
   withId?'CNPJ do catálogo coincide literalmente com identificador publicado na manchete; isso identifica a entidade, não comprova o fato noticiado.':
   'Nome completo encontrado literalmente na manchete. Sem identificador oficial na publicação, a identidade continua não verificada.';
  found.push({company:name,status,reason,headline,source:String(article.veiculo||article.fonte||'Fonte não informada'),
   published:article.publicadoEm,publishedISO:article.publicadoEmISO||'',consulted:feed.consultadoEm,url:article.url,
   evidence:withId?'CNPJ coincidente na manchete':'Menção nominal literal na manchete'});
 }
 return found;
}
const label={identificador_confirmado:'Confirmado por identificador publicado',nome_nao_verificado:'Correspondência nominal não verificada',ambigua:'Relação ambígua · revisão humana'};
function stamp(date){
 const d=new Date(date);
 return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}):'Horário não informado';
}
function articleCard(hit){
 return '<article class="obs-news-evidence-card" style="border:1px solid #d4e2df;border-radius:12px;padding:13px;margin:10px 0;background:#f8fcfa">'+
 '<strong class="obs-news-evidence-status">'+esc(label[hit.status])+'</strong>'+
 '<p style="margin:7px 0 4px"><a href="'+esc(hit.url)+'" target="_blank" rel="noopener noreferrer">'+esc(hit.headline)+'</a></p>'+
 '<small>Veículo/fonte: '+esc(hit.source)+' · Publicado: '+esc(hit.publishedISO?stamp(hit.publishedISO):hit.published+' (hora não informada no feed)')+
 ' · Consultado: '+esc(stamp(hit.consulted))+'</small>'+
 '<p style="margin:8px 0 4px"><b>Empresa:</b> '+esc(hit.company)+'</p>'+
 '<p style="margin:4px 0"><b>Motivo:</b> '+esc(hit.reason)+'</p>'+
 '<p style="margin:4px 0"><b>Evidência:</b> '+esc(hit.evidence)+' · Fonte: título do link acima. Texto integral não foi obtido ou verificado.</p></article>';
}
function forArticle(article,companies,feed,now=new Date()){
 if(!fresh(feed,now)||!publishedToday(article,now))return '';
 if(!Array.isArray(companies)||!companies.length)return '<p class="obs-news-evidence-none">Relação empresarial não avaliada: catálogo privado não autenticado.</p>';
 const links=evaluate(article,companies,feed,now);
 return '<div class="obs-news-evidence" aria-label="Evidência de associação empresa e notícia">'+
 (links.length?links.map(articleCard).join(''):'<p class="obs-news-evidence-none">Sem relação demonstrável com empresas do catálogo. Não associar por setor, município ou semelhança.</p>')+'</div>';
}
function forCompany(company,companies,feed,now=new Date()){
 if(!fresh(feed,now))return '<section class="obs-news-evidence"><h3>Notícias de hoje · evidências</h3><p>Notícias atuais indisponíveis ou consulta vencida. Nenhum vínculo foi reutilizado.</p></section>';
 if(!Array.isArray(companies)||!companies.length)return '<section class="obs-news-evidence"><h3>Notícias de hoje · evidências</h3><p>Catálogo privado não autenticado.</p></section>';
 const links=feed.items.filter(x=>publishedToday(x,now)).flatMap(article=>evaluate(article,companies,feed,now))
  .filter(hit=>norm(hit.company)===norm(company?.nome));
 const count=links.length;
 return '<section class="obs-news-evidence" aria-label="Notícias de hoje associadas à empresa"><h3>Notícias de hoje · evidências</h3>'+
 '<p style="font-size:12px;color:#607880">Consulta: '+esc(stamp(feed.consultadoEm))+' (Porto Alegre). Correspondência não é comprovação do acontecimento.</p>'+
 (count?links.map(articleCard).join(''):'<p>Nenhuma notícia publicada hoje tem relação demonstrável com esta empresa no lote consultado. Isso não comprova ausência de notícias.</p>')+
 '</section>';
}
const api=Object.freeze({today,fresh,publishedToday,evaluate,forArticle,forCompany});
if(root)root.ObsNewsEvidence=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
