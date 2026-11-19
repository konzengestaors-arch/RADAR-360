# Observatório 360 — Candidata PWA privada (QA 2026-11-18)

## Escopo e controle de versão
- Repositório: `konzengestaors-arch/RADAR-360`.
- Branch PWA isolada: `qa/observatorio-pwa-privado-20261118`.
- Base: `00add924ac921317d1aa7ded130a1df3b1cb734e`, branch `qa/observatorio-catalogo-privado-https-20261116`.
- Aplicação no repositório: `demo/observatorio.html`, prévia editorial com referência interna `1.9-demo-sintetica` e quatro abas Premium. O repositório não contém evidência de equivalência funcional total com a referência local histórica P4.1. Não declarar paridade ou substituir a P4.1 sem comparação A/B.
- Catálogo: `/api/empresas`, 217 registros, oito em revisão, acesso somente em sessão privada autenticada.
- Vercel: projeto gratuito existente `radar-360-homologacao-isolada`, com SSO habilitado em todos os deployments no instante da auditoria.
- Domínio principal do projeto `radar-360-homologacao-isolada.vercel.app` **não** é endereço liberado para instalar esta QA: sem vínculo com a branch de PWA ele pode apontar ao deployment de produção do projeto.

## Recursos do PWA
- Entrada: `/demo/observatorio.html?entrada=pwa`.
- Manifesto: `/demo/manifest.webmanifest` (`application/manifest+json`).
- Ícones: `/demo/icons/observatorio-192.png`, `observatorio-512.png`, `observatorio-maskable-512.png` (`image/png`).
- Service worker: `/demo/pwa-qa-sw.js` (`application/javascript`), escopo **somente** `/demo/`.
- Fallback: `/demo/offline.html` (`text/html`); contém texto editorial estático sem empresas, dados financeiros, notícias ou fichas.
- Manifesto solicitado com `crossorigin="use-credentials"` para transmitir cookies de SSO quando necessários.
- Cabeçalhos em `vercel.json`: HTML de entrada, manifesto, service worker, offline e APIs com `Cache-Control: private, no-store`; MIME explícito para manifest/SW/offline/ícones.
- Sem caminhos genéricos/rewrite e sem alteração do `main` ou do deployment de produção.

## Modelo de cache e sessão
- Navegações sempre usam a rede com `cache: 'no-store'`. A Vercel continua responsável pela autenticação; com a sessão expirada, a navegação não retorna um HTML privado armazenado.
- O SW cria uma única entrada de Cache Storage de origem `/demo/offline.html`, a partir de texto estático seguro. Se o fetch de fallback tiver conteúdo de login ou redirecionamento, ele é recusado.
- Não há pre-cache de `observatorio.html`, JavaScript empresarial, CSS, notícia, resposta de API, `/api/sessao`, `/api/empresas`, `/api/apuracoes` ou `/api/noticias`. Nenhum cookie ou token é registrado pelo SW.
- O app legado mantém seus próprios mecanismos locais para dados *locais/sintéticos* já existentes; a migração PWA não cria nova persistência de conteúdo privado.
- Em modo avião a navegação exibe unicamente `offline.html` (ou um fallback seguro equivalente, escrito no SW), nunca uma tela empresarial anterior.

## Estados de atualidade
Fonte: `/api/noticias`. Cada resultado exibe `fonte` e `publicadoEm`, enquanto `consultadoEm` marca a coleta.
- **Notícias de hoje**: data `America/Sao_Paulo` coincide com `dataReferencia`, `consultadoEm` não excede 20 minutos e ao menos uma fonte respondeu; conteúdo e total de fontes mostrados.
- **Nenhuma notícia de hoje nos filtros**: coleta atual com fonte(s) acessível(is) e zero manchete(s) com data do dia; não significa ausência global de notícias.
- **Erro na consulta**: falha de API/rede/sem fontes; nenhuma notícia anterior é reutilizada.
- **Conteúdo antigo ou indisponível**: data de referência divergente, horário ausente/vencido ou resposta sem fontes confiáveis; manchetes são ocultadas e solicita-se atualização.
- Cobertura parcial é sinalizada quando há fontes com falha.
- Retorno à aba e reconexão forçam nova consulta; dados antigos são descartados antes do início.
- Radar de 7 dias preserva data original, mas **não** usa snapshot de API vencido para sustentar sinal comercial atual.

## Homologação em camadas
1. **Código/CI:** `npm run check`, `node --check demo/pwa-qa-sw.js`, `node --check demo/pwa-qa.js`, testes Playwright e CRC/IDAT dos PNGs. Evidência: GitHub Actions da branch PWA.
2. **Deployment privado HTTPS:** confirmar projeto/branch/commit/READY e SSO `all` sem alterar produção.
3. **HTTP após login:** no Chrome autenticado, abrir Manifest, SW, offline e ícones; registrar código 200, `Content-Type` e ausência de login HTML/redirect. Sem sessão de navegador autenticada, este requisito **não pode ser considerado aprovado** apenas pelo status READY.
4. **Instalação física:** Chrome Android no Motorola, abrir domínio fixo da branch e escolher instalar. Confirmar ícone da tela inicial, abertura standalone e navegação pelas quatro abas.
5. **Sessão:** encerrar sessão privada, reabrir ícone e confirmar bloqueio do catálogo e apurações; SSO pode exigir autenticação adicional.
6. **Modo avião:** reabrir pelo ícone; apenas tela de indisponibilidade deve aparecer. Não devem aparecer notícias, empresas ou dossiês do acesso anterior.
7. **Atualidade:** simular resposta vazia e indisponível; conferir data de publicação, horário local de consulta e fontes parciais.
8. **`chrome://inspect` em computador ligado ao Motorola:** inspecionar Chrome remoto, Service Workers/Storage/Cache Storage, Console e Network; guardar captura dos recursos com status, MIME, cache e erros.

**Proibição de homologação antecipada:** aprovação do Chromium emulado não substitui instalação e abertura no Motorola. Sem prova física, o status final continua **candidata PWA em QA**, mesmo que a implantação esteja READY.

## Decisão e pendências
- URL fixa: exige vínculo explícito de domínio ou alias à branch de QA, nunca ao domínio principal de produção. Se a infraestrutura não suportar domínio estável gratuito e protegido, manter URL de deployment temporária e classificar instalação como bloqueada para aceite.
- Não usar serviços pagos, nem merge, nem publicação pública.
- Único próximo teste de hardware: abrir a URL da candidata autenticada no Chrome do Motorola, instalar pelo próprio Chrome e verificar abertura pelo ícone **sem** retornar a um arquivo HTML local.
