'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name));
const txt=name=>read(name).toString('utf8');
const manifest=JSON.parse(txt('demo/manifest.webmanifest'));
const cfg=JSON.parse(txt('vercel.json'));

function crc32(bytes){
 let crc=-1;
 for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
 return (crc^-1)>>>0;
}
function validatePng(file,width){
 const bytes=read('demo/icons/'+file);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Assinatura PNG inválida');
 let position=8,header=null,last=false;
 const chunks=[],compressed=[];
 while(position+12<=bytes.length){
  const length=bytes.readUInt32BE(position);
  const type=bytes.toString('ascii',position+4,position+8);
  assert.ok(length>=0&&length<=bytes.length-position-12,'Chunk truncado '+type);
  const body=bytes.subarray(position+8,position+8+length);
  const expected=bytes.readUInt32BE(position+8+length);
  const raw=bytes.subarray(position+4,position+8+length);
  assert.equal(crc32(raw),expected,'CRC inválido: '+file+' '+type);
  chunks.push(type);
  if(type==='IHDR')header={width:body.readUInt32BE(0),height:body.readUInt32BE(4),bitDepth:body[8],colorType:body[9],interlace:body[12]};
  if(type==='IDAT')compressed.push(body);
  position+=length+12;
  if(type==='IEND'){last=true;break;}
 }
 assert.ok(last&&header,'PNG sem IHDR/IEND');
 assert.equal(position,bytes.length,'Dados excedentes após IEND');
 assert.equal(header.width,width);
 assert.equal(header.height,width);
 assert.ok([0,2,3,4,6].includes(header.colorType));
 assert.ok(compressed.length,'PNG sem dados');
 assert.ok(zlib.inflateSync(Buffer.concat(compressed)).length>width,'IDAT inválido');
}
test('ícones Android são PNG íntegros de 192px, 512px e máscara',()=>{
 validatePng('observatorio-192.png',192);
 validatePng('observatorio-512.png',512);
 validatePng('observatorio-maskable-512.png',512);
});
test('manifesto possui identidade, escopo, modo standalone e ícones',()=>{
 assert.equal(manifest.name,'Observatório 360 — Inteligência Empresarial');
 assert.equal(manifest.scope,'/demo/');
 assert.match(manifest.start_url,/^\/demo\/observatorio\.html\?/);
 assert.equal(manifest.display,'standalone');
 assert.deepEqual(manifest.icons.map(x=>x.sizes),['192x192','512x512','512x512']);
 const html=txt('demo/observatorio.html');
 assert.match(html,/<link rel="manifest" href="\/demo\/manifest\.webmanifest" crossorigin="use-credentials">/);
 assert.match(html,/<script src="pwa-qa\.js"><\/script>/);
});
test('service worker restringe escopo, não guarda HTML/JSON privados e usa offline estático',()=>{
 const sw=txt('demo/pwa-qa-sw.js'),offline=txt('demo/offline.html');
 assert.match(sw,/request\.mode!=='navigate'/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/const OFFLINE_PATH='\/demo\/offline\.html'/);
 assert.match(sw,/cache\.put\(OFFLINE_PATH,/);
 assert.doesNotMatch(sw,/cache\.put\(request|cache\.put\(url|cache\.addAll\(/);
 assert.doesNotMatch(sw,/localStorage|indexedDB|sessionStorage/);
 assert.match(offline,/<meta name="obs360-offline" content="static-only">/);
 assert.doesNotMatch(offline,/obs360_session|api\/empresas|api\/noticias|api\/apuracoes/);
});
test('cabeçalhos Vercel não permitem cache privado e definem MIME e escopo',()=>{
 const rule=source=>cfg.headers.find(x=>x.source===source)?.headers||[];
 const header=(src,key)=>rule(src).find(x=>x.key.toLowerCase()===key.toLowerCase())?.value;
 for(const src of ['/demo/observatorio.html','/demo/manifest.webmanifest','/demo/pwa-qa-sw.js','/demo/offline.html','/api/(.*)'])
  assert.match(header(src,'Cache-Control')||'',/no-store/i,'Cache-Control '+src);
 assert.match(header('/demo/manifest.webmanifest','Content-Type'),/application\/manifest\+json/i);
 assert.match(header('/demo/pwa-qa-sw.js','Content-Type'),/application\/javascript/i);
 assert.match(header('/demo/offline.html','Content-Type'),/text\/html/i);
 assert.equal(header('/demo/pwa-qa-sw.js','Service-Worker-Allowed'),'/demo/');
 assert.equal(header('/demo/icons/(.*).png','Content-Type'),'image/png');
});
