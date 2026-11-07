# RADAR 360 — Homologação controlada no Android físico

**Estado:** roteiro de ensaio, não evidência de teste executado.
**Ambiente:** somente DEMONSTRAÇÕES sintéticas; proibido inserir dados pessoais, corporativos ou de clientes.
**Condição de segurança:** não utilizar a versão publicada para este ensaio e não limpar armazenamento do navegador que guarda dados reais.

## Preparação
1. Usar Chrome Android em janela normal (não anônima); anotar modelo, versão Android, versão Chrome, data/hora e URL exata utilizada. O arquivo `demo/*.html` no GitHub é fonte de código, **não link funcional de aplicativo**. Para executar, é necessário hospedar a demonstração em origem de testes isolada, com aprovação expressa de publicação, ou abrir um pacote local de testes preparado para essa finalidade.
2. Usar apenas empresas fictícias da demonstração. Não inserir nomes, telefones, empresas, e-mails ou informações reais.
3. Registrar a versão/commit visível na evidência; não comparar dois ambientes/origens diferentes como se compartilhassem armazenamento.

## Cenários de aceite — Comercial
- C01: abrir no dispositivo, verificar aviso de demonstração, três empresas sintéticas e ausência de erros fatais.
- C02: buscar `Beta`, filtrar por SC, retornar para todas, conferir botões sem sobreposição ou corte.
- C03: criar ação fictícia com data e descrição; anotar conteúdo sintético e conferir indicador de ações.
- C04: criar oportunidade `Projeto teste Android` vinculada a `Empresa Exemplo Alfa`; alterar a etapa com motivo e data válida; confirmar duas entradas no histórico.
- C05: fechar completamente a aba/app, reabrir a **mesma URL e origem** e verificar persistência da ação, da oportunidade e do histórico.
- C06: exportar backup JSON sintético; localizar o arquivo salvo no Android e conferir existência/bytes sem compartilhar dados não sintéticos.
- C07: limpar **somente** a chave da demo numa origem descartável e autorizada, ou usar outra origem isolada para restauração, sem remover armazenamento de aplicações reais. Restaurar JSON, confirmar o conteúdo e reabrir.
- C08: tentar importar JSON de esquema incompatível e arquivo danificado. Confirmar rejeição e preservação da base de demonstração.
- C09: com teclado virtual aberto, conferir campos, foco, rolagem, contraste, navegação e botões em modo retrato.

## Cenários de aceite — Observatório
- O01: abrir a demo sem registros documentais iniciais; conferir aviso de demonstração.
- O02: criar indicador inteiramente sintético, fechar/reabrir e confirmar persistência.
- O03: exportar, restaurar e validar a base sintética; rejeitar esquema comercial sem mutação.
- O04: validar legibilidade, navegação e acesso a `Dados & backup` no celular.

## Evidências necessárias
Para cada cenário: identificador (C01... / O01...), PASSOU/FALHOU/BLOQUEADO, commit/hash, dispositivo, navegador, data, passos, resultado observado e screenshot sem informações reais. Em restauração, anexar backup **somente se integralmente sintético**. Reproduzir falhas com passos mínimos.

## Critérios objetivos
- **Aprovado no Android:** 100% dos cenários aplicáveis passaram, sem perda de histórico, sem cruzamento de dados, sem problemas críticos de usabilidade.
- **Bloqueado:** falta link de teste autorizado ou origem separada; resultado não pode ser inferido dos testes CI.
- **Reprovado:** perda de dados, restauração incompatível aceita, informação de outra origem revelada ou impossibilidade de operar controles essenciais.

## Limites de escopo
Não verifica isolamento entre organizações, autenticação ou sincronização de nuvem. Nenhum deploy, acesso a ambientes corporativos ou teste com dados reais está autorizado neste ciclo.

## Atualização de auditoria automatizada — ciclo de 06/11/2026

- Commit auditado: `5c9ea4f1ead0e0492db34526f62a0a0a8453baa0`.
- Evidência CI: https://github.com/konzengestaors-arch/RADAR-360/actions/runs/42319543401
- Resultado: 22 testes Node, 47 Chromium e 18 repetições críticas aprovados.
- Emulação Chromium em cinco larguras verificou foco, botões visíveis, ausência de overflow global e altura de controles essenciais de pelo menos 40 px.
- Teste de rede confirmou ausência de requisições a outras origens durante o fluxo comercial simulado.
- **Não foi realizado teste no Android físico.** Não existe aqui URL de homologação independente autorizada e verificada. Os links para `demo/*.html` no GitHub mostram arquivos-fonte, não uma aplicação hospedada.
- **Portão bloqueado:** para iniciar C01–C09 e O01–O04 em dispositivo real, é necessário um ambiente de testes separado e acessível ao Android, com autorização de disponibilização e nenhuma base real. O GitHub CI não supre essa evidência.
- **Proibição mantida:** não alterar `main`, produção ou conectar bases corporativas; não transformar evidência de emulação em homologação física.

## Pacote local disponibilizado para avaliação

- **Pacote ZIP:** artefato `RADAR_360_ANDROID_TESTE` da execução https://github.com/konzengestaors-arch/RADAR-360/actions/runs/42319976914 (retenção configurada em 14 dias; exige acesso ao artefato pelo GitHub).
- **Manifesto:** `MANIFESTO.json`, com SHA-256 dos dois HTMLs e commit de origem `968f9ec3a5586b498129776a6268b20ae1227709`.
- **Verificação posterior do empacotamento:** commit `baee5f210b4a8efcf544f6c65a79312486156a74`, execução https://github.com/konzengestaors-arch/RADAR-360/actions/runs/42320058549. A suíte confirmou abertura de ambos os HTMLs autocontidos em Chromium, além de 22 Node, 49 Chromium e 18 ensaios repetidos aprovados.
- **Alcance real:** o pacote permite avaliar abertura e usabilidade em arquivo local; não constitui PWA, APK, instalação autenticada ou publicação HTTPS. O comportamento de `localStorage` em `file://` no Android pode ser bloqueado ou variar entre navegadores.
- **Aceite físico pendente:** os cenários C05–C08 e O02–O03, especialmente persistência e restauração, devem ser comprovados numa origem HTTPS de teste separada para representar corretamente o comportamento web final.
- **Não houve deploy** nem alteração da `main` ou produção.
