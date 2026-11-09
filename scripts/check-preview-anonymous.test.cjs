'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'check-preview-anonymous.cjs'),'utf8');
const origin='https://radar-360-homologacao-isolada-mkhia0b54-konzengestaors-2191.vercel.app';
async function run({url=origin,status=401,location='',networkError=false}={}){
 const lines=[],requested=[],proc={env:{PREVIEW_ORIGIN:url},exitCode:undefined,exit(n){throw Error('EXIT:'+n)}};
 const ctx={process:proc,URL,AbortSignal,console:{log:(...x)=>lines.push(x.join(' ')),error:(...x)=>lines.push(x.join(' '))},fetch:async (u,opts)=>{requested.push({url:u,opts});if(networkError)throw Error('network');return {status,headers:{get:()=>location}};}};
 try{vm.runInNewContext(script,ctx,{filename:'check-preview-anonymous.cjs'});}catch(e){return {error:e.message,requested,lines,exitCode:proc.exitCode};}
 await new Promise(resolve=>setImmediate(resolve));
 return {requested,lines,exitCode:proc.exitCode};
}
test('rejeita origem ausente',async()=>{const r=await run({url:''});assert.equal(r.error,'EXIT:2');assert.equal(r.requested.length,0)});
test('rejeita HTTP e domínio externo',async()=>{for(const url of ['http://example.vercel.app','https://example.com']){const r=await run({url});assert.equal(r.error,'EXIT:2');assert.equal(r.requested.length,0)}});
test('cinco rotas bloqueadas aprovam sem credenciais',async()=>{const r=await run();assert.equal(r.exitCode,undefined);assert.equal(r.requested.length,5);assert.ok(r.requested.every(x=>x.opts.redirect==='manual'&&x.opts.credentials==='omit'))});
test('rota pública falha fechado',async()=>{const r=await run({status:200});assert.equal(r.exitCode,1)});
test('erro de rede não é confundido com bloqueio',async()=>{const r=await run({networkError:true});assert.equal(r.exitCode,1)});
test('redirecionamento não autenticador falha',async()=>{const r=await run({status:302,location:'https://example.vercel.app/home'});assert.equal(r.exitCode,1)});
test('redirecionamento para login Vercel é bloqueio',async()=>{const r=await run({status:302,location:'https://vercel.com/login'});assert.equal(r.exitCode,undefined)});
