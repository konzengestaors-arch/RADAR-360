/* RADAR 360 — catálogo local de empresas (somente nome/CNPJ).
   Importação local: nunca envia conteúdo do arquivo, não integra carteira/cadência/ações. */
(function(){
'use strict';
const KEY='radar_empresas_publicas_nome_cnpj_v1',MAX_BYTES=1024*1024,MAX_ROWS=500;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let entries=[],stateMessage='Consultando o catálogo de empresas…',onUpdate=null,source='none';
function notifyStatus(){if(typeof onUpdate==='function')onUpdate()}
function setStatus(message){stateMessage=message;notifyStatus()}

function load(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){const x=JSON.parse(raw);if(!Array.isArray(x)||x.length>MAX_ROWS)throw Error('catálogo incompatível');
   entries=x.map(row=>({nome:String(row.nome||'').trim(),cnpj:String(row.cnpj||'').replace(/\D/g,'')}))
    .filter(row=>row.nome.length>=3&&row.nome.length<=160&&(!row.cnpj||row.cnpj.length===14));
   if(entries.length){source='local';stateMessage='Lista local preservada neste navegador ('+entries.length+' registros). Ela tem prioridade sobre o catálogo de 222 empresas da homologação; não há substituição automática.';}
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
/* O catálogo de homologação é disponibilizado somente no deployment protegido:
   não faz parte do repositório GitHub público, não grava em localStorage
   e nunca substitui uma lista que o usuário importou manualmente. */
async function loadPrivateStagingCatalog(){
 if(entries.length)return;
 try{
  let candidate;
  // A versão compactada é opcional: falha de rede, gzip inválido ou WebView
  // incompatível não podem impedir a tentativa do JSON protegido.
  if(typeof DecompressionStream==='function'){
   try{
    const zip=await fetch('/empresas-catalogo-222.json.gz',{cache:'no-store'});
    if(zip.ok){
     const bytes=await zip.arrayBuffer(),magic=new Uint8Array(bytes);
     if(magic[0]===0x1f&&magic[1]===0x8b){
      const decompressed=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      candidate=await new Response(decompressed).json();
     }else candidate=JSON.parse(new TextDecoder('utf-8').decode(bytes));
    }
   }catch(_){candidate=null;}
  }
  // Uma resposta gzip sintaticamente válida, mas incompleta, também exige fallback.
  if(!Array.isArray(candidate)||candidate.length!==222){
   const response=await fetch('/empresas-catalogo-222.json',{cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Catálogo hospedado não disponível (HTTP '+response.status+')');
   candidate=await response.json();
  }
  if(!Array.isArray(candidate)||candidate.length!==222)throw Error('Catálogo hospedado incompleto ou inválido');
  const sanitized=parse(JSON.stringify(candidate),'catalogo.json');
  if(entries.length)return;
  entries=sanitized;
  source='staging';
  setStatus('Catálogo de homologação: 222 empresas carregadas do servidor privado. Nomes e CNPJs ainda não foram validados individualmente em bases oficiais.');
 }catch(e){if(!entries.length)setStatus('Catálogo de homologação indisponível. Nenhuma lista local carregada. Confira a conexão ou importe sua lista. Motivo: '+String(e.message||e).slice(0,110));}
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
  source='local';
  stateMessage=rows.length+' nomes importados localmente. Apenas nome e CNPJ foram armazenados; confirme a origem pública antes de usar.';
 }catch(err){stateMessage='Importação não realizada: '+err.message;}
 if(typeof onUpdate==='function')onUpdate();
}
/* Qualidade de identidade: não confundir consistência do CNPJ com verificação oficial.
   Ambiguidades permanecem pesquisáveis, mas não entram em sugestões de correspondência. */
function validCNPJ(cnpj){
 if(!/^\d{14}$/.test(cnpj)||/^(\d)\1{13}$/.test(cnpj))return false;
 const digit=(len,weights)=>{
  let sum=0;
  for(let i=0;i<len;i++)sum+=Number(cnpj[i])*weights[i];
  const d=sum%11;return d<2?0:11-d;
 };
 return digit(12,[5,4,3,2,9,8,7,6,5,4,3,2])===Number(cnpj[12])&&
        digit(13,[6,5,4,3,2,9,8,7,6,5,4,3,2])===Number(cnpj[13]);
}
function identityReview(){
 const countsCNPJ=new Map(),countsName=new Map();
 for(const row of entries){
  const n=normalize(row.nome);
  countsName.set(n,(countsName.get(n)||0)+1);
  if(row.cnpj)countsCNPJ.set(row.cnpj,(countsCNPJ.get(row.cnpj)||0)+1);
 }
 return new Set(entries.filter(row=>{
  const n=normalize(row.nome);
  return (row.cnpj&&(!validCNPJ(row.cnpj)||countsCNPJ.get(row.cnpj)>1))||countsName.get(n)>1;
 }).map(row=>normalize(row.nome)));
}
function safeName(name){
 const n=normalize(name).replace(/\b(?:LTDA|EIRELI|S A|SA|SPE|EPP|ME)\b/g,'').replace(/\s+/g,' ').trim();
 const tokens=n.split(' ').filter(Boolean);
 if(n.length<9||tokens.length<2&&n.length<13||/^(GRUPO|INDUSTRIA|COOPERATIVA|BRASIL|COMERCIO|SERVICOS)$/.test(n))return '';
 return n;
}
function classifyNews(items){
 if(!Array.isArray(items))return [];
 const pending=identityReview();
 const eligible=entries.filter(row=>!pending.has(normalize(row.nome)));
 return items.map(news=>{
  const title=normalize(news?.titulo||news?.title||'');
  const matches=title?eligible.filter(row=>{
   const name=safeName(row.nome);
   return name&&(' '+title+' ').includes(' '+name+' ');
  }):[];
  return {titulo:String(news?.titulo||news?.title||''),status:matches.length>1?'ambigua':matches.length===1?'candidata_revisao':'nao_identificada',empresas:matches.map(x=>x.nome),motivo:matches.length>1?'multiplas_empresas':matches.length===1?'mencao_no_titulo':'sem_correspondencia_forte'};
 });
}
function matchesFor(items){
 if(!Array.isArray(items))return [];
 const result=[];
 // Identidade do catálogo não muda durante a análise de um lote de notícias.
 // Evita revalidar todos os CNPJs e nomes para cada manchete.
 const pending=identityReview();
 for(const news of items){
  const title=normalize(news.titulo||'');
  if(!title)continue;
  const matched=entries.filter(x=>{
   if(pending.has(normalize(x.nome)))return false;
   const name=safeName(x.nome);
   return !!name&&(' '+title+' ').includes(' '+name+' ');
  }).slice(0,3);
  if(matched.length&&/^https:\/\/[^\s]+$/i.test(String(news.url||'')))
   result.push({title:String(news.titulo),url:String(news.url),fonte:String(news.fonte||''),data:String(news.publicadoEm||''),empresas:matched.map(x=>x.nome)});
 }
 return result;
}
function directoryList(){
 const q=normalize(directoryQuery);
 const digits=q.replace(/\D/g,'');
 const cnpjQuery=digits.length>=3&&/^[0-9 ]+$/.test(q);
 const matching=entries.filter(x=>!q||normalize(x.nome).includes(q)||(cnpjQuery&&x.cnpj.includes(digits)));
 const subset=matching.slice(0,24);
 return '<p class="radar-directory-meta">'+matching.length+' empresa(s) encontradas. '+(matching.length>24?'Exibindo as primeiras 24.':'')+'</p>'+
 (subset.length?'<ul class="radar-directory-list">'+subset.map(x=>
 '<li><strong>'+escape(x.nome)+'</strong><small>'+(x.cnpj?'CNPJ: '+escape(x.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5')):'CNPJ não informado')+'</small></li>').join('')+'</ul>':
 '<p class="radar-company-empty">Nenhuma empresa corresponde à busca.</p>');
}
let directoryQuery='';
function updateDirectory(){
 const node=document.getElementById('radarCompanyDirectoryList');
 if(node)node.innerHTML=directoryList();
}
function panel(){
 const filled=entries.filter(x=>x.cnpj).length;
 const riskyNames=identityReview();
 const pending=entries.filter(row=>riskyNames.has(normalize(row.nome))).length;
 return '<section class="radar-company-panel" aria-label="Empresas monitoradas" data-catalog-source="'+source+'">'+
 '<div class="radar-company-heading"><div><span class="eyebrow">INTELIGÊNCIA EMPRESARIAL</span><h2>Empresas monitoradas <span class="radar-company-count">'+entries.length+'</span></h2><p>Nomes de empresas e CNPJs, associados a menções em notícias públicas.</p></div></div>'+
 '<div class="radar-company-actions"><label class="radar-company-import" for="radarCompanyFile">Importar lista local (.html ou .json)</label>'+
 '<input type="file" id="radarCompanyFile" accept=".html,.json,text/html,application/json" aria-label="Selecionar arquivo de empresas">'+
 '<span class="radar-company-meta">'+(entries.length?filled+' registros com CNPJ informado · '+pending+' registro(s) em conferência de identidade.':'Nenhuma lista importada neste navegador.')+'</span></div>'+
 '<p class="radar-company-warning">Importações manuais são locais. O catálogo inicial, quando disponível, contém apenas nomes/CNPJs e é servido pelo ambiente privado; carteira, prioridades, ações e outros campos são excluídos. Registros com CNPJ inválido, repetido ou nome duplicado são excluídos das sugestões de notícias até conferência. Correspondências exibidas são apenas indícios.</p>'+
 '<details class="radar-company-directory" open><summary>Consultar empresas do catálogo</summary><div class="radar-directory-inside"><label for="radarCompanySearch">Pesquisar nome ou CNPJ</label><input id="radarCompanySearch" type="search" autocomplete="off" placeholder="Digite o nome da empresa..." value="'+escape(directoryQuery)+'"><div id="radarCompanyDirectoryList">'+directoryList()+'</div></div></details>'+
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
 '<article class="radar-company-hit"><span class="radar-company-tag">'+(x.empresas.length>1?'Múltiplas empresas citadas — revisar individualmente':'Menção textual — vínculo não confirmado')+'</span><strong>'+escape(x.empresas.join(' · '))+'</strong>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+escape(x.url)+'">'+escape(x.title)+'</a><small>'+escape(x.fonte)+' · '+escape(x.data)+'</small></article>').join('')+'</div>':
 '<p class="radar-company-empty">As menções são avaliadas somente nos títulos consultados. Ausência de correspondência não significa ausência de notícias sobre a empresa.</p>');
}
load();
loadPrivateStagingCatalog();
document.addEventListener('input',e=>{if(e.target?.id==='radarCompanySearch'){directoryQuery=e.target.value;updateDirectory();}});
document.addEventListener('change',e=>{if(e.target?.id==='radarCompanyFile'){const file=e.target.files?.[0];importFile(file);e.target.value='';}});
window.RadarCompanies={panel,showMatches,matchesFor,classifyNews,importFile,read:()=>entries.map(x=>({...x})),setOnUpdate:fn=>{onUpdate=fn}};
})();
