'use strict';
const {send,verifiedSession,bridge,sameOrigin,form}=require('../lib/obs360-private.cjs');
module.exports=async function handler(req,res){
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,405,{erro:'Método não permitido'});}
 if(req.method==='POST'&&!sameOrigin(req))return send(res,403,{erro:'Origem não autorizada'});
 try{
  const session=await verifiedSession(req);
  if(!session.ok)return send(res,401,{erro:'Sessão privada necessária'});
  let op,payload={sessionHash:session.hash};
  if(req.method==='GET'){
   const url=new URL(req.url||'/api/apuracoes','https://localhost');
   const articleUrl=url.searchParams.get('noticia');
   if(articleUrl&&articleUrl.length>1000)return send(res,400,{erro:'URL inválida'});
   op='reviews';if(articleUrl)payload.articleUrl=articleUrl;
  }else{
   if(!/^application\/json(?:;|$)/i.test(String(req.headers?.['content-type']||'')))
     return send(res,415,{erro:'JSON obrigatório'});
   let body;try{body=form(req)}catch{return send(res,400,{erro:'Registro inválido'});}
   op='save-review';payload={...payload,articleUrl:body.articleUrl,evidenceUrl:body.evidenceUrl,
    title:body.title,finding:body.finding,status:body.status};
  }
  const result=await bridge(op,payload);
  if(result.status===401)return send(res,401,{erro:'Sessão expirada'});
  if(result.status===400)return send(res,400,{erro:'Apuração inválida'});
  if(result.status!==200)return send(res,503,{erro:'Apurações temporariamente indisponíveis'});
  return send(res,200,result.data);
 }catch{return send(res,503,{erro:'Apurações temporariamente indisponíveis'});}
};
