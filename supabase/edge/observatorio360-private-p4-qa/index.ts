import postgres from 'npm:postgres@3.4.3';

const EXPECTED_DIGEST = '8d06061f880d91fd8b0b12003164af19f1aaf4d2e81721383c0c8664615ca324';
const dbUrl = Deno.env.get('SUPABASE_DB_URL');
if (!dbUrl) throw Error('Backend privado não configurado');
const db = postgres(dbUrl, { max: 2, prepare: false, idle_timeout: 8, connect_timeout: 8 });

const HEADERS = { 'Cache-Control':'private, no-store, max-age=0', 'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer', 'Content-Security-Policy':"default-src 'none'" };
const reply = (status: number, body: unknown) => Response.json(body,{status,headers:HEADERS});
const hash = async (v:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(v)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const isHash = (v:unknown):v is string => typeof v==='string' && /^[a-f0-9]{64}$/.test(v);

async function internal(req:Request):Promise<boolean> {
 const token=req.headers.get('x-obs360-internal-token')||'';
 if(!isHash(token))return false;
 const actual=await hash(token);
 let bad=0;
 for(let i=0;i<64;i++)bad|=actual.charCodeAt(i)^EXPECTED_DIGEST.charCodeAt(i);
 return bad===0;
}
async function active(sessionHash:unknown):Promise<boolean>{
 if(!isHash(sessionHash))return false;
 const result=await db`select exists(select 1 from observatorio360.sessoes
   where token_sha256=${sessionHash} and expira_em>now()) as ok`;
 return result[0]?.ok===true;
}
function canonical(value:unknown):string {
 if(typeof value!=='string'||value.length>1000)throw Error('URL inválida');
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password)throw Error('URL inválida');
 url.hash='';
 if(url.href.length>1000)throw Error('URL longa');
 return url.href;
}
function text(value:unknown,min:number,max:number):string {
 if(typeof value!=='string')throw Error('Texto inválido');
 const trimmed=value.trim();
 if(trimmed.length<min||trimmed.length>max)throw Error('Texto inválido');
 return trimmed;
}
function asReview(row:any){
 return {articleUrl:row.artigo_url,evidenceUrl:row.evidencia_url,title:row.titulo,
   finding:row.constatacao,status:row.status,updatedAt:new Date(row.atualizado_em).toISOString()};
}

Deno.serve(async(req:Request)=>{
 if(!(await internal(req)))return reply(401,{erro:'Não autorizado'});
 if(req.method!=='POST')return reply(405,{erro:'Método não permitido'});
 const contentType=req.headers.get('content-type')||'';
 if(!contentType.toLowerCase().startsWith('application/json'))return reply(415,{erro:'JSON obrigatório'});
 let data:any;
 try{const raw=await req.text();if(raw.length>12288)return reply(413,{erro:'Solicitação excessiva'});
   data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('JSON');
 }catch{return reply(400,{erro:'Corpo inválido'});}
 const op=data.op;
 try{
   if(op==='start'){
     if(!isHash(data.sessionHash))return reply(400,{erro:'Identificador inválido'});
     await db`delete from observatorio360.sessoes where expira_em<now()`;
     const count=await db`select count(*)::int as total from observatorio360.sessoes`;
     if(count[0].total>=200)return reply(429,{erro:'Limite de sessões privadas'});
     await db`insert into observatorio360.sessoes(token_sha256,expira_em)
       values(${data.sessionHash},now()+interval '8 hours') on conflict (token_sha256) do nothing`;
     return reply(200,{authenticated:true,expiresIn:28800});
   }
   if(op==='check')return reply(200,{authenticated:await active(data.sessionHash)});
   if(op==='end'){
     if(!isHash(data.sessionHash))return reply(400,{erro:'Sessão inválida'});
     await db`delete from observatorio360.sessoes where token_sha256=${data.sessionHash}`;
     return reply(200,{authenticated:false});
   }
   if(!await active(data.sessionHash))return reply(401,{erro:'Sessão privada expirada ou inválida'});
   if(op==='catalog'){
     const items=await db`select nome,cnpj,conflito,"motivoConferencia","validadeMatematicaCnpj"
       from observatorio360.empresas_api order by posicao limit 218`;
     if(items.length!==217||items.filter(x=>x.conflito).length!==8)
       return reply(503,{erro:'Contagem/integridade inválida'});
     return reply(200,{schema:'observatorio-empresas/1',total:217,items});
   }
   if(op==='reviews'){
     if(data.articleUrl){
       const url=canonical(data.articleUrl);
       const key=await hash(url);
       const rows=await db`select * from observatorio360.apuracoes where artigo_sha256=${key} limit 1`;
       return reply(200,{item:rows.length?asReview(rows[0]):null});
     }
     const rows=await db`select * from observatorio360.apuracoes order by atualizado_em desc limit 50`;
     return reply(200,{items:rows.map(asReview)});
   }
   if(op==='save-review'){
     let articleUrl,evidenceUrl,title,finding;
     try{
       articleUrl=canonical(data.articleUrl);evidenceUrl=canonical(data.evidenceUrl);
       title=text(data.title,3,260);finding=text(data.finding,12,1000);
     }catch{return reply(400,{erro:'Apuração inválida'});}
     if(!['confirmado','inconclusivo','descartado'].includes(data.status))
       return reply(400,{erro:'Situação inválida'});
     const key=await hash(articleUrl);
     const rows=await db`insert into observatorio360.apuracoes(
       artigo_sha256,artigo_url,evidencia_url,titulo,constatacao,status,atualizado_em)
       values(${key},${articleUrl},${evidenceUrl},${title},${finding},${data.status},now())
       on conflict (artigo_sha256) do update set
       evidencia_url=excluded.evidencia_url,titulo=excluded.titulo,
       constatacao=excluded.constatacao,status=excluded.status,atualizado_em=now()
       returning *`;
     return reply(200,{item:asReview(rows[0])});
   }
   return reply(404,{erro:'Operação inexistente'});
 }catch{return reply(503,{erro:'Serviço privado temporariamente indisponível'});}
});
