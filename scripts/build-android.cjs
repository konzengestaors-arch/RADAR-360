'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist','android');
fs.mkdirSync(output,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('base64');
const html=read('demo/comercial.html'),css=read('demo/comercial.css');
const scripts=['demo/comercial-core.js','demo/comercial-ui.js'].map(read);
const script=scripts.join('\n;\n');
const policy=`default-src 'none'; script-src 'sha256-${sha(script)}'; style-src 'sha256-${sha(css)}'; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
let standalone=html.replace(/<link rel="stylesheet" href="comercial\.css">/,()=>`<style>${css}</style>`)
 .replace(/<script src="comercial-core\.js"><\/script><script src="comercial-ui\.js"><\/script>/,()=>`<script>${script}</script>`)
 .replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/,()=>`<meta http-equiv="Content-Security-Policy" content="${policy}">`);
assert(!standalone.includes('src="comercial-ui.js"'));
assert(standalone.includes('radar_comercial_demo_publica_20261106'));
assert(standalone.includes('sha256-'));
assert(!standalone.includes('222 empresas'));
assert(!standalone.includes('https://'));
const observatorio=read('demo/observatorio.html');
assert(observatorio.includes('DEMONSTRAÇÃO DE DESENVOLVIMENTO'));
assert(observatorio.includes('radar_obs_demo_publica_20261106'));
fs.writeFileSync(path.join(output,'RADAR_COMERCIAL_DEMO_LOCAL.html'),standalone);
fs.writeFileSync(path.join(output,'RADAR_OBSERVATORIO_DEMO_LOCAL.html'),observatorio);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const commit=git('rev-parse','HEAD');
if(process.env.GITHUB_SHA)assert.equal(process.env.GITHUB_SHA,commit,'GITHUB_SHA diverge do checkout');
const manifest={
 tipo:'RADAR-360-pacote-homologacao-local',branch:process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||git('branch','--show-current'),
 commit,
 alteracoesLocais:!!git('status','--porcelain','--untracked-files=no'),
 arquivos:['RADAR_COMERCIAL_DEMO_LOCAL.html','RADAR_OBSERVATORIO_DEMO_LOCAL.html'].map(name=>({
 nome:name,bytes:fs.statSync(path.join(output,name)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(output,name))).digest('hex')
 }))
};
fs.writeFileSync(path.join(output,'MANIFESTO.json'),JSON.stringify(manifest,null,2));
const instructions=`RADAR 360 — PACOTE LOCAL DE AVALIAÇÃO (DADOS SINTÉTICOS)
Commit: ${manifest.commit}

1. Extraia este ZIP. Abra RADAR_COMERCIAL_DEMO_LOCAL.html no Chrome do Android. Se o navegador impedir abertura de arquivos locais, não contorne a restrição com permissões inseguras.
2. RADAR_OBSERVATORIO_DEMO_LOCAL.html é independente. NÃO misture seus backups.
3. Teste navegação, campos e legibilidade, sempre com dados fictícios.
4. IMPORTANTE: armazenamento em file:// varia conforme navegador/sistema. Se aparecer modo somente leitura, não declare falha de persistência do produto; registre BLOQUEADO POR ORIGEM e use homologação HTTPS isolada.
5. Mesmo se salvar em file://, fechar e reabrir e restaurar arquivos locais não demonstra persistência em um domínio HTTPS futuro.
6. Não há login, nuvem, isolamento multiusuário ou integração com produção. Não insira dados reais.
7. Registre modelo Android, navegador, passos observados e resultado. Consulte docs/HOMOLOGACAO_ANDROID.md do repositório.
8. Este pacote não é instalador APK, não é PWA e não é versão operacional v1.5.
`;
fs.writeFileSync(path.join(output,'LEIA_PRIMEIRO.txt'),instructions);
console.log(JSON.stringify(manifest,null,2));
