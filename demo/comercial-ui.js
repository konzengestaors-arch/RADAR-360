'use strict';
(function(){
 const $ = id => document.getElementById(id);
 let state=initialState();
 let readonly=false;
 let expectedStored=null;
 try{
   const raw=localStorage.getItem(STORAGE_KEY);
   expectedStored=raw;
   if(raw){const candidate=JSON.parse(raw);validate(candidate);state=candidate;}
   else {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));expectedStored=JSON.stringify(state);}
 }catch(e){
   readonly=true;
   document.querySelector('.notice').textContent='Armazenamento local indisponível ou inválido. Modo somente leitura: nenhum registro será salvo. Não limpe os dados originais.';
 }
 function cell(row,text){
   const c=document.createElement('td');c.textContent=text;row.append(c);return c;
 }
 function render(){
   const sum=summary(state);
   $('numEmpresas').textContent=sum.empresas;
   $('numAcoes').textContent=sum.acoes;
   $('numRegioes').textContent=sum.regioes;
   const list=filterCompanies(state,{busca:$('busca').value,regiao:$('regiao').value});
   $('empresas').replaceChildren();
   for(const e of list){
     const tr=document.createElement('tr');
     cell(tr,e.nome);cell(tr,e.segmento);cell(tr,e.regiao);cell(tr,e.etapa);cell(tr,e.proximaAcao);
     const t=document.createElement('td'),b=document.createElement('button');
     b.type='button';b.textContent='Registrar ação';b.addEventListener('click',()=>{$('empresaId').value=e.id;$('descricao').focus()});
     t.append(b);tr.append(t);$('empresas').append(tr);
   }
   $('empresaId').replaceChildren();
   for(const e of state.empresas){
     const option=document.createElement('option');
     option.value=e.id;option.textContent=e.nome;$('empresaId').append(option);
   }
   $('acoes').replaceChildren();
   for(const a of state.acoes){
     const li=document.createElement('li');
     const empresa=state.empresas.find(e=>e.id===a.empresaId);
     li.textContent=a.data+' — '+empresa.nome+': '+a.descricao;
     $('acoes').append(li);
   }
   $('oppEmpresa').replaceChildren();
   for(const e of state.empresas){const o=document.createElement('option');o.value=e.id;o.textContent=e.nome;$('oppEmpresa').append(o)}
   const opportunities=state.oportunidades||[];
   $('oppCount').textContent=opportunities.length+' oportunidades fictícias';
   $('oppList').replaceChildren();
   for(const opp of opportunities){
     const article=document.createElement('article');article.className='opp-card';
     const company=state.empresas.find(e=>e.id===opp.empresaId);
     const h=document.createElement('h3');h.textContent=opp.titulo+' — '+company.nome;article.append(h);
     const status=document.createElement('p');status.textContent='Etapa atual: '+opp.status;article.append(status);
     const history=document.createElement('ol');
     for(const entry of opp.historico){const li=document.createElement('li');li.textContent=entry.data+' · '+entry.status+' · '+entry.motivo;history.append(li)}
     article.append(history);
     const controls=document.createElement('div');controls.className='opp-controls';
     const select=document.createElement('select');select.setAttribute('aria-label','Nova etapa de '+opp.titulo);
     for(const name of ['Identificada','Qualificação','Proposta','Concluída','Descartada']){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option)}
     select.value=opp.status;
     const date=document.createElement('input');date.type='date';date.value=new Date().toISOString().slice(0,10);date.setAttribute('aria-label','Data da alteração');
     const reason=document.createElement('input');reason.maxLength=250;reason.placeholder='Justificativa sintética';reason.setAttribute('aria-label','Justificativa');
     const btn=document.createElement('button');btn.type='button';btn.textContent='Atualizar etapa';btn.disabled=readonly;
     btn.addEventListener('click',()=>{
       try{saveVerified(changeOpportunity(state,opp.id,select.value,date.value,reason.value.trim()))}
       catch(error){document.querySelector('.notice').textContent='Atualização rejeitada: '+error.message}
     });
     controls.append(select,date,reason,btn);article.append(controls);$('oppList').append(article);
   }
   $('acaoForm').querySelector('button[type=submit]').disabled=readonly;
   $('oppForm').querySelector('button[type=submit]').disabled=readonly;
 }
 $('busca').addEventListener('input',render);
 $('regiao').addEventListener('change',render);
 $('acaoForm').addEventListener('submit',event=>{
   event.preventDefault();
   if(readonly)return;
   try{
     const next=addAction(state,$('empresaId').value,$('descricao').value.trim(),$('data').value);
     saveVerified(next);
     $('descricao').value='';
     render();
   }catch(error){
     document.querySelector('.notice').textContent='Salvamento NÃO confirmado: '+error.message;
   }
 });
 function saveVerified(candidate){
   validate(candidate);
   const serialized=JSON.stringify(candidate);
   if(localStorage.getItem(STORAGE_KEY)!==expectedStored)throw Error('Base alterada em outra aba. Recarregue antes de salvar ou restaurar.');
   localStorage.setItem(STORAGE_KEY,serialized);
   if(localStorage.getItem(STORAGE_KEY)!==serialized)throw Error('Leitura divergente após gravação');
   expectedStored=serialized;
   state=clone(candidate);
   readonly=false;
   render();
 }
 $('import').addEventListener('click',()=>$('backupFile').click());
 $('backupFile').addEventListener('change',async event=>{
   const file=event.target.files?.[0];
   if(!file)return;
   const notice=document.querySelector('.notice');
   try{
     if(file.size>1024*1024)throw Error('Backup excede o limite de 1 MB');
     const parsed=JSON.parse(await file.text());
     validate(parsed);
     if(parsed.origem!=='dados 100% sintéticos'||parsed.empresas.some(x=>!x.nome.startsWith('Empresa Exemplo ')))
       throw Error('Apenas a base sintética do laboratório pode ser restaurada');
     if(!confirm('Restaurar '+parsed.empresas.length+' empresas fictícias e '+parsed.acoes.length+' ações? Os dados atuais serão substituídos. Exporte um backup primeiro.'))return;
     saveVerified(parsed);
     notice.textContent='Backup sintético restaurado e gravação confirmada neste navegador. Não utilize dados confidenciais.';
   }catch(error){
     notice.textContent='Restauração rejeitada: '+error.message+'. A base atual não foi substituída.';
   }finally{
     event.target.value='';
   }
 });
 $('oppForm').addEventListener('submit',event=>{
   event.preventDefault();if(readonly)return;
   try{
     saveVerified(addOpportunity(state,$('oppEmpresa').value,$('oppTitulo').value.trim(),$('oppData').value));
     $('oppTitulo').value='';
   }catch(error){document.querySelector('.notice').textContent='Cadastro rejeitado: '+error.message}
 });
 $('export').addEventListener('click',()=>{
   const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='RADAR_COMERCIAL_DEMO_SINTETICO.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),2000);
 });
 render();
})();
