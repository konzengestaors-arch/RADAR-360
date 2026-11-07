'use strict';
/* Gate remoto anônimo: não enviar cookies, Authorization, token ou bypass.
   Não comprova Android físico, autorização interna ou SSO específico. */
const ORIGIN='https://radar-360-homologacao-isolada-jinrno2qd-konzengestaors-2191.vercel.app';
const ROUTES=['/','/comercial.html','/observatorio.html','/api/noticias'];
function classification(status,location){
  if(status===200)return 'PUBLICO_INESPERADO';
  if(status===401||status===403)return 'ACESSO_NEGADO';
  if(status>=300&&status<400){
    if(!location)return 'REDIRECIONAMENTO_SEM_DESTINO';
    try{
      const u=new URL(location,ORIGIN);
      if(/(^|\.)(vercel\.com|vercel\.app)$/i.test(u.hostname)&&/(login|sso|authentication|auth)/i.test(u.pathname+u.search))
        return 'REDIRECIONAMENTO_AUTENTICACAO';
      return 'REDIRECIONAMENTO_NAO_CLASSIFICADO';
    }catch{return 'REDIRECIONAMENTO_INVALIDO'}
  }
  return 'INCONCLUSIVO';
}
async function main(){
 const output=[];
 for(const route of ROUTES){
   try{
     const response=await fetch(ORIGIN+route,{method:'GET',redirect:'manual',
       headers:{Accept:route==='/api/noticias'?'application/json':'text/html'},
       signal:AbortSignal.timeout(12000)});
     const location=response.headers.get('location');
     const outcome=classification(response.status,location);
     let redirectHost=null;
     if(location){try{redirectHost=new URL(location,ORIGIN).hostname}catch{}}
     output.push({route,http:response.status,outcome,redirectHost});
   }catch(error){output.push({route,http:null,outcome:'ERRO_REDE',error:String(error?.name||'error').slice(0,80)})}
 }
 console.log(JSON.stringify({origin:ORIGIN,checkedAt:new Date().toISOString(),results:output},null,2));
 const allBlocked=output.every(x=>x.outcome==='ACESSO_NEGADO'||x.outcome==='REDIRECIONAMENTO_AUTENTICACAO');
 if(!allBlocked){console.error('GATE P0 NÃO COMPROVADO: resposta pública, redirecionamento não autenticado ou falha de rede.');process.exitCode=1}
 else console.log('GATE REMOTO: bloqueio anônimo observado nas quatro rotas. Não comprova controle por usuário.');
}
main().catch(e=>{console.error('GATE INTERROMPIDO',e.name);process.exitCode=1});
