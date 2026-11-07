# RADAR 360 — Portões P0 de homologação (07/11/2026)

Este documento contém somente constatações verificáveis, requisitos de teste e pendências. Não constitui aprovação de produção ou de uso de dados reais.

## Identificação
- Repositório inspecionado: `konzengestaors-arch/RADAR-360`.
- Branch de auditoria: `codex/auditoria-homologacao`.
- Commit funcional previamente aprovado nos testes: `674eea95d88dca6d9eb9f16d60763caa3e49613c`.
- PR: https://github.com/konzengestaors-arch/RADAR-360/pull/1 (rascunho, sem merge).
- Staging isolado: `dpl_3juu6Ds1hqNSzGiQBEP4AKdzcT5A` em `radar-360-homologacao-isolada`, alvo staging, READY; arquivo de fonte e metadata apontam para o commit anterior. SSO Vercel `enabled=true`, `deploymentType=all`.

## P0-A — Android e persistência real: ABERTO
**Evidência atual:** Playwright/Chromium em CI aprovado, empacotamento local aprovado; respostas HTTP 200 do staging (autenticadas via conector). Não há vídeo/capturas/registro de teste em Android físico.

**Protocolo de aceite:** no Chrome Android autorizado, anotar modelo/Android/Chrome, abrir HTTPS do staging, autenticar; navegar Comercial e Observatório; registrar somente ação/indicador sintéticos; fechar totalmente o navegador, reabrir exatamente a mesma origem e verificar registros; exportar JSON, restaurar backup em origem descartável e conferir equivalência; testar corrupção rejeitada sem perda; documentar resultado PASSOU/FALHOU/BLOQUEADO e evidência, incluindo eventuais restrições de cookies ou bloqueio SSO. Não limpar o armazenamento real do usuário.

**Regra:** testes `file://` e em desktop não substituem a execução física HTTPS.

## P0-B — Segregação por usuário/organização: NÃO IMPLEMENTADA/ABERTO
**Constatação técnica:** a demonstração mantém dados em localStorage, separado por chaves de Comercial e Observatório. Não existe autenticação e autorização no backend de aplicação para organizações ou usuários distintos. O SSO da Vercel protege a entrada no projeto de homologação, mas não fornece autorização por registro dentro do RADAR.

**Cenários de aceite para eventual implementação multiusuário:** usuário A não lê/escreve registro de usuário B; organização A não lê/escreve dados da B, inclusive via APIs, IDs arbitrários, backups, rotas e acesso direto; logout/sessão expirada bloqueia requisições do servidor; privilégios por função são impostos no servidor; testes negativos independentes com identidades reais de teste. Sem backend de controle implantado, **não** rotular como seguro para multiusuário.

## P0-C — Fonte Comercial v1.5 canônica: NÃO IDENTIFICADA/ABERTO
**Inspeção realizada:** árvores Git das branches `main` (1 entrada), `codex/desenvolvimento` (37 entradas) e `codex/auditoria-homologacao` (55 entradas) não mostram artefato, release ou arquivo identificável como fonte canônica da v1.5 Comercial. Lista de releases do repositório vazia. Os arquivos `demo/comercial-*.js` e `demo/comercial.html` são demonstração sintética e não prova de paridade com a v1.5.

**Aceite:** recuperar fonte ou pacote versionado externo de proveniência conhecida (origem, SHA-256, data, conteúdo e direitos de uso); comparar estrutura, funcionalidades e esquema de backup com a demo sem migração automática; validar em ambiente isolado antes de adotar. Ausência de fonte não constitui prova de perda ou vazamento de dados.

## P0-D — Acesso anônimo ao staging: EVIDÊNCIA INSUFICIENTE
A API Vercel registra `ssoProtection.enabled=true` / `deploymentType=all`. O conector Vercel autenticado acessa o deployment e pode usar link compartilhado temporário. Isso **não comprova** bloqueio de acesso sem login. Consultas externas não conseguiram alcançar o URL no ambiente de auditoria; nenhuma resposta HTTP 401/403 ou redirecionamento SSO foi coletada de sessão anônima.

**Aceite:** obter HTTP status, localização de redirecionamento e screenshot em janela anônima sem login, sem token e sem link de bypass, para `/`, `/comercial.html`, `/observatorio.html`, `/api/noticias`; confirmar que o app/dados não são retornados anonimamente. Repetir com usuário autorizado. Não gerar link de bypass permanente. Validar escopo e tempo de expiração de links de teste.

## RSS — P1 corrigido, CI aprovado
O tratamento de HTTP 503 estruturado, HTTP 200 com zero fontes, e coleta parcial foi alterado na branch isolada. Testes de regressão adicionados em `browser-tests/rss-falhas.spec.cjs`. No commit `674eea95d88dca6d9eb9f16d60763caa3e49613c` a execução https://github.com/konzengestaors-arch/RADAR-360/actions/runs/42327287318 aprovou Node 24/24, Chromium 65/65 e 18 repetições críticas. Pacote Android: https://github.com/konzengestaors-arch/RADAR-360/actions/runs/42327287315 .

## Condição de decisão
- Uso permitido neste ciclo: **demonstração com dados 100% fictícios sob controle de acesso**, com pendência de homologação física.
- Não autorizado: uso corporativo, dados pessoais ou de clientes, compartilhamento público, isolamento multiusuário alegado, merge para main, conexão automática do repositório ao projeto Vercel antigo ou promoção à produção.
- Homologação: **NÃO APROVADA** até o fechamento com evidências dos gates aplicáveis.
