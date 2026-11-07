# RADAR Comercial — protótipo sintético independente

## Origem e classificação
- As versões históricas RADAR BI v0.6 e v0.8 foram identificadas na biblioteca. Elas contêm aproximadamente 222 registros empresariais reais, **não importados** para o GitHub público.
- Não há comprovação de que tais versões correspondam ao RADAR Comercial canônico v1.5.
- A pasta `demo/comercial*` é implementação demonstrativa nova, **não é restauração** da v1.5 nem substituto da produção.

## Conteúdo verificável
- Três empresas fictícias explicitamente rotuladas `DEMO-`.
- Pesquisa por empresa/segmento, filtro RS/SC, seleção para registro de ações de cadência, indicadores de quantidade e exportação/restauração de backup exclusivamente sintético.
- Pipeline de oportunidades fictícias com etapas Identificada, Qualificação, Proposta, Concluída e Descartada; histórico append-only de alterações com data e justificativa.
- Compatibilidade de leitura de backups anteriores da demonstração, sem campo de oportunidades, mantendo o mesmo esquema e sem migração destrutiva.
- Armazenamento local isolado na chave `radar_comercial_demo_publica_20261106`.
- Esquema `radar-comercial-demo/1`, distinto de `radar-observatorio-unico/1.7`.
- Sem chamadas de rede, dependências de serviço, credenciais, contatos ou bases reais.
- Validação de esquema e modo somente leitura em dados locais incompatíveis.

## Restrições e riscos
- Não utilizar para prospecção real, importar planilhas comerciais ou inserir contatos e dados corporativos.
- Sem autenticação, autorização por usuário/organização, criptografia ou sincronização; localStorage não oferece isolamento multiusuário.
- Importação de backup limitada a arquivos válidos da demonstração, com limite de 1 MB, confirmação de substituição e bloqueio de esquemas estranhos. Isso não equivale a restauração de bases comerciais reais.
- Não substitui testes em dispositivo Android físico e revisão humana de experiência.
- A recuperação da versão v1.5 permanece bloqueada até identificação da fonte canônica.

## Próximo portão
Última implementação funcional testada: commit `975dc00c8cff0e5dc4f8b9b3b56afae2ef4d0f87`. GitHub Actions: https://github.com/konzengestaors-arch/RADAR-360/actions/runs/42318683189. Foram aprovados 20 testes Node e 34 Chromium, incluindo oportunidades e visibilidade dos controles no mobile. Um erro de regex na validação de datas foi identificado e corrigido antes dessa execução. A falha intermitente anterior de recuperação do Observatório ainda exige monitoramento; uma execução verde não prova estabilidade permanente. Continuar sem merge em `main` e sem deploy.
