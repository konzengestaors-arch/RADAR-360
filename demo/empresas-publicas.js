/* RADAR 360 — catálogo local de empresas (somente nome/CNPJ).
   Importação local: nunca envia conteúdo do arquivo, não integra carteira/cadência/ações. */
(function(){
'use strict';
const KEY='radar_empresas_publicas_nome_cnpj_v1',MAX_BYTES=1024*1024,MAX_ROWS=500;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let entries=[],stateMessage='',onUpdate=null;
function load(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){const x=JSON.parse(raw);if(!Array.isArray(x)||x.length>MAX_ROWS)throw Error('catálogo incompatível');
   entries=x.map(row=>({nome:String(row.nome||'').trim(),cnpj:String(row.cnpj||'').replace(/\D/g,'')}))
    .filter(row=>row.nome.length>=3&&row.nome.length<=160&&(!row.cnpj||row.cnpj.length===14));
  }
 }catch(e){entries=[];stateMessage='O catálogo local não pôde ser lido. A base original foi preservada; não importe sem verificar o armazenamento.'}
}
function parse(text,name){
 if(text.length>MAX_BYTES)throw Error('Arquivo acima do limite de 1 MB.');
 let arr;
 if(/\.json$/i.test(name)||text.trimStart().startsWith('[')){
  const obj=JSON.parse(text);arr=Array.isArray(obj)?obj:(obj?.empresas||null);
 }else{
  const marker=/\bconst\s+RECORDS\s*=\s*/g,match=marker.exec(text);
  if(!match)throw Error('Arquivo HTML sem lista RECORDS reconhecida.');
  const start=match.index+match[0].length;
  const tail=text.slice(start);
  const close=tail.indexOf(';\n');
  if(close<0)throw Error('Lista RECORDS não terminada ou em formato inesperado.');
  arr=JSON.parse(tail.slice(0,close).trim());
 }
 if(!Array.isArray(arr)||arr.length<1||arr.length>MAX_ROWS)throw Error('Quantidade de empresas fora do intervalo permitido.');
 const clean=arr.map((x,i)=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Registro '+(i+1)+' inválido.');
  const nome=String(x.nome||'').trim(),cnpj=String(x.cnpj||'').replace(/\D/g,'');
  if(nome.length<3||nome.length>160||(/[<>]/.test(nome))||cnpj&&cnpj.length!==14)
    throw Error('Nome ou CNPJ com formato inválido no registro '+(i+1)+'.');
  return {nome,cnpj};
 });
 return clean;
}
async function importFile(file){
 if(!file)return;
 try{
  if(file.size>MAX_BYTES)throw Error('Arquivo acima do limite de 1 MB.');
  const rows=parse(await file.text(),file.name);
  const data=JSON.stringify(rows);
  localStorage.setItem(KEY,data);
  if(localStorage.getItem(KEY)!==data)throw Error('Gravação não confirmada neste navegador.');
  entries=rows;
  stateMessage=rows.length+' nomes importados localmente. Apenas nome e CNPJ foram armazenados; confirme a origem pública antes de usar.';
 }catch(err){stateMessage='Importação não realizada: '+err.message;}
 if(typeof onUpdate==='function')onUpdate();
}
function safeName(name){
 const n=normalize(name).replace(/\b(?:LTDA|EIRELI|S A|SA|SPE|EPP|ME)\b/g,'').replace(/\s+/g,' ').trim();
 const tokens=n.split(' ').filter(Boolean);
 if(n.length<9||tokens.length<2&&n.length<13||/^(GRUPO|INDUSTRIA|COOPERATIVA|BRASIL|COMERCIO|SERVICOS)$/.test(n))return '';
 return n;
}
function matchesFor(items){
 if(!Array.isArray(items))return [];
 const result=[];
 for(const news of items){
  const title=normalize(news.titulo||'');
  if(!title)continue;
  const matched=entries.filter(x=>{
   const name=safeName(x.nome);
   return !!name&&(' '+title+' ').includes(' '+name+' ');
  }).slice(0,3);
  if(matched.length&&/^https:\/\/[^\s]+$/i.test(String(news.url||'')))
   result.push({title:String(news.titulo),url:String(news.url),fonte:String(news.fonte||''),data:String(news.publicadoEm||''),empresas:matched.map(x=>x.nome)});
 }
 return result;
}
function panel(){
 const filled=entries.filter(x=>x.cnpj).length;
 return '<section class="radar-company-panel" aria-label="Empresas monitoradas">'+
 '<div class="radar-company-heading"><div><span class="eyebrow">INTELIGÊNCIA EMPRESARIAL</span><h2>Empresas monitoradas <span class="radar-company-count">'+entries.length+'</span></h2><p>Nomes de empresas e CNPJs, associados a menções em notícias públicas.</p></div></div>'+
 '<div class="radar-company-actions"><label class="radar-company-import" for="radarCompanyFile">Importar lista local (.html ou .json)</label>'+
 '<input type="file" id="radarCompanyFile" accept=".html,.json,text/html,application/json" aria-label="Selecionar arquivo de empresas">'+
 '<span class="radar-company-meta">'+(entries.length?filled+' registros com CNPJ informado.':'Nenhuma lista importada neste navegador.')+'</span></div>'+
 '<p class="radar-company-warning">O processamento ocorre neste dispositivo. O RADAR descarta carteira, prioridades, ações e demais campos; não envia o arquivo à API de notícias.</p>'+
 '<p id="radarCompanyMessage" class="radar-company-message" role="status">'+escape(stateMessage)+'</p>'+
 '<div id="radarCompanyMatches" aria-live="polite"></div></section>';
}
function showMatches(items){
 const target=document.getElementById('radarCompanyMatches');if(!target)return;
 if(!entries.length){target.innerHTML='<div class="radar-company-empty">Importe a lista original para verificar menções de empresas nas matérias disponíveis.</div>';return;}
 const found=matchesFor(items);
 const count=found.length;
 target.innerHTML='<div class="radar-company-subtitle">'+(count?count+' notícia(s) com correspondência textual por nome':'Nenhuma correspondência textual por nome nas notícias atualmente disponíveis')+'</div>'+
 (found.length?'<div class="radar-company-results">'+found.slice(0,10).map(x=>
 '<article class="radar-company-hit"><span class="radar-company-tag">Correspondência por texto — requer conferência</span><strong>'+escape(x.empresas.join(' · '))+'</strong>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+escape(x.url)+'">'+escape(x.title)+'</a><small>'+escape(x.fonte)+' · '+escape(x.data)+'</small></article>').join('')+'</div>':
 '<p class="radar-company-empty">As menções são avaliadas somente nos títulos consultados. Ausência de correspondência não significa ausência de notícias sobre a empresa.</p>');
}
load();
document.addEventListener('change',e=>{if(e.target?.id==='radarCompanyFile'){const file=e.target.files?.[0];importFile(file);e.target.value='';}});
window.RadarCompanies={panel,showMatches,matchesFor,importFile,read:()=>entries.map(x=>({...x})),setOnUpdate:fn=>{onUpdate=fn}};
})();
