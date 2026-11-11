'use strict';
// Public-only diagnostic. No private company names, cookies or credentials.
const {buildGoogleNewsUrl,parseGoogleNewsRss}=require('../experiments/axiom/google-news-rss.cjs');
const MAX_BYTES=Math.min(256*1024,Math.max(1024,Number(process.env.GOOGLE_RSS_MAX_BYTES)||256*1024));
async function limitedText(response){
 const reader=response.body.getReader();const chunks=[];let bytes=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES)throw Error('response_too_large');chunks.push(value)}}
 catch(e){await reader.cancel().catch(()=>{});throw e}
 finally{reader.releaseLock()}
 return {body:new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks.map(x=>Buffer.from(x)))),bytes};
}
(async()=>{
 const result={source:'google-news-rss',status:null,reachable:false,usable:false,items:0,error:null,contentType:null,finalHost:null,redirected:false,format:null,bytes:null};
 try{
  const requested=buildGoogleNewsUrl('energia solar');
  const response=await fetch(requested,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/rss+xml,application/xml;q=0.9,text/xml;q=0.8','User-Agent':'Observatorio360-QA/1.0'}});
  result.status=response.status;result.reachable=true;
  const final=new URL(response.url);result.finalHost=final.hostname;result.redirected=response.redirected;
  result.contentType=response.headers.get('content-type')||'';
  if(final.protocol!=='https:'||final.hostname!=='news.google.com')throw Error('unexpected_redirect_host');
  if(!response.ok)throw Error('http_'+response.status);
  const length=Number(response.headers.get('content-length')||0);
  if(length>MAX_BYTES)throw Error('response_too_large');
  const data=await limitedText(response);const body=data.body;result.bytes=data.bytes;
  const head=body.replace(/^\uFEFF/,'').trimStart().slice(0,500);
  result.format=/<(?:\?xml\b|rss\b|rdf:RDF\b|feed\b)/i.test(head)?'xml':/^<(?:!doctype\s+html|html\b)/i.test(head)?'html':'other';
  if(result.format==='html')throw Error('html_instead_of_rss');
  if(result.format!=='xml')throw Error('non_xml_response');
  if(!/<rss\b/i.test(body)||!/<channel\b/i.test(body)||!/<\/rss\s*>/i.test(body))throw Error('invalid_rss_structure');
  if(!/(xml|rss)/i.test(result.contentType))throw Error('unexpected_content_type');
  const items=parseGoogleNewsRss(body.replace(/^\uFEFF/,''));
  result.items=items.length;result.usable=items.length>0;
  if(!result.usable)result.error='empty_feed';
 }catch(e){result.error=String(e.message||e).slice(0,120);}
 console.log(JSON.stringify(result,null,2));
 if(!result.usable)process.exitCode=1;
})();
