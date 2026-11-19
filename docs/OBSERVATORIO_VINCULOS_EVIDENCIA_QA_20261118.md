# Observatório 360 — relações notícia–empresa com evidência · QA isolada
Data local de referência: 18/11/2026. Escopo: exclusivamente branch qa/observatorio-vinculos-evidencia-20261118 baseada no commit bb05b7cf4db96d5981afd00bf285a97e52e7fe99.

## Paridade
- A referência funcional é P4.1-H5.2, cujo relatório de 13/11 descreve HTML, APIs próprias /api/inteligencia e /api/mercados, sessão durável e quatro indicadores previstos. O ZIP/HTML executável integral P4.1-H5.2 não está neste repositório.
- A demo 1.9 possui quatro abas premium, porém o seed de movimentos/indicadores é vazio e o frontend usa outra sessão e outra rota de catálogo. Não há prova de paridade nem migração de dossiês/histórico. Não promover a substituta.
- /api/empresas da QA impõe 217 itens, 96 CNPJs e oito registros em conferência, mas testes com fixtures não são leitura real autenticada do catálogo. Exige conferir no Preview autenticado sem salvar nomes/CNPJs.

## Três opções
A) Associação diária com evidência: exemplo público de 18/11/2026, matéria da Agência Brasil sobre o Parque do Albardão (https://agenciabrasil.ebc.com.br/meio-ambiente/noticia/2026-11/parque-nacional-do-albardao-impactos-socioeconomicos). A notícia cita atividades empresariais, mas **sem identificador do catálogo confirmado não se deve vincular**. Exige manchete, veículo, data/hora, link, catálogo autenticado, identificador ou menção nominal, justificativa, erro e horário da consulta. Benefício: resposta na ficha da empresa. Esforço médio. Risco: homônimos; critério: identifica fonte e separa identificador de hipótese.
B) Linha do tempo: exemplo real é a notícia BNDES sobre HT Micron publicada em 21/09/2026; não é notícia de hoje. Exige feed histórico estável, deduplicação, identidade confirmada e duas datas. Benefício: memória documental, esforço médio–alto, risco de cronologia incompleta; critério: cada item preserva publicação e consulta sem retroagir hora.
C) Cobertura geográfica e de fontes: nas leituras locais P4.1-H5.2 de 13/11/2026, g1 RS/SC e Agência Brasil apresentaram falhas alternadas. Exige status por feed, localidade, coleta e número elegível. Benefício: não confundir zero com queda do RSS, esforço baixo–médio, risco de cobertura ilusória; critério: falha visível separada de retorno válido vazio.
Escolha: A sobre o feed e catálogo existentes, sem score comercial. C serve como restrição de confiança, não substitui evidência de identidade.

## Contrato editorial da implementação
- Avaliação somente em memória e com sessão privada ativa; nenhuma empresa ou CNPJ é enviado para fonte externa, URL, Analytics, cache ou relatório.
- Só considera lotes consultados há até 20 minutos e do dia civil America/Sao_Paulo, com pelo menos uma fonte respondendo.
- Publicação de hoje é checada contra o calendário local; quando o feed fornece timestamp ISO, a data precisa coincidir.
- CNPJ exato contido na manchete e único no catálogo -> "Confirmado por identificador publicado", apenas no sentido de coincidência de identificação, **não comprovação do acontecimento**.
- Nome completo literal -> "Correspondência nominal não verificada"; homônimos, CNPJ duplicado e registro com conflito -> "Relação ambígua · revisão humana".
- Município, setor, semelhança de nome e conteúdo genérico do campo resumo do coletor não são evidência. A evidência exibida é a manchete com link original; o corpo do artigo não é copiado nem recuperado.
- Veículo extraído do campo source no Google RSS quando disponível; caso contrário a origem consultada é explicitada. A hora da publicação é mostrada somente se o feed a forneceu.
- CNPJ/domínio institucional/identificador adicional NÃO são inferidos; esta QA só tem nome/CNPJ no contrato da API. Um domínio só poderá ser usado após campo oficialmente verificado na origem privada.
- Não existe automação de oportunidade, score, risco, recomendação de seguro ou integração com base comercial.

## Segurança e PWA
- Reutiliza o service worker já aprovado, sem alterá-lo. Cache Storage permanece limitado a /demo/offline.html; nenhum HTML autenticado, API, dossiê, feed ou CNPJ é cacheado.
- Ao encerrar sessão, conteúdo de catálogo e snapshot de associação é removido da memória; respostas sem sessão não recebem itens privados.
- O repositório RADAR-360 é PÚBLICO. O arquivo docs/data/oportunidades.csv está no main, com colunas prioridade, score, fornecedor, cnpj, telefone, valor, produtos. Não copiar esses registros na branch PWA.
- Sequência de contenção **não executada**: (1) catalogar onde o CSV está servido e verificar se há GitHub Pages ativo; (2) delimitar dados e responsáveis; (3) preservar evidência de acesso e cópia autorizada; (4) obter autorização específica para retirar arquivo da ponta e da árvore atual, sem interromper painel; (5) tratar histórico Git, forks, clones e cache de busca/CDN separadamente, com revisão de impacto e rotação de eventuais segredos; (6) revisar Pages ou links estáticos e verificar novamente exposição. Tornar o repo privado ou deletar arquivo não apaga cópias históricas.
- Não alterar main, Pages, domínio ou permissão neste ciclo.

## Evidências pendentes
- Consultar /api/sessao, /api/empresas, /api/noticias e /api/apuracoes em navegador autenticado da Preview; registrar apenas status/MIME/contagens. SSO READY não demonstra isso.
- Comparar P4.1-H5.2 integral, especialmente dossiês, briefing, mercados, histórico e logout, com esta QA.
- Observar notícia publicada realmente hoje com CNPJ em fonte primária e empresa existente no catálogo; sem isso, o caso "confirmado" está testado apenas com fixture, nunca como exemplo real.
- Testar login, ficha de empresa, vínculo, abrir fonte, expiração, modo avião e armazenamento no Motorola físico com chrome://inspect. Chromium não comprova instalação.
