/* RADAR 360 | Interface aditiva: leitura de triagem sem persistir dados. */
(function(){
'use strict';
const engine=window.RadarDecisionBriefing;
if(!engine||typeof engine.toBriefing!=='function')return;
const STYLE_ID='radar-decision-briefing-style';
if(!document.getElementById(STYLE_ID)){
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=[
 '.radar-decision-brief{margin-top:12px;padding:14px 15px;border-left:3px solid #087e69;background:#f3f8f5;border-radius:0 9px 9px 0;color:#183e45}',
 '.radar-decision-brief summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:12px;font-weight:800;list-style:none}',
 '.radar-decision-brief summary::-webkit-details-marker{display:none}',
 '.radar-decision-brief summary::after{content:"+";margin-left:auto;font-size:20px;font-weight:400}',
 '.radar-decision-brief[open] summary::after{content:"−"}',
 '.radar-decision-brief .radar-brief-pill{font-size:10px;color:#7d4c16;background:#fff2df;border-radius:999px;padding:4px 8px;font-weight:700}',
 '.radar-decision-brief dl{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;margin:12px 0 0}',
 '.radar-decision-brief dt{font-weight:800;font-size:11px;color:#175f59;margin-bottom:2px}',
 '.radar-decision-brief dd{margin:0;line-height:1.55;font-size:12px;color:#35545a}',
 '.radar-decision-brief .radar-brief-disclaimer{border-top:1px solid #d4e3dd;padding-top:9px;font-size:11px;color:#647975}',
 '@media(max-width:720px){.radar-decision-brief{padding:12px;margin-top:10px}.radar-decision-brief summary{font-size:12px}}',
 'body[data-current-tab="panorama"] .radar-decision-brief{margin:16px 0 0;background:#eaf2ed;border-left-color:#087e69}',
 'body[data-current-tab="panorama"] .news-live-card.featured .radar-decision-brief{background:#eef6f1;color:#183e45}'
 ].join('\n');document.head.appendChild(style);
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function render(card){
 if(card.querySelector(':scope > .radar-decision-brief'))return;
 const link=card.querySelector('h3 a[href]');if(!link)return;
 const source=card.querySelector('.news-live-meta span');const time=card.querySelector('.news-live-meta time');
 const data={titulo:link.textContent,url:link.getAttribute('href'),fonte:source?.textContent,publicadoEm:time?.textContent};
 const brief=engine.toBriefing(data);if(!brief)return;
 const root=el('details','radar-decision-brief');
 const summary=el('summary');summary.append(el('span','', 'Análise para decisão'),el('span','radar-brief-pill','Triagem não verificada'));root.appendChild(summary);
 const dl=el('dl');
 for(const [label,value] of [
  ['O que aconteceu?',brief.titulo],
  ['Por que observar?',brief.sinal],
  ['O que falta confirmar?',brief.lacunas.join('; ')],
  ['Próxima verificação',brief.acao],
  ['Decisão apoiada',brief.decisao]
 ]){const block=el('div');block.append(el('dt','',label),el('dd','',value));dl.append(block)}
 dl.append(el('div','radar-brief-disclaimer','Síntese automática baseada na manchete. Não comprova os fatos, investimentos ou vínculos com empresas. Confira a matéria original.'));
 root.append(dl);card.append(root);
}
function sync(){document.querySelectorAll('#radarLiveNews .news-live-card').forEach(render)}
function init(){const stableRoot=document.getElementById('body')||document.body;if(!stableRoot)return false;sync();/* O grid de notícias é recriado por render() após atualização do catálogo. Observar a área estável evita perder o briefing em uma nova instância do grid. */const observer=new MutationObserver(sync);observer.observe(stableRoot,{childList:true,subtree:true});return true}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
