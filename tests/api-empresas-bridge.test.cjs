'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const code=fs.readFileSync('api/empresas.js','utf8');
const load=import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const fakeToken='a'.repeat(64);
const companies=Array.from({length:217},(_,i)=>({
 nome:'Empresa ficticia '+(i+1),cnpj:'',conflito:false
}));

async function exercise({method='GET',token=fakeToken,upstreamStatus=200,body={schema:'observatorio-empresas/1',total:217,items:companies},networkError=false}={}){
 const originalFetch=global.fetch;
 const originalToken=process.env.OBS360_PRIVATE_SERVICE_TOKEN;
 let request=null;
 const headers={};
 let payload='';
 const res={
  statusCode:200,
  setHeader:(key,value)=>{headers[String(key).toLowerCase()]=value},
  end:(text)=>{payload=text;return res}
 };
 if(token===null)delete process.env.OBS360_PRIVATE_SERVICE_TOKEN;
 else process.env.OBS360_PRIVATE_SERVICE_TOKEN=token;
 global.fetch=async (url,opts)=>{
  request={url,method:opts.method,redirect:opts.redirect,headers:Object.keys(opts.headers)};
  if(networkError)throw Error('offline');
  return new Response(JSON.stringify(body),{status:upstreamStatus,headers:{'Content-Type':'application/json'}});
 };
 try{
  const {default:handler}=await load;
  await handler({method},res);
  return {status:res.statusCode,headers,body:JSON.parse(payload),request};
 }finally{
  if(originalToken===undefined)delete process.env.OBS360_PRIVATE_SERVICE_TOKEN;
  else process.env.OBS360_PRIVATE_SERVICE_TOKEN=originalToken;
  global.fetch=originalFetch;
 }
}
test('bloqueia métodos diferentes de GET',async()=>{
 const r=await exercise({method:'POST'});
 assert.equal(r.status,405);assert.equal(r.request,null);
});
test('sem segredo não tenta consultar o banco',async()=>{
 const r=await exercise({token:null});
 assert.equal(r.status,503);assert.equal(r.request,null);
 assert.doesNotMatch(JSON.stringify(r),/observatorio-empresas\/1/);
});
test('recebe 217 registros da ponte e bloqueia cache HTTP',async()=>{
 const r=await exercise();
 assert.equal(r.status,200);assert.equal(r.body.total,217);
 assert.equal(r.body.items.length,217);
 assert.match(r.headers['cache-control'],/no-store/);
 assert.equal(r.request.method,'GET');
 assert.equal(r.request.redirect,'error');
 assert.equal(r.request.headers.includes('x-obs360-internal-token'),true);
 assert.equal(JSON.stringify(r).includes(fakeToken),false);
});
test('fail-closed: dados divergentes não são entregues',async()=>{
 const cases=[
  {schema:'observatorio-empresas/1',total:222,items:companies.concat(companies.slice(0,5))},
  {schema:'observatorio-empresas/1',total:217,items:companies.slice(0,216)},
  {schema:'observatorio-empresas/1',total:217,items:[...companies.slice(0,216),{nome:'Invalida',cnpj:'123',conflito:false}]}
 ];
 for(const body of cases){
  const r=await exercise({body});
  assert.equal(r.status,503);
  assert.equal(r.body.items,undefined);
 }
});
test('falha upstream e timeout ocultam dados e detalhes internos',async()=>{
 for(const scenario of [{upstreamStatus:401},{upstreamStatus:503},{networkError:true}]){
  const r=await exercise(scenario);
  assert.equal(r.status,503);
  assert.equal(r.body.items,undefined);
  assert.equal(JSON.stringify(r.body).includes('SUPABASE'),false);
 }
});