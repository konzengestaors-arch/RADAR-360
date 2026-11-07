# RADAR 360

Laboratório de desenvolvimento com demonstrações sintéticas independentes do RADAR Comercial e RADAR Observatório. Não equivale à versão operacional Comercial v1.5; não insira dados reais.

## Desenvolvimento local

Requisitos: Node >=20, npm e Python 3. CI usa Node 22.

```sh
npm ci
npm run check
npx playwright install chromium
node scripts/build-android.cjs
npm run test:browser
```

O Playwright inicia o servidor HTTP local para os testes. Para inspecionar manualmente, execute `python3 -m http.server 4173 --bind 127.0.0.1` na raiz e abra os arquivos em `demo/` pelo servidor. Isso não implementa o handler serverless `/api/noticias`; a coleta remota não funciona nesse servidor estático.

Se o ambiente já tiver um Chromium confiável, `RADAR_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser` seleciona esse executável; registre sua versão. Políticas gerenciadas podem bloquear `file://`, o que impede os dois ensaios de abertura local e mantém a suíte com saída de falha.

O empacotador gera dois HTMLs e manifesto SHA-256 em `dist/android/`; não gera APK. O Observatório ainda usa fontes financeiras externas quando há acesso à rede. `alteracoesLocais` no manifesto sinaliza alterações em arquivos rastreados; para revisão formal use checkout limpo e um commit identificado.

Consulte a [auditoria técnica](docs/AUDITORIA_HOMOLOGACAO_20261106.md), o [roteiro Android](docs/HOMOLOGACAO_ANDROID.md) e as [regras do repositório](AGENTS.md). Nenhum deploy ou merge para `main` faz parte deste fluxo.
