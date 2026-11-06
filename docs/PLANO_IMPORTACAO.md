# Plano de importação controlada — RADAR 360

**Status:** Preparado; importação do aplicativo ainda pendente.

## Base disponível para avaliação
- Repositório: `konzengestaors-arch/RADAR-360`
- Branch de trabalho: `codex/desenvolvimento`.
- GitHub público: não incluir informações confidenciais ou pessoais.
- Material anterior identificado na biblioteca: `RADAR_OBSERVATORIO_v1.9_INDEX.html` (HTML autônomo, contém JavaScript, armazenamento local e dados regionais incorporados).
- Outras peças identificadas: `VERIFICADOR_P0_RADAR360_v1.5.html`, `PREPARAR_RADAR_LOCAL_SEM_NODE.html` e documentação de validação. Sua equivalência ao código comercial completo ainda não foi comprovada.

## Portões de aceite
1. Identificação inequívoca da versão de origem (arquivo, checksum, escopo).
2. Triagem de dados embutidos, URLs, segredos, licenças e material de terceiros.
3. Definição de fixtures sintéticas e exclusão de backups pessoais/corporativos.
4. Importação em branch isolada com commit identificado.
5. Execução reproduzível dos testes; evidências sobre persistência, restauração, isolamento entre módulos e ausência de dados secretos.
6. Revisão humana do diff antes de merge; nenhuma publicação automática.

## Riscos P0 ainda abertos
- Ausência de comprovação de isolamento de dados e de recuperação após reinício no dispositivo real.
- Ausência de demonstração de que versão comercial e Observatório compartilham zero dados privados.
- Ausência de vínculo auditável entre os artefatos locais e o código deste repositório.

**Nota:** A criação deste documento e das regras para agentes não representa importação de código, teste aprovado ou homologação.
