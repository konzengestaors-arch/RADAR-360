'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const session=require('../api/sessao.js'),reviews=require('../api/apuracoes.js');
const cookie='obs360_session='+('c'.repeat(64));
async function execute(handler,{method='GET',path='/api/sessao',withCookie=false,authorized=true,origin=true,body=null,upstreamError=false}={}){
 const savedFetch=global.fetch,savedSecret=process.env.OBS360_PRIVATE_SERVICE_TOKEN,ops=[];
 process.env.OBS360_PRIVATE_SERVICE_TOKEN='a'.repeat(64);
 const headers={host:'qa-observatorio.vercel.app','sec-fetch-site':'same-origin',cookie:withCookie?cookie:''};
 if(origin)headers.origin='https://qa-observatorio.vercel.app';
 if(method==='POST')headers['content-type']='application/json';
 let result='';const responseHeaders={};
 const req={method,url:path,headers,body};
 const res={statusCode:200,setHeader:(k,v)=>{responseHeaders[k.toLowerCase()]=v},end:(v)=>{result=v;return res}};
 global.fetch=async(_url,opts)=>{
  if(upstreamError)throw Error('indisponível');
  const data=JSON.parse(opts.body);ops.push(data.op);
  if(data.op==='check')return Response.json({authenticated:authorized});
  if(data.op==='start')return Response.json({authenticated:true,expiresIn:28800});
  if(data.op==='end')return Response.json({authenticated:false});
  if(data.op==='reviews')return Response.json({items:[]});
  if(data.op==='save-review')return Response.json({item:{status:'inconclusivo',title:data.title,updatedAt:new Date().toISOString()}});
  return Response.json({erro:'Operação inesperada'},{status:400});
 };
 try{await handler(req,res);return {status:res.statusCode,headers:responseHeaders,payload:JSON.parse(result),ops};}
 finally{global.fetch=savedFetch;
  if(savedSecret===undefined)delete process.env.OBS360_PRIVATE_SERVICE_TOKEN;
  else process.env.OBS360_PRIVATE_SERVICE_TOKEN=savedSecret;
 }
}
test('GET sessão anônima retorna false sem consultar banco',async()=>{
 const r=await execute(session);assert.equal(r.status,200);assert.equal(r.payload.authenticated,false);assert.deepEqual(r.ops,[]);
});
test('POST sessão exige origem própria sob HTTPS',async()=>{
 const r=await execute(session,{method:'POST',origin:false,body:{}});
 assert.equal(r.status,403);assert.deepEqual(r.ops,[]);
});
test('POST autenticado pelo SSO cria cookie seguro e persistível no servidor',async()=>{
 const r=await execute(session,{method:'POST',body:{}});
 assert.equal(r.status,200);assert.equal(r.payload.authenticated,true);assert.deepEqual(r.ops,['start']);
 const cookie=r.headers['set-cookie'];assert.match(cookie,/Secure; HttpOnly; SameSite=Strict/);assert.match(cookie,/Max-Age=28800/);
});
test('GET sessão consulta hash do cookie e não devolve segredo',async()=>{
 const r=await execute(session,{withCookie:true});assert.equal(r.status,200);assert.equal(r.payload.authenticated,true);
 assert.deepEqual(r.ops,['check']);assert.doesNotMatch(JSON.stringify(r.payload),/c{64}/);
});
test('DELETE revoga sessão antes de apagar cookie',async()=>{
 const r=await execute(session,{method:'DELETE',withCookie:true});
 assert.equal(r.status,200);assert.equal(r.payload.authenticated,false);assert.deepEqual(r.ops,['end']);assert.match(r.headers['set-cookie'],/Max-Age=0/);
});
test('DELETE falhando na persistência não confirma revogação',async()=>{
 const r=await execute(session,{method:'DELETE',withCookie:true,upstreamError:true});
 assert.equal(r.status,503);assert.equal(r.headers['set-cookie'],undefined);
});
test('GET apurações recusa consulta sem sessão',async()=>{
 const r=await execute(reviews,{path:'/api/apuracoes'});
 assert.equal(r.status,401);assert.deepEqual(r.ops,[]);
});
test('GET apurações permite histórico após validar cookie',async()=>{
 const r=await execute(reviews,{withCookie:true,path:'/api/apuracoes'});
 assert.equal(r.status,200);assert.deepEqual(r.payload.items,[]);assert.deepEqual(r.ops,['check','reviews']);
});
test('POST apurações exige mesma origem e sessão',async()=>{
 const r=await execute(reviews,{method:'POST',withCookie:true,origin:false,body:{}});
 assert.equal(r.status,403);assert.deepEqual(r.ops,[]);
});
test('POST apurações persiste registro validado em banco privado',async()=>{
 const r=await execute(reviews,{method:'POST',withCookie:true,body:{
  articleUrl:'https://example.org/noticia',evidenceUrl:'https://example.org/evidencia',
  title:'Notícia verificada',finding:'Fonte confirma a abertura de uma fábrica.',status:'inconclusivo'
 }});
 assert.equal(r.status,200);assert.deepEqual(r.ops,['check','save-review']);assert.equal(r.payload.item.status,'inconclusivo');
});
