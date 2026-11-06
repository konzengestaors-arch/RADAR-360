# Estado de integração — 06/11/2026

## Implementado na branch codex/desenvolvimento
- Regras para agentes e exclusões preventivas de arquivos sensíveis.
- Plano de importação controlada.
- Código original do coletor RSS v1.9 em `api/noticias.js`.
- Testes Node de validação sem chamadas externas.

## Não importado
- HTML completo do Observatório v1.9: contém dados embutidos; requer revisão e substituição por dados sintéticos antes de ser publicado neste repositório público.
- Aplicação comercial v1.5: não há código-fonte canônico confirmado para importação.

## Pendências P0
- Comprovar persistência e restauração em dispositivo real.
- Demonstrar separação técnica entre RADAR Comercial e Observatório.
- Validar endpoints, tratamento de falhas e limites de fontes RSS.
- Executar a suíte no commit efetivo e registrar logs/resultado.

## Restrição
Esta branch não representa homologação, deploy ou integração já executada pelo ambiente Codex. Produção inalterada.
