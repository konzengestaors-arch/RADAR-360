# RADAR 360 — Protocolo único de usabilidade Android

**Objetivo:** avaliar se o Panorama simplificado facilita localizar informações reais da interface usando exclusivamente dados fictícios.  
**Versão sob teste:** staging privado `bc65df31c3f9d5ff424a37aaf3a4e557ee586734` — https://radar-360-homologacao-isolada-o316m4y1n-konzengestaors-2191.vercel.app/  
**Estado:** protocolo preparado; **nenhuma observação física coletada**. Não confundir testes Playwright com evidência de experiência humana.

## Preparação única

1. Usar Android e Chrome no mesmo perfil/origem do ambiente de homologação; login Vercel autorizado. Não utilizar dados pessoais, corporativos ou de clientes.
2. Registrar modelo do aparelho, versão Android, versão Chrome, orientação, largura aproximada e se já conhece o sistema.
3. Preparar cenário exclusivamente sintético com pelo menos um indicador, um movimento com dossiê e uma verificação agendada. Sem essa preparação, tarefas 1, 3 ou 4 podem ser **bloqueadas por falta de dados**, e não falhas de interface.
4. Começar cada tarefa na tela Panorama, sem instrução de navegação além do objetivo. Relógio inicia ao ler a tarefa e termina após confirmar a informação.
5. **Não restaurar arquivos destrutivamente no perfil principal.** Para tarefa 5, basta localizar os controles de exportação/restauração; a importação completa pertence ao cenário de segurança separado.

## Tarefas do ensaio (executar em uma rodada)

| ID | Objetivo entregue à pessoa | Evidência observável de conclusão |
| --- | --- | --- |
| U01 | Encontre um indicador e abra o assunto correspondente | Atalho de indicador acionado, assunto/destino correto visível |
| U02 | Abra a Leitura executiva e retorne ao resumo | Seção expandida, conteúdo lido, seção recolhida e Panorama visível |
| U03 | Localize uma verificação agendada e identifique sua data | Seção Agenda e critérios ou atalho correspondente, data apresentada corretamente |
| U04 | Filtre os movimentos por termo fictício e abra o dossiê | Seção de registros aberta, filtro aplicado, dossiê específico aberto |
| U05 | Localize onde exportar e restaurar backups do Observatório | Menu Dados & backup aberto e ambos os controles identificados; **sem executar restauração** |

## Planilha de observação — preencher apenas depois do teste real

| ID | Concluiu? (S/N/Bloqueado) | Tempo (s) | Toques | Hesitações (n) | Ajuda (S/N) | Observação e evidência |
| --- | --- | ---: | ---: | ---: | --- | --- |
| U01 | A coletar | — | — | — | — | — |
| U02 | A coletar | — | — | — | — | — |
| U03 | A coletar | — | — | — | — | — |
| U04 | A coletar | — | — | — | — | — |
| U05 | A coletar | — | — | — | — | — |

**Definições:** toque = interação intencional com controle; hesitação = pausa de mais de 3 segundos procurando o próximo passo, retorno por engano ou clique exploratório; ajuda = dica verbal ou intervenção externa. Registrar quantas vezes pediu ajuda e onde ocorreu, se aplicável. "Bloqueado" deve ter causa explícita (sem registros sintéticos, login, conexão ou falha técnica).

## Parecer e prioridade

- **Critério mínimo proposto:** 5 tarefas concluídas sem intervenção e nenhuma perda de dados/erro impeditivo. Usar os tempos e toques como linha de base; **não declarar eficiência melhorada sem comparação com a versão anterior ou repetição controlada**.
- **Fricção:** registrar tarefas com hesitação, ajuda ou caminhos inesperados; identificar rótulos confusos, caminhos longos e componentes fora de vista.
- **Se houver falha:** abrir issue com ID U01–U05, reprodução, contexto do dispositivo, impacto observado e evidência; não criar correções especulativas.
- **Decisão:** aprovar o fluxo móvel apenas após evidência física. Até lá, resultados automatizados comprovam regressão técnica, não eficácia da experiência de usuário.

**Escopo:** a produção histórica permanece preservada; sem merge, dados reais ou alteração do Supabase.
