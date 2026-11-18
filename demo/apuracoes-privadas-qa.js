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
  document.querySelectorAll('[data-radar-review]').forEach(button=>{
   if(canonical(button.getAttribute('data-radar-review'))===currentUrl)button.textContent='Consultar apuração registrada';
  });
 }catch(e){message(e.message+' Se a gravação foi enviada, reabra a publicação para verificar antes de repetir.')}
 finally{busy=false;if(modal?.open&&sessionReady())form.querySelector('#obs360ReviewSave').disabled=false}
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-radar-review]');if(!button)return;
 event.preventDefault();
 open(button.getAttribute('data-radar-review'),button.getAttribute('data-radar-review-title')||'')
 .catch(()=>{if(modal?.open)message('Falha ao abrir a apuração. Nenhum registro foi alterado.')});
});
root.RadarReviewQA={close:()=>{if(modal?.open&&!busy)modal.close()},isOpen:()=>!!modal?.open};
})(window);
