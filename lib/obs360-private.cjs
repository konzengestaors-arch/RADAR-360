'use strict';
const crypto=require('node:crypto');
const ENDPOINT='https://dulbmxowopxahvfgswou.supabase.co/functions/v1/observatorio360-private-p4-qa';
const COOKIE='obs360_session';
function send(res,status,body){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Vary','Cookie');
 return res.end(JSON.stringify(body));
}
function token(req){
 const m=String(req.headers?.cookie||'').match(/(?:^|;\s*)obs360_session=([a-f0-9]{64})(?:;|$)/);
 return m?.[1]||'';
}
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
function sameOrigin(req){
 const host=String(req.headers?.host||'').toLowerCase();
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/.test(host))return false;
 return req.headers?.origin==='https://'+host&&
  (!req.headers['sec-fetch-site']||req.headers['sec-fetch-site']==='same-origin');
}
function form(req){
 const val=req.body;
 if(typeof val==='string'){if(Buffer.byteLength(val)>8192)throw Error('Tamanho');return JSON.parse(val)}
 if(Buffer.isBuffer(val)){if(val.byteLength>8192)throw Error('Tamanho');return JSON.parse(val.toString('utf8'))}
 if(!val||typeof val!=='object'||Array.isArray(val))throw Error('JSON');
 if(Buffer.byteLength(JSON.stringify(val))>8192)throw Error('Tamanho');
 return val;
}
async function bridge(op,properties={}){
 const secret=process.env.OBS360_PRIVATE_SERVICE_TOKEN;
 if(!/^[a-f0-9]{64}$/.test(secret||''))throw Error('Configuração ausente');
 const body=JSON.stringify({op,...properties});
 const result=await fetch(ENDPOINT,{method:'POST',redirect:'error',
  signal:AbortSignal.timeout(9000),headers:{
  'Content-Type':'application/json','Accept':'application/json',
  'x-obs360-internal-token':secret},body});
 const len=Number(result.headers.get('content-length')||0);
 if(len>220000)throw Error('Resposta excessiva');
 const response=await result.text();
 if(Buffer.byteLength(response)>220000)throw Error('Resposta excessiva');
 let data;try{data=JSON.parse(response)}catch{throw Error('Formato de resposta')};
 return {status:result.status,data};
}
function setCookie(res,value,age){
 res.setHeader('Set-Cookie',COOKIE+'='+value+
  '; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age='+age);
}
async function verifiedSession(req){
 const raw=token(req);
 if(!raw)return {ok:false,hash:''};
 const sessionHash=digest(raw);
 const result=await bridge('check',{sessionHash});
 return {ok:result.status===200&&result.data?.authenticated===true,hash:sessionHash};
}
module.exports={send,token,digest,sameOrigin,form,bridge,setCookie,verifiedSession};
