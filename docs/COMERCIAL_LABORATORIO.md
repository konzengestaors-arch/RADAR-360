# RADAR Comercial — protótipo sintético independente

## Origem e classificação
- As versões históricas RADAR BI v0.6 e v0.8 foram identificadas na biblioteca. Elas contêm aproximadamente 222 registros empresariais reais, **não importados** para o GitHub público.
- Não há comprovação de que tais versões correspondam ao RADAR Comercial canônico v1.5.
- A pasta `demo/comercial*` é implementação demonstrativa nova, **não é restauração** da v1.5 nem substituto da produção.

## Conteúdo verificável
- Três empresas fictícias explicitamente rotuladas `DEMO-`.
- Pesquisa por empresa/segmento, filtro RS/SC, seleção para registro de ações de cadência, indicadores de quantidade e exportação de backup exclusivamente sintético.
- Armazenamento local isolado na chave `radar_comercial_demo_publica_20261106`.
- Esquema `radar-comercial-demo/1`, distinto de `radar-observatorio-unico/1.7`.
- Sem chamadas de rede, dependências de serviço, credenciais, contatos ou bases reais.
- Validação de esquema e modo somente leitura em dados locais incompatíveis.

## Restrições e riscos
- Não utilizar para prospecção real, importar planilhas comerciais ou inserir contatos e dados corporativos.
- Sem autenticação, autorização por usuário/organização, criptografia ou sincronização; localStorage não oferece isolamento multiusuário.
- A exportação sintética existe, mas **não há importação de backup comercial** nesta versão.
- Não substitui testes em dispositivo Android físico e revisão humana de experiência.
- A recuperação da versão v1.5 permanece bloqueada até identificação da fonte canônica.

## Próximo portão
Executar Node e Chromium na branch `codex/desenvolvimento`, inspecionar resultado por commit, corrigir falhas observáveis. Continuar sem merge em `main` e sem deploy.
