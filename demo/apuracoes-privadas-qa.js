/* Observatório 360 | QA privado | apuração documental persistida.
   Sem gravação automática; nenhuma empresa/CNPJ é enviado a serviços externos. */
(function(root){
'use strict';
let modal=null,sequence=0,busy=false,currentUrl='';
const allowed=new Set(['confirmado','inconclusivo','descartado']);
const canonical=value=>{
 try{const u=new URL(String(value||''));if(u.protocol!=='https:'||u.username||u.password)return null;u.hash='';return u.href.length<=1000?u.href:null}catch{return null}
};
const sessionReady=()=>{const s=root.RadarCompanies?.getStatus?.();return s?.source==='staging'&&s?.sessionState==='open'};
const message=text=>{if(modal)modal.querySelector('#obs360ReviewMessage').textContent=text};
function ensureModal(){
 if(modal)return modal;
 modal=document.createElement('dialog');
 modal.id='obs360ReviewDialog';modal.setAttribute('aria-label','Apuração documental privada');
 modal.innerHTML=[
 '<div class="obs360-review-inner">',
 '<div class="obs360-review-heading"><div><span>OBSERVATÓRIO 360 · REVISÃO PRIVADA</span><h2>Registrar apuração</h2></div><button type="button" id="obs360ReviewClose">Fechar ×</button></div>',
 '<p>Registre apenas o que você conferiu. O estado da <strong>constatação documental</strong> não confirma oportunidades comerciais, cobertura de seguros ou identidade de empresas.</p>',
 '<form id="obs360ReviewForm">',
 '<label for="obs360ReviewTitle">Título da publicação</label><input id="obs360ReviewTitle" name="title" minlength="3" maxlength="260" required readonly>',
 '<a id="obs360ReviewOpenSource" target="_blank" rel="noopener noreferrer">Conferir a publicação original ↗</a>',
 '<label for="obs360ReviewEvidence">URL da evidência HTTPS</label><input id="obs360ReviewEvidence" name="evidenceUrl" type="url" maxlength="1000" required>',
 '<label for="obs360ReviewStatus">Situação da constatação</label><select id="obs360ReviewStatus" name="status" required><option value="inconclusivo">Inconclusiva — exige diligência</option><option value="confirmado">Confirmada documentalmente</option><option value="descartado">Descartada após conferência</option></select>',
 '<label for="obs360ReviewFinding">Constatação e próximo passo</label><textarea id="obs360ReviewFinding" name="finding" minlength="12" maxlength="1000" rows="5" required placeholder="Descreva o que foi verificado, as limitações e o próximo passo."></textarea>',
 '<div class="obs360-review-actions"><button id="obs360ReviewSave" type="submit">Salvar e confirmar leitura no servidor</button><button id="obs360ReviewCancel" type="button">Cancelar</button></div>',
 '</form><p id="obs360ReviewMessage" role="status" aria-live="polite">Consultando o registro privado…</p></div>'
 ].join('');
 document.body.appendChild(modal);
 const close=()=>{if(!busy)modal.close()};
 modal.querySelector('#obs360ReviewClose').addEventListener('click',close);
 modal.querySelector('#obs360ReviewCancel').addEventListener('click',close);
 modal.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
 modal.addEventListener('close',()=>{
  sequence++;currentUrl='';modal.querySelector('#obs360ReviewForm').reset();message('');
 });
 modal.querySelector('#obs360ReviewForm').addEventListener('submit',save);
 return modal;
}
async function readReview(url){
 const r=await fetch('/api/apuracoes?noticia='+encodeURIComponent(url),{
  method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
 });
 const body=await r.json().catch(()=>null);
 if(!r.ok)throw Error(r.status===401?'Sessão expirada. Inicie nova sessão privada.':'Falha na consulta (HTTP '+r.status+').');
 if(!body||!Object.prototype.hasOwnProperty.call(body,'item'))throw Error('Resposta privada inválida.');
 return body.item;
}
async function open(url,title){
 if(!sessionReady())return false;
 const clean=canonical(url);
 if(!clean||typeof title!=='string'||title.trim().length<3||title.trim().length>260)return false;
 const d=ensureModal(),seq=++sequence,form=d.querySelector('#obs360ReviewForm');
 currentUrl=clean;form.reset();form.elements.title.value=title.trim();
 form.elements.evidenceUrl.value=clean;
 form.elements.status.value='inconclusivo';
 d.querySelector('#obs360ReviewOpenSource').href=clean;
 form.querySelector('#obs360ReviewSave').disabled=true;
 message('Consultando registros existentes antes de autorizar alteração…');
 if(!d.open)d.showModal();
 try{
  const prior=await readReview(clean);
  if(seq!==sequence||!d.open)return true;
  if(!sessionReady()){message('Sessão privada encerrada. Gravação bloqueada.');return false}
  if(prior){
   if(canonical(prior.articleUrl)!==clean||!allowed.has(prior.status))throw Error('Registro encontrado com dados incompatíveis.');
   form.elements.evidenceUrl.value=prior.evidenceUrl||clean;
   form.elements.finding.value=prior.finding||'';
   form.elements.status.value=prior.status;
   message('Apuração já registrada. Confira os dados antes de editar.');
  }else message('Nenhuma apuração anterior. Abra e confira a publicação antes de salvar.');
  form.querySelector('#obs360ReviewSave').disabled=false;
 }catch(e){if(seq===sequence&&d.open)message(e.message+' Nenhuma alteração será permitida sem leitura inicial.')}
 return true;
}
async function save(event){
 event.preventDefault();
 if(busy||!modal?.open)return;
 const form=modal.querySelector('#obs360ReviewForm');
 if(!sessionReady()){message('Sessão privada encerrada. Nenhuma gravação realizada.');return}
 const evidenceUrl=canonical(form.elements.evidenceUrl.value);
 const title=form.elements.title.value.trim(),finding=form.elements.finding.value.trim(),st=form.elements.status.value;
 if(!evidenceUrl||!currentUrl||title.length<3||title.length>260||finding.length<12||finding.length>1000||!allowed.has(st)){
  message('Evidência HTTPS obrigatória e constatação entre 12 e 1000 caracteres.');return
 }
 busy=true;form.querySelector('#obs360ReviewSave').disabled=true;message('Enviando apuração ao serviço privado…');
 try{
  const response=await fetch('/api/apuracoes',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({articleUrl:currentUrl,evidenceUrl,title,finding,status:st})
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.item)throw Error(response.status===401?'Sessão expirada: sem confirmação.':'Gravação não confirmada (HTTP '+response.status+').');
  message('Servidor respondeu. Conferindo a leitura persistente…');
  const saved=await readReview(currentUrl);
  if(!saved||canonical(saved.articleUrl)!==currentUrl||canonical(saved.evidenceUrl)!==evidenceUrl||saved.finding!==finding||saved.status!==st)
   throw Error('A leitura posterior não confirmou o registro.');
  message('Apuração salva e relida do servidor. Nenhuma oportunidade foi confirmada automaticamente.');
  if(document.getElementById('obs360ReviewList')&&sessionReady())void refreshList();
  document.querySelectorAll('[data-radar-review]').forEach(button=>{
   if(canonical(button.getAttribute('data-radar-review'))===currentUrl)button.textContent='Consultar apuração registrada';
  });
 }catch(e){message(e.message+' Se a gravação foi enviada, reabra a publicação para verificar antes de repetir.')}
 finally{busy=false;if(modal?.open&&sessionReady())form.querySelector('#obs360ReviewSave').disabled=false}
}

/* Biblioteca privada: recupera as 50 apurações mais recentes, inclusive artigos
   fora da janela de sete dias. Sem cópia em localStorage ou dados fictícios. */
let reviews=[],listLoaded=false,listLoading=false,listSeq=0,listFilter='todos',listNotice='';
const htmlEscape=text=>String(text??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const statusLabels={confirmado:'Constatação documentada',inconclusivo:'Pendente de diligência',descartado:'Descartada após conferência'};
function resetList(){
 listSeq++;reviews=[];listLoaded=false;listLoading=false;listFilter='todos';listNotice='';
 if(modal?.open)modal.close();
 const section=document.getElementById('obs360ReviewList');
 if(section)renderList();
}
function renderList(){
 const section=document.getElementById('obs360ReviewList');
 if(!section)return;
 const messageNode=section.querySelector('#obs360ReviewListStatus');
 const itemsNode=section.querySelector('#obs360ReviewListItems');
 const refreshButton=section.querySelector('#obs360ReviewListRefresh');
 const filterNode=section.querySelector('#obs360ReviewListFilter');
 if(!messageNode||!itemsNode||!refreshButton||!filterNode)return;
 if(!sessionReady()){
  messageNode.textContent='Área privada. Inicie a sessão para recuperar as apurações documentadas.';
  itemsNode.replaceChildren();
  refreshButton.disabled=true;filterNode.disabled=true;
  return;
 }
 refreshButton.disabled=listLoading;
 filterNode.disabled=listLoading||!listLoaded;
 filterNode.value=listFilter;
 if(listLoading){
  messageNode.textContent='Consultando apurações persistidas no servidor…';
  itemsNode.replaceChildren();
  return;
 }
 if(!listLoaded){
  messageNode.textContent=listNotice||'Preparando consulta dos registros privados…';
  itemsNode.replaceChildren();
  return;
 }
 const visible=reviews.filter(item=>listFilter==='todos'||item.status===listFilter);
 messageNode.textContent=(listNotice?listNotice+' · ':'')+
  reviews.length+' registro(s) recuperado(s)'+(reviews.length===50?' (limite da API: 50 recentes)':'')+
  ' · '+visible.length+' exibido(s). A constatação não confirma negócio ou vínculo empresarial.';
 if(!visible.length){
  itemsNode.innerHTML='<p class="obs360-review-empty">'+(reviews.length?'Nenhum registro encontrado para este status.':'Nenhuma apuração registrada nesta sessão. As notícias seguem disponíveis para investigação.')+'</p>';
  return;
 }
 itemsNode.innerHTML=visible.map(item=>{
  const updated=Number.isFinite(Date.parse(item.updatedAt))?new Date(item.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Não informada';
  return '<article class="obs360-review-list-card">'+
   '<span class="obs360-review-list-status" data-status="'+htmlEscape(item.status)+'">'+htmlEscape(statusLabels[item.status])+'</span>'+
   '<h3>'+htmlEscape(item.title)+'</h3>'+
   '<p class="obs360-review-list-date">Última revisão: '+htmlEscape(updated)+'</p>'+
   '<p class="obs360-review-list-finding">'+htmlEscape(item.finding)+'</p>'+
   '<div class="obs360-review-list-actions">'+
   '<a href="'+htmlEscape(item.articleUrl)+'" target="_blank" rel="noopener noreferrer">Fonte original ↗</a>'+
   '<a href="'+htmlEscape(item.evidenceUrl)+'" target="_blank" rel="noopener noreferrer">Evidência documental ↗</a>'+
   '<button type="button" class="obs360-review-trigger" data-radar-review="'+htmlEscape(item.articleUrl)+'" data-radar-review-title="'+htmlEscape(item.title)+'">Reabrir apuração</button>'+
   '</div></article>';
 }).join('');
}
async function refreshList(){
 if(listLoading||!sessionReady())return;
 listLoading=true;listLoaded=false;listNotice='';
 const seq=++listSeq;
 renderList();
 try{
  const response=await fetch('/api/apuracoes',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  const payload=await response.json().catch(()=>null);
  if(seq!==listSeq||!sessionReady())return;
  if(!response.ok)throw Error(response.status===401?'Sessão expirada (HTTP 401).':'Consulta indisponível (HTTP '+response.status+').');
  if(!payload||!Array.isArray(payload.items))throw Error('Formato de retorno não reconhecido.');
  reviews=payload.items.slice(0,50).filter(item=>
   item&&canonical(item.articleUrl)&&canonical(item.evidenceUrl)&&
   typeof item.title==='string'&&item.title.trim().length>=3&&item.title.length<=260&&
   typeof item.finding==='string'&&item.finding.length<=1000&&
   allowed.has(item.status));
  listLoaded=true;listNotice='';
 }catch(error){
  if(seq!==listSeq)return;
  reviews=[];listLoaded=false;listNotice=error.message||'Falha de comunicação com o servidor.';
 }finally{
  if(seq===listSeq){listLoading=false;renderList()}
 }
}
function mount(){
 if(!sessionReady()){
  if(listLoading||listLoaded||reviews.length)resetList();
  renderList();
  return;
 }
 renderList();
 if(!listLoading&&!listLoaded&&!listNotice)void refreshList();
}
document.addEventListener('click',event=>{
 if(event.target.closest?.('#obs360ReviewListRefresh')){
  event.preventDefault();void refreshList();
 }
});
document.addEventListener('change',event=>{
 if(event.target.id!=='obs360ReviewListFilter')return;
 listFilter=['todos','confirmado','inconclusivo','descartado'].includes(event.target.value)?event.target.value:'todos';
 renderList();
});

document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-radar-review]');if(!button)return;
 event.preventDefault();
 open(button.getAttribute('data-radar-review'),button.getAttribute('data-radar-review-title')||'')
 .catch(()=>{if(modal?.open)message('Falha ao abrir a apuração. Nenhum registro foi alterado.')});
});
root.RadarReviewQA={close:()=>{if(modal?.open&&!busy)modal.close()},reset:resetList,mount,refresh:refreshList,isOpen:()=>!!modal?.open};
})(window);
