'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/empresas.js');
const cookie='obs360_session='+('b'.repeat(64));
const items=Array.from({length:217},(_,i)=>({
 nome:'Empresa Fictícia '+String(i+1).padStart(3,'0'),cnpj:i<96?'11222333000181':'',conflito:i<8
}));
const original={schema:'observatorio-empresas/1',total:217,items};
async function run({method='GET',withCookie=true,authorized=true,body=original,upstreamStatus=200,networkError=false,secret='a'.repeat(64)}={}){
 const previousFetch=global.fetch,previousSecret=process.env.OBS360_PRIVATE_SERVICE_TOKEN;
 const ops=[],headers={};let data='';
 const req={method,headers:{host:'qa-example.vercel.app',cookie:withCookie?cookie:''}};
 const res={statusCode:200,setHeader:(k,v)=>{headers[String(k).toLowerCase()]=v},end:(v)=>{data=v;return res}};
 if(secret===null)delete process.env.OBS360_PRIVATE_SERVICE_TOKEN;
 else process.env.OBS360_PRIVATE_SERVICE_TOKEN=secret;
 global.fetch=async (_url,opt)=>{
  if(networkError)throw Error('rede indisponível');
  const payload=JSON.parse(opt.body);ops.push(payload.op);
  if(payload.op==='check')return Response.json({authenticated:authorized});
  if(payload.op==='catalog')return Response.json(body,{status:upstreamStatus});
  return Response.json({erro:'Operação desconhecida'},{status:400});
 };
 try{await handler(req,res);
 return {status:res.statusCode,headers,payload:JSON.parse(data),ops};
 }finally{global.fetch=previousFetch;
  if(previousSecret===undefined)delete process.env.OBS360_PRIVATE_SERVICE_TOKEN;
  else process.env.OBS360_PRIVATE_SERVICE_TOKEN=previousSecret;
 }
}
test('bloqueia método não permitido sem tocar na base',async()=>{
 const r=await run({method:'POST'});assert.equal(r.status,405);assert.deepEqual(r.ops,[]);
});
test('sessão ausente bloqueia catálogo antes de chamar Supabase',async()=>{
 const r=await run({withCookie:false});assert.equal(r.status,401);assert.deepEqual(r.ops,[]);
});
test('cookie arbitrário sem registro no servidor nunca libera catálogo',async()=>{
 const r=await run({authorized:false});assert.equal(r.status,401);assert.deepEqual(r.ops,['check']);
});
test('217 empresas reais exigem sessão validada e não permitem cache',async()=>{
 const r=await run();assert.equal(r.status,200);
 assert.equal(r.payload.total,217);assert.equal(r.payload.items.length,217);
 assert.deepEqual(r.ops,['check','catalog']);assert.match(r.headers['cache-control'],/no-store/);
 assert.doesNotMatch(JSON.stringify(r),/a{64}|b{64}/);
});
test('integridade fail-closed: 216, 222 ou conflito divergente bloqueados',async()=>{
 for(const body of [
  {...original,total:216,items:items.slice(0,216)},
  {...original,total:222,items:items.concat(items.slice(0,5))},
  {...original,items:items.map((x,i)=>({...x,conflito:i<7}))}
 ]){
  const r=await run({body});assert.equal(r.status,503);assert.equal(r.payload.items,undefined);
 }
});
test('ausência de segredo e falha de provedor nunca retornam registros',async()=>{
 for(const options of [{secret:null},{networkError:true},{upstreamStatus:503}]){
  const r=await run(options);assert.equal(r.status,503);assert.equal(r.payload.items,undefined);
 }
});
