# RADAR 360 — Referências oficiais para Investimentos (07/11/2026)

## Finalidade
Complementar a leitura da aba `Investimentos` sem publicar dados empresariais privados, inventar investimentos, ampliar o scraping ou configurar integrações pagas.

A tela distingue três naturezas de informação:
1. **Sinais RSS:** títulos classificados por palavras e padrões de financiamento/obra, não verificados individualmente.
2. **Referências oficiais:** quatro publicações consultadas em 07/11/2026, incorporadas estaticamente em `demo/fontes-investimentos.js`, com datas, links e estágios próprios. **Não atualizam automaticamente**.
3. **Projetos documentados:** registros existentes na base local com evidências e eventual revisão humana, preservados sem conversão automática de notícias.

## Fontes e estados documentais
| Fonte e publicação | Data | Estado que o RADAR pode declarar |
| --- | --- | --- |
| [BNDES — financiamento de fibra óptica no Oeste SC](https://agenciadenoticias.bndes.gov.br/noticia/BNDES-aprova-R$-10-mi-para-rede-de-fibra-otica-no-Oeste-de-SC/) | 06/11/2026 | Financiamento aprovado. Não prova execução integral |
| [BNDES — quatro navios de apoio marítimo em SC](https://agenciadenoticias.bndes.gov.br/noticia/BNDES-aprova-R$-218-bi-para-construcao-de-quatro-navios-de-apoio-maritimo-em-SC/) | 03/11/2026 | Financiamento de até R$ 2,18 bi aprovado. Não é valor total de obra nem execução |
| [Invest RS — projetos de transição energética na China](https://www.estado.rs.gov.br/invest-rs-apresenta-projetos-de-transicao-energetica-do-rio-grande-do-sul-em-evento-para-investidores-na-china) | 03/11/2026 | Prospecção de investimentos, não aportes contratados |
| [Sedec RS — Avançar Deep Tech](https://desenvolvimento.rs.gov.br/governo-do-estado-institui-programa-avancar-deep-tech-para-impulsionar-inovacao-e-desenvolvimento-economico) | 28/10/2026 | Programa instituído; fundo em estruturação, não capital integralmente aplicado |

## Integração técnica
- `demo/fontes-investimentos.js`: catálogo estático revisado e função reutilizável de classificação conservadora.
- `demo/observatorio.html`: seção editorial adicional sob Investimentos, sem interferência no cadastro de 222 empresas e no estado local.
- `tests/investimentos-fontes.test.cjs`: segurança de links, datas e falsas correspondências.
- `browser-tests/investimentos-fontes.spec.cjs`: renderização em 320, 390 e 1440 px; comportamento com RSS ativo e indisponível.

## Pendências e cautelas
- Ainda **não existe atualização agendada** dessas quatro publicações. Para atualização contínua de fontes oficiais, é necessário confirmar feeds RSS ativos ou implementar coleta autorizada e auditável com logs, controles de carga e gestão de mudanças.
- Links de referência não representam registro empresarial nem prova de correspondência com as 222 empresas.
- Não fez merge em `main`; a adoção depende de revisão e suíte de testes aprovada em commit identificado.
