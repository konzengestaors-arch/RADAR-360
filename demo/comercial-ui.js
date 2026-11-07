'use strict';
(function(){
 const $ = id => document.getElementById(id);
 let state=initialState();
 let readonly=false;
 try{
   const raw=localStorage.getItem(STORAGE_KEY);
   if(raw){const candidate=JSON.parse(raw);validate(candidate);state=candidate;}
   else localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
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
   $('acaoForm').querySelector('button[type=submit]').disabled=readonly;
 }
 $('busca').addEventListener('input',render);
 $('regiao').addEventListener('change',render);
 $('acaoForm').addEventListener('submit',event=>{
   event.preventDefault();
   if(readonly)return;
   try{
     const next=addAction(state,$('empresaId').value,$('descricao').value.trim(),$('data').value);
     const text=JSON.stringify(next);
     localStorage.setItem(STORAGE_KEY,text);
     if(localStorage.getItem(STORAGE_KEY)!==text)throw Error('Gravação não confirmada');
     state=next;
     $('descricao').value='';
     render();
   }catch(error){
     document.querySelector('.notice').textContent='Salvamento NÃO confirmado: '+error.message;
   }
 });
 function saveVerified(candidate){
   validate(candidate);
   const serialized=JSON.stringify(candidate);
   localStorage.setItem(STORAGE_KEY,serialized);
   if(localStorage.getItem(STORAGE_KEY)!==serialized)throw Error('Leitura divergente após gravação');
   state=clone(candidate);
   readonly=false;
   $('busca').value='';
   $('regiao').value='';
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
 $('export').addEventListener('click',()=>{
   const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='RADAR_COMERCIAL_DEMO_SINTETICO.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),2000);
 });
 render();
})();
