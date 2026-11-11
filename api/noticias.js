/* RADAR Observatório v1.9 — coletor RSS sob demanda. Sem dados privados, sem cron,
   sem scraping de páginas HTML e sem URLs fornecidas pelo cliente. */
const {buildGoogleNewsUrl,parseGoogleNewsRss}=require('../experiments/axiom/google-news-rss.cjs');
const GOOGLE_FEED={id:'google-news-economia',nome:'Google Notícias · Economia e investimentos',url:buildGoogleNewsUrl('investimento industria Rio Grande do Sul'),area:'RS'};
async function requestGoogleNews(feed,fetcher){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const r=await fetcher(feed.url,{signal:controller.signal,redirect:'manual',headers:{Accept:'application/rss+xml,application/xml,text/xml;q=0.9','User-Agent':'RADAR-Observatorio/1.9 RSS reader'}});
  if(r.status>=300&&r.status<400)throw Error('Redirecionamento não autorizado');
  if(!r.ok)throw Error('HTTP '+r.status);
  const ct=r.headers.get('content-type')||'';if(!/(?:xml|rss)/i.test(ct))throw Error('Tipo de conteúdo incompatível');
  if(Number(r.headers.get('content-length')||0)>262144)throw Error('Feed muito grande');
  const reader=r.body.getReader(),chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)throw Error('Feed muito grande');chunks.push(Buffer.from(value))}}
  catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
  const xml=Buffer.concat(chunks).toString('utf8');
  if(!/<\/rss\s*>/i.test(xml))throw Error('XML RSS incompleto');
  const parsed=parseGoogleNewsRss(xml);const selected=[];
  for(const item of parsed){if(!item.publishedAt)continue;const classification=classify(feed,item.title);if(!classification)continue;
   const url=safeUrl(item.link);if(!url||new URL(url).hostname!=='news.google.com')continue;
   selected.push({titulo:item.title.slice(0,260),url,publicadoEm:item.publishedAt.slice(0,10),fonte:feed.nome,territorio:classification.territorio,setor:classification.setor,resumo:'Sugestão do Google Notícias baseada em título e metadados RSS; não verificada documentalmente. Consulte a publicação original antes de associar a uma empresa.'});
  }
  return selected;
 }finally{clearTimeout(timer)}
}
const FEEDS = Object.freeze([
  {id:'ebc-economia',nome:'Agência Brasil · Economia',url:'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',area:'Brasil'},
  {id:'g1-rs',nome:'g1 · Rio Grande do Sul',url:'https://g1.globo.com/rss/g1/rs/rio-grande-do-sul/',area:'RS'},
  {id:'g1-sc',nome:'g1 · Santa Catarina',url:'https://g1.globo.com/rss/g1/sc/santa-catarina/',area:'SC'},
  // Endpoint JSON usado pela Agência BNDES em sua página oficial, não um RSS público.
  {id:'bndes-investimentos',nome:'Agência BNDES · Comunicados',url:'https://agenciadenoticias.bndes.gov.br/misc/ultimasRestWebService/',area:'Brasil',kind:'json'},
  // Feed público do BRDE. Por abranger também o Paraná, só aceitar títulos que citem explicitamente nossas regiões-alvo.
  {id:'brde-regional',nome:'BRDE · Notícias regionais',url:'https://brde.com.br/feed/',area:'Sul'}
]);
const HOT=/\b(investiment\w*|economi\w*|empreg\w*|ind[uú]stria\w*|f[aá]brica\w*|produ[cç][aã]o|exporta\w*|importa\w*|portos?|aeroport\w*|obras?|rodovi\w*|ferrovi\w*|energia|usinas?|licita[cç][aã]o|concess[aã]o|pib|infla[cç][aã]o|juros?|selic|c[aâ]mbio|d[oó]lar|euro|agroind[uú]stria|safra|cooperativ\w*|com[eé]rcio|log[ií]stica|infraestrutur\w*|enchent\w*|inunda[cç][aã]o|temporal|tornado|chuvas?|cr[aá]tera|desabastec\w*|bloqueio|interdi[cç][aã]o|financiam\w*|cr[eé]dito|brde|bndes|fiesc|desenvolv\w*|min[eé]ri\w*|minera[cç][aã]o)\b/i;
const SC_W=/\b(chapec[oó]|xanxer[eê]|conc[oó]rdia|s[aã]o miguel do oeste|s[aã]o louren[cç]o do oeste|maravilha|s[aã]o carlos|pinhalzinho|palmitos|s[aã]o domingos|descanso|s[aã]o jos[eé] do cedro|s[aã]o miguel da boa vista|itapiranga|cordilheira alta|saudades|abelardo luz|ponte serrada|s[aã]o jo[aã]o do oeste|imbituba|laguna|tubar[aã]o|garopaba|arangu[aá]|sombrio|balne[aá]rio gaivota|passo de torres|jaguaruna|crici[uú]ma|i[cç]ara|urussanga|orleans|s[aã]o ludgero|porto belo|sul catarinense|oeste catarinense|oeste de (?:sc|santa catarina)|litoral sul|extremo sul|sul de santa catarina)\b/i;
const SC_S=/\b(imbituba|laguna|tubar[aã]o|garopaba|arangu[aá]|sombrio|balne[aá]rio gaivota|passo de torres|jaguaruna|crici[uú]ma|i[cç]ara|urussanga|orleans|s[aã]o ludgero|litoral sul|extremo sul|sul de santa catarina)\b/i;
const RS_W=/\b(rio grande do sul|ga[uú]ch\w*|porto alegre|caxias do sul|canoas|rio grande|pelotas|santa maria|bento gon[cç]alves|passo fundo|lajeado|encantado|taquari|gramado|novo hamburgo)\b/i;
const NATIONAL=/\b(pib|infla[cç][aã]o|selic|juros?|d[oó]lar|c[aâ]mbio|banco central|ibge|caged|bolsa|ibovespa|com[eé]rcio exterior|exporta[cç][aã]o|min[eé]ri\w*|minera[cç][aã]o|economia brasileira|crescimento econ[oô]mico)\b/i;
const unescapeXML=(value)=>String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&(amp|lt|gt|quot|apos|nbsp);|&#(x[0-9a-f]+|\d+);/gi,(s,n,num)=>{if(num){const k=num[0].toLowerCase()==='x'?parseInt(num.slice(1),16):parseInt(num,10);return k>31&&k<0x110000?String.fromCodePoint(k):' '}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[n?.toLowerCase()]||s}).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function tag(xml,t){let m=xml.match(new RegExp('<(?:[a-z0-9_-]+:)?'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-z0-9_-]+:)?'+t+'>','i'));return unescapeXML(m?.[1]||'')}
function safeUrl(s){try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password)return '';u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|igshid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);return u.toString()}catch{return ''}}
function classify(feed,text){text=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/\b(previsao do tempo|previsao meteorologica|horoscopo|lot[eé]ria|sorteio)\b/i.test(text))return null;
 if(/\b(ex-zagueiro|ex-jogador|futebol|jogador|pris[aã]o|preso|presos|policial|policia|pensao alimenticia|perseguicao policial|abordagem policial)\b/i.test(text))return null;
 // Não interpretar a cidade Porto Alegre como porto marítimo.
 const topical=text.replace(/\bporto alegre\b/gi,'cidade gaúcha');
 const impact=/\b(aeroporto\w*|voos? suspens\w*|rodovi\w*|estradas?|pontes?|escombros|bloqueio|bloqueia acesso|desabastec\w*|infraestrutur\w*|cidades? sem luz|energia|prejuiz\w*|paralis\w*|produ[cç]ao|logistica|porto de|posto de combustiveis|industria\w*|safra|agroindustria|ferrovi\w*)\b/i.test(topical);
 const weather=/\b(temporal\w*|tornado\w*|chuvas?|enchent\w*|inunda[cç][aã]o|enxurrad\w*|tempestad\w*|vento\w*|granizo|destrui[cç][aã]o)\b/i.test(topical);
 const economic=/\b(investiment\w*|economi\w*|empreg\w*|industria\w*|fabrica\w*|producao|exporta\w*|importa\w*|portuari\w*|porto de|portos?(?! alegre)|aeroporto\w*|obras?|rodovi\w*|ferrovi\w*|energia|usinas?|licitacao|concessao|pib|inflacao|juros?|selic|cambio|dolar|euro|agroindustria|safra|cooperativ\w*|comercio|logistica|infraestrutur\w*|desabastec\w*|bloqueio|interdicao|financiam\w*|credito|brde|bndes|fiesc|desenvolv\w*|miner\w*|mineracao)\b/i.test(topical);
 if(!economic && !(weather&&impact))return null;if(feed.area==='Sul'&&!SC_W.test(text)&&!RS_W.test(text))return null;if(feed.area==='RS')return {territorio:'RS',setor:'Economia regional'};
 if(feed.area==='SC'){if(!SC_W.test(text))return null;return {territorio:SC_S.test(text)?'Litoral sul SC':'Oeste SC',setor:'Economia regional'};}
 if(SC_W.test(text))return {territorio:SC_S.test(text)?'Litoral sul SC':'Oeste SC',setor:'Economia regional'};
 if(RS_W.test(text))return {territorio:'RS',setor:'Economia regional'};
 if(NATIONAL.test(text))return {territorio:'',setor:'Contexto econômico nacional'};return null}
function parseFeed(feed,xml){if(!/<(?:rss|rdf:RDF|feed)\b/i.test(xml))throw Error('Resposta não é um feed RSS/Atom');const entries=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>|<entry\b[^>]*>[\s\S]*?<\/entry>/gi)||[];if(!entries.length)throw Error('Feed sem publicações legíveis');const list=[];for(const chunk of entries.slice(0,70)){
  const titulo=tag(chunk,'title').slice(0,260);
  const atomLink=chunk.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
  const link=safeUrl(tag(chunk,'link')||atomLink||'');
  if(!titulo||!link)continue;
  const description=tag(chunk,'description')||tag(chunk,'summary')||'';
  const classification=classify(feed,titulo);if(!classification)continue;
  const rawDate=tag(chunk,'pubDate')||tag(chunk,'published')||tag(chunk,'updated')||'';let date='';if(rawDate){const t=Date.parse(rawDate);if(Number.isFinite(t)&&t<=Date.now()+86400000)date=new Date(t).toISOString().slice(0,10)}
  list.push({titulo,url:link,publicadoEm:date,fonte:feed.nome,territorio:classification.territorio,setor:classification.setor,resumo:'Sugestão coletada do feed público. Leia a fonte original antes de vincular ou registrar qualquer avanço.'});
  if(list.length>=25)break;
}return list}
function parseOfficialBndes(feed,body){
 let source;
 try{source=JSON.parse(body)}catch{throw Error('JSON oficial inválido')}
 if(!Array.isArray(source)||source.length>150)throw Error('Formato inesperado da fonte oficial');
 const list=[];const seen=new Set();
 for(const entry of source){
  if(!entry||typeof entry!=='object')continue;
  const titulo=String(entry.titulo||'').replace(/\s+/g,' ').trim().slice(0,260);
  const url=safeUrl(entry.linkConteudo);
  let host='';try{host=new URL(url).hostname}catch{}
  if(!titulo||!url||host!=='agenciadenoticias.bndes.gov.br'||seen.has(url))continue;
  const classification=classify(feed,titulo);
  if(!classification)continue;
  const timestamp=Number(entry.data);
  const published=Number.isFinite(timestamp)&&timestamp>946684800000&&timestamp<=Date.now()+86400000
    ?new Date(timestamp).toISOString().slice(0,10):'';
  list.push({titulo,url,publicadoEm:published,fonte:feed.nome,territorio:classification.territorio,
    setor:classification.setor,resumo:'Comunicado oficial consultado. Uma aprovação ou anúncio não prova execução ou conclusão; consulte os documentos originais.'});
  seen.add(url);
  if(list.length>=25)break;
 }
 return list
}
async function requestOfficialBndes(feed,fetcher){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  let url=feed.url;
  for(let hop=0;hop<2;hop++){
   const response=await fetcher(url,{signal:controller.signal,redirect:'manual',
     headers:{Accept:'application/json,text/plain;q=0.8','User-Agent':'RADAR-Observatorio/1.9 public-information-reader'}});
   if(response.status>=300&&response.status<400){
    const loc=response.headers.get('location'),resolved=loc?new URL(loc,url):null;
    if(!resolved||resolved.protocol!=='https:'||resolved.hostname!==new URL(feed.url).hostname)
      throw Error('Redirecionamento externo bloqueado');
    url=resolved.href;continue;
   }
   if(!response.ok)throw Error('HTTP '+response.status);
   const len=Number(response.headers.get('content-length')||0);
   if(len>600000)throw Error('Resposta oficial muito grande');
   const body=await response.text();
   if(body.length>600000)throw Error('Resposta oficial ultrapassa limite');
   return parseOfficialBndes(feed,body);
  }
  throw Error('Redirecionamento excessivo');
 }finally{clearTimeout(timer)}
}
async function requestFeed(feed,fetcher){const controller=new AbortController();const id=setTimeout(()=>controller.abort(),7000);
 try{let url=feed.url;for(let hop=0;hop<2;hop++){
  const r=await fetcher(url,{signal:controller.signal,redirect:'manual',headers:{'Accept':'application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9','User-Agent':'RADAR-Observatorio/1.9 RSS educational reader'}});
  if(r.status>=300&&r.status<400){const loc=r.headers.get('location');const resolved=loc?new URL(loc,url):null;if(!resolved||resolved.protocol!=='https:'||resolved.hostname!==new URL(feed.url).hostname)throw Error('Redirecionamento externo bloqueado');url=resolved.href;continue}
  if(!r.ok)throw Error('HTTP '+r.status);
  const ct=r.headers.get('content-type')||'';if(/text\/html/i.test(ct))throw Error('Resposta HTML em vez de RSS');const len=Number(r.headers.get('content-length')||0);if(len>600000)throw Error('Feed muito grande');const body=await r.text();if(body.length>600000)throw Error('Feed ultrapassa limite');return parseFeed(feed,body)
 }throw Error('Redirecionamento excessivo')}
 finally{clearTimeout(id)}
}
async function collect(fetcher=fetch){let results=await Promise.all([...FEEDS,GOOGLE_FEED].map(async feed=>{try{const items=feed.id===GOOGLE_FEED.id?await requestGoogleNews(feed,fetcher):feed.kind==='json'?await requestOfficialBndes(feed,fetcher):await requestFeed(feed,fetcher);return {feed,items,status:'ok',error:''}}catch(e){return {feed,items:[],status:'erro',error:String(e.message||e).slice(0,140)}}}));const seen=new Set();const items=[];for(const result of results){for(const x of result.items){if(seen.has(x.url))continue;seen.add(x.url);items.push(x)}}items.sort((a,b)=>(b.publicadoEm||'').localeCompare(a.publicadoEm||''));const limited=items.slice(0,70);
 return {schema:'radar-observatorio-feed/1',consultadoEm:new Date().toISOString(),items:limited,totais:{fontes:results.length,funcionando:results.filter(x=>x.status==='ok').length,comFalha:results.filter(x=>x.status!=='ok').length,candidatos:limited.length},fontes:results.map(x=>({id:x.feed.id,nome:x.feed.nome,url:x.feed.url,status:x.status,selecionadas:x.items.length,erro:x.error})),aviso:'Sugestões automáticas baseadas em títulos e metadados RSS; nenhuma foi verificada documentalmente.'};}
async function handler(req,res){res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');if(req.method!=='GET'){res.setHeader('Allow','GET');res.status(405).json({erro:'Método não permitido'});return}
 try{const result=await collect();res.status(result.totais.funcionando?200:503).json(result)}catch(e){res.status(502).json({erro:'Falha na coleta de fontes',mensagem:String(e.message||e).slice(0,160)})}}
module.exports=handler;
module.exports._test={collect,parseFeed,parseOfficialBndes,requestFeed,requestOfficialBndes,requestGoogleNews,classify,safeUrl,unescapeXML,FEEDS,GOOGLE_FEED};