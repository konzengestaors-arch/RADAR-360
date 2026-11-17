'use strict';
const crypto=require('node:crypto');
const {send,token,digest,sameOrigin,bridge,setCookie,verifiedSession}=require('../lib/obs360-private.cjs');
module.exports=async function handler(req,res){
 if(!['GET','POST','DELETE'].includes(req.method)){
  res.setHeader('Allow','GET, POST, DELETE');return send(res,405,{erro:'Método não permitido'});
 }
 if(req.method==='GET'){
  try{const state=await verifiedSession(req);
   return send(res,200,{authenticated:state.ok,configured:true});
  }catch{return send(res,503,{erro:'Sessão indisponível'});}
 }
 if(!sameOrigin(req))return send(res,403,{erro:'Origem não autorizada'});
 if(req.method==='POST'){
  const raw=crypto.randomBytes(32).toString('hex'),sessionHash=digest(raw);
  try{
   const result=await bridge('start',{sessionHash});
   if(result.status!==200||result.data?.authenticated!==true)
    return send(res,503,{erro:'Não foi possível iniciar a sessão'});
   setCookie(res,raw,28800);
   return send(res,200,{authenticated:true,expiresIn:28800});
  }catch{return send(res,503,{erro:'Sessão indisponível'});}
 }
 const raw=token(req);
 if(!raw){setCookie(res,'',0);return send(res,200,{authenticated:false});}
 try{
  const result=await bridge('end',{sessionHash:digest(raw)});
  if(result.status!==200)return send(res,503,{erro:'Não foi possível revogar a sessão'});
  setCookie(res,'',0);
  return send(res,200,{authenticated:false});
 }catch{return send(res,503,{erro:'Revogação indisponível'});}
};
