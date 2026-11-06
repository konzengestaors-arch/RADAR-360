# RADAR 360 — Instruções para agentes de desenvolvimento

## Contexto
RADAR 360 é um projeto independente de inteligência comercial e observação econômica regional. O repositório é **público**. A versão publicada permanece intocada até aprovação de homologação.

## Regras inegociáveis
1. Trabalhar na branch `codex/desenvolvimento` ou em branches específicas; nunca fazer push direto para `main`.
2. Não publicar, fazer deploy, conectar Vercel ou alterar produção sem autorização explícita.
3. Não importar dados da Marsh, bases corporativas, clientes, contatos, credenciais, históricos pessoais, backups ou dados privados sem revisão e autorização.
4. Separar RADAR Comercial de RADAR Observatório em código, dados, armazenamento, importação e exportação.
5. Tratar todos os dados de demonstração como sintéticos. Não reutilizar informação proprietária em exemplos.
6. Toda alteração exige diff inspecionável, teste pertinente e registro de versão/commit; não alegar homologação apenas com base em documentação.
7. Preservar versões existentes. Não reconstruir o projeto do zero sem evidência e decisão.
8. Não implementar coleta que viole limites, termos de uso ou licenças de fontes.
9. Validar isolamento de usuários/organizações, inclusive autenticação e autorização no servidor quando aplicáveis. LocalStorage não constitui isolamento entre usuários.
10. Não modificar arquivos de evidência originais; produzir derivados rastreáveis.

## Primeiro ciclo
- Inventariar arquivos-fonte e identificar versão comercial v1.5 e Observatório v1.9 (candidatas, a confirmar).
- Fazer triagem de segredos, dados pessoais, proprietários e licenças antes de importar.
- Criar testes automatizados mínimos de carregamento, persistência, backup/restauração e separação entre módulos.
- Reportar divergências e pendências P0 antes de qualquer deploy.
