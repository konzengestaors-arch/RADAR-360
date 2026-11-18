/* RADAR 360 — catálogo local de empresas (somente nome/CNPJ).
   Importação local: nunca envia conteúdo do arquivo, não integra carteira/cadência/ações. */
(function(){
'use strict';
const KEY='radar_empresas_publicas_nome_cnpj_v1',MAX_BYTES=1024*1024,MAX_ROWS=500;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let entries=[],stateMessage='Verificando autenticação privada…',onUpdate=null,source='none',latestNews=[],sessionState='checking';
let diagnosticMessage='Sem verificação recente neste aparelho.',diagnosticBusy=false;
function notifyStatus(){if(typeof onUpdate==='function')onUpdate()}
function setStatus(message){stateMessage=message;notifyStatus()}

function load(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){const x=JSON.parse(raw);if(!Array.isArray(x)||x.length>MAX_ROWS)throw Error('catálogo incompatível');
   entries=x.map(row=>({nome:String(row.nome||'').trim(),cnpj:String(row.cnpj||'').replace(/\D/g,'')}))
    .filter(row=>row.nome.length>=3&&row.nome.length<=160&&(!row.cnpj||row.cnpj.length===14));
   if(entries.length){source='local';stateMessage='Lista local preservada neste navegador ('+entries.length+' registros). A cópia local permanece armazenada, mas a prévia privada exige o catálogo canônico remoto.';}
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
 // O catálogo de QA vem exclusivamente do backend autenticado na Vercel.
 // Uma lista antiga no localStorage NÃO é enviada nem apagada, mas não pode
 // sobrepor silenciosamente as 217 empresas canônicas nesta prévia.
 entries=[];source='none';setStatus('Verificando sessão privada…');
 try{
  const sessionResponse=await fetch('/api/sessao',{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
  if(!sessionResponse.ok)throw Error('Serviço de sessão indisponível (HTTP '+sessionResponse.status+')');
  const session=await sessionResponse.json();
  if(session.authenticated!==true){
   sessionState='closed';
   setStatus('Catálogo privado bloqueado. Entre com a proteção Vercel e inicie a sessão para consultar as 217 empresas.');
   return;
  }
  sessionState='open';diagnosticMessage='Sessão ativa. Use Verificar conexão privada para validar as APIs reais.';setStatus('Consultando catálogo privado de 217 empresas…');
  const response=await fetch('/api/empresas',{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error(response.status===401||response.status===403?'Acesso não autorizado (SSO necessário)':'Serviço indisponível (HTTP '+response.status+')');
  const payload=await response.json();
  if(payload.schema!=='observatorio-empresas/1'||payload.total!==217||
     !Array.isArray(payload.items)||payload.items.length!==217)throw Error('Contagem do catálogo não confirmada');
  const validated=parse(JSON.stringify(payload.items),'catalogo.json');
  const checked=validated.map((row,i)=>({...row,
    conflito:payload.items[i].conflito===true,
    motivoConferencia:String(payload.items[i].motivoConferencia||''),
    validadeMatematicaCnpj:String(payload.items[i].validadeMatematicaCnpj||'')
  }));
  if(checked.filter(x=>x.cnpj).length!==96||checked.filter(x=>x.conflito).length!==8)
     throw Error('Indicadores de integridade não correspondem à base homologada');
  entries=checked;source='staging';
  setStatus('Base privada: 217 empresas reais carregadas via sessão HTTPS protegida. 96 CNPJs informados, 121 ausentes, 8 registros em conferência. Dígitos de CNPJ não equivalem a consulta oficial.');
 }catch(e){entries=[];source='none';sessionState='error';setStatus('Não foi possível acessar o catálogo privado. Os dados não foram substituídos por conteúdo fictício. '+String(e.message||e).slice(0,130));}
}
// Checagem somente sob comando explícito no Android: não envia nomes ou CNPJs
// para logs, relatórios ou outro domínio. Não grava nem altera registros privados.
function showDiagnostic(message){
 diagnosticMessage=message;
 const node=document.getElementById('obs360DiagnosticResult');
 if(node)node.textContent=message;
}
async function checkPrivateConnection(){
 if(diagnosticBusy)return;
 diagnosticBusy=true;
 showDiagnostic('Verificando autenticação e APIs reais…');
 const load=async path=>{
  try{
   const response=await fetch(path,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
   const body=await response.json().catch(()=>null);
   return {ok:response.ok,status:response.status,body};
  }catch{return {ok:false,status:0,body:null}}
 };
 try{
  const session=await load('/api/sessao');
  if(!session.ok||session.body?.authenticated!==true){
   if(session.ok){entries=[];source='none';sessionState='closed';const dialog=document.getElementById('radarCompanyDossier');if(dialog?.open)dialog.close();}
   showDiagnostic(session.ok?'Sessão privada: bloqueada. Toque em Iniciar sessão privada antes de verificar os dados.':'Sessão privada: serviço indisponível (HTTP '+session.status+').');
   if(session.ok)notifyStatus();
   return;
  }
  const catalog=await load('/api/empresas');
  if(!catalog.ok){
   showDiagnostic('Sessão: ativa. Catálogo: falha HTTP '+catalog.status+'. Nenhuma empresa foi substituída por dados de teste.');
   return;
  }
  const data=catalog.body;
  const total=Array.isArray(data?.items)?data.items.length:-1;
  const review=Array.isArray(data?.items)?data.items.filter(row=>row?.conflito===true).length:-1;
  const cnpj=Array.isArray(data?.items)?data.items.filter(row=>typeof row?.cnpj==='string'&&row.cnpj!=='').length:-1;
  if(data?.schema!=='observatorio-empresas/1'||data?.total!==217||total!==217||review!==8||cnpj!==96){
   showDiagnostic('Sessão: ativa. Catálogo: integridade reprovada; contagem e flags divergentes. Dados não homologados.');
   return;
  }
  const [reviews,news]=await Promise.all([load('/api/apuracoes'),load('/api/noticias')]);
  const reviewsGood=reviews.ok&&Array.isArray(reviews.body?.items);
  const newsGood=news.ok&&news.body?.schema==='radar-observatorio-feed/1'&&Array.isArray(news.body?.items)&&Array.isArray(news.body?.radar7d);
  const day=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  const datesOk=newsGood&&news.body.items.every(item=>item.publicadoEm===day);
  const lines=[
   'Sessão privada: ATIVA (consultada no servidor)',
   'Catálogo real: 217 empresas · 96 CNPJs informados · 8 em conferência (integridade confirmada)',
   reviewsGood?'Apurações persistentes: API acessível · '+reviews.body.items.length+' registro(s) recentes':'Apurações persistentes: indisponível (HTTP '+reviews.status+')',
   newsGood&&datesOk?'Notícias: '+news.body.items.length+' de hoje · '+news.body.radar7d.length+' na janela de 7 dias':'Notícias: indisponíveis ou com data incompatível (HTTP '+news.status+')',
   reviewsGood&&newsGood&&datesOk?'RESULTADO: CONEXÕES BÁSICAS APROVADAS. Falta validar navegação e logout no Motorola.':'RESULTADO: PARCIAL. Uma ou mais integrações ainda falharam.'
  ];
  showDiagnostic(lines.join('\n'));
 }finally{diagnosticBusy=false}
}
async function beginPrivateSession(){
 if(sessionState==='busy')return;
 sessionState='busy';setStatus('Iniciando sessão privada…');
 try{
  const r=await fetch('/api/sessao',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const v=await r.json();
  if(v.authenticated!==true)throw Error('Sessão não confirmada');
  await loadPrivateStagingCatalog();
  showMatches(latestNews);
 }catch(e){sessionState='error';entries=[];source='none';setStatus('Não foi possível iniciar a sessão privada. '+String(e.message||e).slice(0,80));}
}
async function endPrivateSession(){
 if(sessionState==='busy')return;
 sessionState='busy';setStatus('Revogando sessão privada…');
 try{
  const r=await fetch('/api/sessao',{method:'DELETE',credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const v=await r.json();
  if(v.authenticated!==false)throw Error('Revogação não confirmada');
  sessionState='closed';entries=[];source='none';latestNews=[];diagnosticMessage='Sessão encerrada. Execute nova verificação após iniciar sessão privada.';
  setStatus('Sessão do Observatório revogada. A autenticação da Vercel pode permanecer ativa; empresas e dossiês continuam bloqueados até iniciar outra sessão.');
  showMatches([]);
 }catch(e){sessionState='error';entries=[];source='none';setStatus('Não foi possível confirmar a revogação. '+String(e.message||e).slice(0,80));}
}
async function importFile(file){
 if(!file)return;
 setStatus('Para proteger a fonte canônica, a importação está desabilitada nesta prévia de QA. Nenhum arquivo foi alterado.');return;
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
  return row.conflito===true||(row.cnpj&&(!validCNPJ(row.cnpj)||countsCNPJ.get(row.cnpj)>1))||countsName.get(n)>1;
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
  const title=normalize(news?.titulo||news?.title||'');
  if(!title)continue;
  const matched=entries.filter(x=>{
   if(pending.has(normalize(x.nome)))return false;
   const name=safeName(x.nome);
   return !!name&&(' '+title+' ').includes(' '+name+' ');
  });
  if(matched.length&&/^https:\/\/[^\s]+$/i.test(String(news?.url||'')))
   result.push({title:String(news?.titulo||news?.title||''),url:String(news?.url||''),fonte:String(news?.fonte||''),data:String(news?.publicadoEm||''),empresas:matched.map(x=>x.nome)});
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
 '<li><strong>'+escape(x.nome)+'</strong><small>'+(x.cnpj?'CNPJ: '+escape(x.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5')):'CNPJ não informado')+'</small><button type="button" data-obs-company-index="'+entries.indexOf(x)+'" style="background:#f1faf6;color:#0a7369;border:1px solid #bfded2;border-radius:9px;padding:8px 11px;min-height:42px;cursor:pointer;font-weight:700">Abrir dossiê</button></li>').join('')+'</ul>':
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
 '<div class="radar-private-session" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 14px;margin:6px 0 15px;border:1px solid #cbdfe0;border-radius:12px;background:#f6fbfb">'+
 (sessionState==='open'?'<span style="color:#087e69;font-weight:750">Sessão privada ativa</span><button type="button" id="obs360EndSession" style="min-height:44px;padding:10px 14px;border-radius:9px">Encerrar sessão</button>':
 '<span style="color:#57717c">Catálogo protegido · Vercel SSO + sessão privada</span><button type="button" id="obs360BeginSession" style="min-height:44px;padding:10px 14px;border-radius:9px">Iniciar sessão privada</button>')+
 '</div>'+
 '<div class="obs360-diagnostic" style="border:1px solid #cddcda;border-radius:12px;background:#f9fcfb;padding:13px 14px;margin:0 0 15px">'+
 '<button type="button" id="obs360RunDiagnostic" style="padding:11px 13px;min-height:44px;border:1px solid #93c6b9;border-radius:9px;color:#075e55;background:#eff8f5;font-weight:800;cursor:pointer">Verificar conexão privada e notícias</button>'+
 '<p id="obs360DiagnosticResult" role="status" aria-live="polite" style="font-size:12px;color:#3b5860;white-space:pre-line;line-height:1.7;margin:9px 0 0">'+escape(diagnosticMessage)+'</p>'+
 '</div>'+
 '<div class="radar-company-heading"><div><span class="eyebrow">INTELIGÊNCIA EMPRESARIAL</span><h2>Empresas monitoradas <span class="radar-company-count">'+entries.length+'</span></h2><p>Nomes de empresas e CNPJs, associados a menções em notícias públicas.</p></div></div>'+
 '<div class="radar-company-actions">'+
 '<span class="radar-company-meta">'+(entries.length?filled+' registros com CNPJ informado · '+pending+' registro(s) em conferência de identidade.':'Sem dados privados disponíveis nesta sessão. Acesso exige autenticação na Vercel.')+'</span></div>'+
 '<p class="radar-company-warning">Catálogo consultado em servidor privado, sem persistência local. As fichas contêm somente identificação informada, resultado da checagem matemática e possíveis menções textuais em notícias públicas. Registros em conferência não recebem associações automáticas. CNPJ com dígitos válidos não comprova cadastro ativo.</p>'+
 '<details class="radar-company-directory" open><summary>Consultar empresas do catálogo</summary><div class="radar-directory-inside"><label for="radarCompanySearch">Pesquisar nome ou CNPJ</label><input id="radarCompanySearch" type="search" autocomplete="off" placeholder="Digite o nome da empresa..." value="'+escape(directoryQuery)+'"><div id="radarCompanyDirectoryList">'+directoryList()+'</div></div></details>'+
 '<p id="radarCompanyMessage" class="radar-company-message" role="status">'+escape(stateMessage)+'</p>'+
 '<div id="radarCompanyMatches" aria-live="polite"></div></section>';
}
function showMatches(items){
 latestNews=Array.isArray(items)?items.filter(x=>x&&typeof x==='object'):[];
 const target=document.getElementById('radarCompanyMatches');if(!target)return;
 if(!entries.length){target.innerHTML='<div class="radar-company-empty">Entre na prévia protegida para consultar as empresas e suas menções.</div>';return;}
 const found=matchesFor(items);
 const count=found.length;
 target.innerHTML='<div class="radar-company-subtitle">'+(count?count+' notícia(s) com correspondência textual por nome':'Nenhuma correspondência textual por nome nas notícias atualmente disponíveis')+'</div>'+
 (found.length?'<div class="radar-company-results">'+found.slice(0,10).map(x=>
 '<article class="radar-company-hit"><span class="radar-company-tag">'+(x.empresas.length>1?'Múltiplas empresas citadas — revisar individualmente':'Menção textual — vínculo não confirmado')+'</span><strong>'+escape(x.empresas.slice(0,3).join(' · '))+(x.empresas.length>3?' · +'+(x.empresas.length-3)+' outras':'')+'</strong>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+escape(x.url)+'">'+escape(x.title)+'</a><small>'+escape(x.fonte)+' · '+escape(x.data)+'</small></article>').join('')+'</div>':
 '<p class="radar-company-empty">As menções são avaliadas somente nos títulos consultados. Ausência de correspondência não significa ausência de notícias sobre a empresa.</p>');
}

// Restaura a leitura de dossiê da P4.1, sem acrescentar campos que não existem
// no catálogo canônico e sem enviar o nome empresarial a buscadores externos.
function openDossier(index){
 const i=Number(index);if(!Number.isInteger(i)||i<0||i>=entries.length||source!=='staging')return;
 const company=entries[i];
 let dialog=document.getElementById('radarCompanyDossier');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='radarCompanyDossier';
  dialog.setAttribute('aria-label','Dossiê empresarial');
  dialog.style.cssText='border:0;border-radius:18px;padding:0;max-width:min(92vw,560px);max-height:85vh;width:100%;box-shadow:0 25px 80px #001c3070;color:#163747';
  document.body.appendChild(dialog);
 }
 const related=company.conflito?[]:matchesFor(latestNews).filter(hit=>hit.empresas.includes(company.nome)).slice(0,8);
 const status=company.conflito
  ?'Identidade em conferência — não associar automaticamente a notícias'
  :company.cnpj?'Dígitos do CNPJ consistentes; cadastro oficial não verificado':'CNPJ não informado';
 const motive=company.conflito?String(company.motivoConferencia||'Verificação cadastral necessária'):'';
 const cnpj=company.cnpj?company.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):'Não informado';
 dialog.innerHTML='<div style="padding:21px 21px 25px;overflow-y:auto;max-height:84vh">'+
  '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px">'+
  '<div><span style="font-size:11px;color:#087e69;font-weight:800;letter-spacing:.09em">DOSSIÊ PRIVADO · IDENTIDADE</span>'+
  '<h2 style="margin:8px 0;font-size:22px;line-height:1.25">'+escape(company.nome)+'</h2></div>'+
  '<button type="button" id="radarCloseDossier" aria-label="Fechar dossiê" style="min-width:44px;min-height:44px;border-radius:9px;border:1px solid #cbdcde;background:#fff">Fechar ×</button></div>'+
  '<p style="margin:8px 0"><strong>CNPJ:</strong> '+escape(cnpj)+'</p>'+
  '<p style="font-size:13px;color:#526b77"><strong>Situação:</strong> '+escape(status)+'</p>'+
  (motive?'<p style="font-size:13px;color:#945d16"><strong>Motivo:</strong> '+escape(motive)+'</p>':'')+
  '<hr style="border:0;border-top:1px solid #dce7e8;margin:20px 0">'+
  '<h3 style="font-size:16px;margin:0 0 12px">Menções nas notícias consultadas</h3>'+
  (related.length?related.map(hit=>'<article style="padding:12px 0;border-bottom:1px solid #e1eded">'+
   '<a target="_blank" rel="noopener noreferrer" href="'+escape(hit.url)+'" style="color:#0a7369;font-weight:750">'+escape(hit.title)+'</a>'+
   '<p style="color:#647985;font-size:12px;margin:5px 0">'+escape(hit.fonte)+' · '+escape(hit.data)+'</p>'+
   '</article>').join(''):'<p style="color:#647985;font-size:13px">Nenhuma menção textual elegível neste lote. Isso não significa ausência de notícias.</p>')+
  '<p style="font-size:12px;color:#647985;margin-top:17px">As menções são indícios textuais, não confirmação de vínculo ou impacto. Fontes originais devem ser conferidas.</p></div>';
 if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}
 else dialog.setAttribute('open','');
}

loadPrivateStagingCatalog();
document.addEventListener('input',e=>{if(e.target?.id==='radarCompanySearch'){directoryQuery=e.target.value;updateDirectory();}});
document.addEventListener('change',e=>{if(e.target?.id==='radarCompanyFile'){const file=e.target.files?.[0];importFile(file);e.target.value='';}});
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#obs360BeginSession')){e.preventDefault();void beginPrivateSession();return;}
 if(e.target?.closest?.('#obs360EndSession')){e.preventDefault();void endPrivateSession();return;}
 if(e.target?.closest?.('#obs360RunDiagnostic')){e.preventDefault();void checkPrivateConnection();return;}
 const trigger=e.target?.closest?.('[data-obs-company-index]');
 if(trigger){openDossier(trigger.getAttribute('data-obs-company-index'));return;}
 if(e.target?.closest?.('#radarCloseDossier')){
  const dialog=document.getElementById('radarCompanyDossier');
  if(dialog?.close)dialog.close();else dialog?.removeAttribute('open');
 }
});
// Um vínculo só pode abrir um dossiê após autenticação e checagem de identidade.
function openDossierByName(name){
 if(source!=='staging'||sessionState!=='open')return false;
 const exact=entries.map((company,index)=>({company,index})).filter(x=>normalize(x.company.nome)===normalize(name));
 if(exact.length!==1||exact[0].company.conflito||identityReview().has(normalize(name)))return false;
 openDossier(exact[0].index);
 return true;
}
window.RadarCompanies={panel,showMatches,matchesFor,classifyNews,openDossierByName,importFile,read:()=>entries.map(x=>({...x})),getStatus:()=>({source,sessionState,total:source==='staging'?entries.length:null,pendentes:source==='staging'?entries.filter(x=>x.conflito).length:null}),setOnUpdate:fn=>{onUpdate=fn}};
})();
