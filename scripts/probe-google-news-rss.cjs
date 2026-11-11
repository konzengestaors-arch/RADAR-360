'use strict';
const {buildGoogleNewsUrl,parseGoogleNewsRss}=require('../experiments/axiom/google-news-rss.cjs');
(async()=>{
 const result={source:'google-news-rss',status:null,reachable:false,usable:false,items:0,error:null};
 try{
  const response=await fetch(buildGoogleNewsUrl('energia solar'),{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Observatorio360-QA/1.0'}});
  result.status=response.status;result.reachable=true;
  if(!response.ok)throw Error('http_'+response.status);
  const contentType=response.headers.get('content-type')||'';
  if(!/(xml|rss)/i.test(contentType))throw Error('unexpected_content_type');
  const length=Number(response.headers.get('content-length')||0);
  if(length>120000)throw Error('response_too_large');
  const text=await response.text();
  const items=parseGoogleNewsRss(text);
  result.items=items.length;result.usable=items.length>0;
  if(!result.usable)result.error='empty_feed';
 }catch(e){result.error=String(e.message||e).slice(0,120);}
 console.log(JSON.stringify(result,null,2));
 if(!result.usable)process.exitCode=1;
})();
