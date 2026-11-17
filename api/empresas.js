'use strict';
const {send,verifiedSession,bridge}=require('../lib/obs360-private.cjs');
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{erro:'Método não permitido'});}
 try{
  const session=await verifiedSession(req);
  if(!session.ok)return send(res,401,{erro:'Sessão privada necessária'});
  const result=await bridge('catalog',{sessionHash:session.hash});
  if(result.status===401)return send(res,401,{erro:'Sessão expirada'});
  if(result.status!==200)return send(res,503,{erro:'Catálogo privado indisponível'});
  const body=result.data;
  if(body?.schema!=='observatorio-empresas/1'||body?.total!==217||
   !Array.isArray(body.items)||body.items.length!==217||
   body.items.some(x=>!x||typeof x.nome!=='string'||x.nome.length<3||x.nome.length>300||
   typeof x.cnpj!=='string'||!/^([0-9]{14})?$/.test(x.cnpj)||typeof x.conflito!=='boolean')||
   body.items.filter(x=>x.conflito).length!==8||body.items.filter(x=>x.cnpj).length!==96)
    return send(res,503,{erro:'Integridade do catálogo não confirmada'});
  return send(res,200,body);
 }catch{return send(res,503,{erro:'Consulta privada temporariamente indisponível'});}
};
