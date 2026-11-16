// Observatório 360 — ponte privada QA (sem catálogo nem credenciais no repositório).
// Este endpoint deve ser servido apenas por deployment protegido por Vercel Authentication.
const ENDPOINT='https://dulbmxowopxahvfgswou.supabase.co/functions/v1/observatorio360-bridge-qa';
function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  return res.end(JSON.stringify(body));
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{erro:'Método não permitido'});}
  const token=process.env.OBS360_PRIVATE_SERVICE_TOKEN;
  if(!token||!/^[a-f0-9]{64}$/.test(token))return send(res,503,{erro:'Integração privada não configurada'});
  try{
    const response=await fetch(ENDPOINT,{
      method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{'x-obs360-internal-token':token,'Accept':'application/json'}
    });
    if(!response.ok)return send(res,503,{erro:'Catálogo privado temporariamente indisponível'});
    const length=Number(response.headers.get('content-length')||0);
    if(length>200000)return send(res,503,{erro:'Resposta acima do limite'});
    const raw=await response.text();
    if(Buffer.byteLength(raw,'utf8')>200000)return send(res,503,{erro:'Resposta acima do limite'});
    const payload=JSON.parse(raw);
    if(payload.schema!=='observatorio-empresas/1'||payload.total!==217||
        !Array.isArray(payload.items)||payload.items.length!==217||
        payload.items.some(x=>!x||typeof x.nome!=='string'||x.nome.length<3||x.nome.length>300||
        typeof x.cnpj!=='string'||!/^([0-9]{14})?$/.test(x.cnpj)||
        typeof x.conflito!=='boolean')){
      return send(res,503,{erro:'Integridade do catálogo não confirmada'});
    }
    return send(res,200,{schema:payload.schema,total:217,items:payload.items});
  }catch{return send(res,503,{erro:'Falha de consulta à base privada'});}
}
