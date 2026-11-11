'use strict';
// Isolated, read-only source probe. Never sends private catalog or user data.
// Run: node scripts/probe-fontes-publicas.cjs
const https = require('node:https');
const sources = [
  {id:'brasilapi', url:'https://brasilapi.com.br/api/cnpj/v1/00000000000191', expected:[200,400,404,422]},
  {id:'gdelt', url:'https://api.gdeltproject.org/api/v2/doc/doc?query=%22energia%20solar%22&mode=artlist&maxrecords=1&format=json', expected:[200,429]}
];
function get(url) {
  return new Promise((resolve,reject)=>{
    const u = new URL(url);
    const req=https.get(u,{timeout:7000,headers:{'User-Agent':'Observatorio360-QA/1.0','Accept':'application/json'}},res=>{
      let bytes=0,body='';
      res.on('data',chunk=>{bytes+=chunk.length;if(bytes<=100000)body+=chunk.toString('utf8');else req.destroy(Error('response_too_large'));});
      res.on('end',()=>resolve({status:res.statusCode,contentType:res.headers['content-type']||'',body}));
    });
    req.on('timeout',()=>req.destroy(Error('timeout')));
    req.on('error',reject);
  });
}
async function run(probe=get){
  const results=[];
  for(const source of sources){
    try{
      const response=await probe(source.url);
      const validType=/json/i.test(response.contentType);
      let json=false;
      try{JSON.parse(response.body);json=true;}catch{}
      const statusExpected=source.expected.includes(response.status);
      const ok=response.status===200&&validType&&json;
      results.push({source:source.id,status:response.status,reachable:statusExpected,usable:ok,contentType:response.contentType,error:ok?null:'not_validated'});
    }catch(e){results.push({source:source.id,status:null,reachable:false,usable:false,error:String(e.message||e).slice(0,100)});}
  }
  return results;
}
module.exports={run,sources};
if(require.main===module)run().then(results=>{console.log(JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));if(results.some(x=>!x.usable))process.exitCode=1;});
