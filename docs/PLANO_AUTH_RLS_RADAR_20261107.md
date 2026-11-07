# RADAR 360 — Próxima etapa: dados privados e autenticação

**Estado em 07/11/2026:** arquitetura proposta, **não implantada**. A demo HTTPS atual continua funcional somente com armazenamento local e proteção de entrada da Vercel.

## Inventário confirmado
- Supabase `RADAR 360 - Testes` — ID `dulbmxowopxahvfgswou`, região `sa-east-1`, estado `INACTIVE`. **Não reativar automaticamente** nem assumir gratuidade, integridade de dados ou permissões.
- Outro projeto Supabase ativo na conta não foi associado ao RADAR; **não usá-lo**.
- GitHub `konzengestaors-arch/RADAR-360`, PR #1 em rascunho; demo instalada em Vercel staging isolado. A produção legada permanece intocada.

## Decisão de arquitetura

**Fase A — uso privado individual primeiro.** Armazenamento por usuário autenticado e módulo em tabela separada com RLS. Não introduzir organizações, compartilhamento ou permissões corporativas antes de testar negação cruzada.

**SQL proposto:** `docs/propostas/RADAR_RLS_USUARIO_UNICO.sql`. Documento para revisão; não foi aplicado. Dados sensíveis e históricos não devem ser colocados no payload sem revisão de requisitos e segurança.

**Fase B — ensaio independente:** confirmar estado/limites do projeto Supabase de testes antes de reativação; preparar autenticação Supabase Auth em ambiente isolado; nunca usar senha própria em tabela. O browser recebe apenas chave publicável; chave `service_role` ou secret key nunca vai ao cliente.

**Fase C — ensaios negativos obrigatórios** com dois usuários de teste (A e B) e autenticação independente: A cria registro, A consegue ler/editar/apagar o próprio, B não lê nem altera o registro A mesmo com ID explícito, usuário sem login não lê/escreve, A não muda `owner_user_id`, exclusão de sessão bloqueia operações. Confirmar que tabelas não têm grants excessivos e que políticas estão efetivamente ativas no banco, via `supabase test db` e leitura auditada dos privilégios.

**Fase D — migração opt-in:** somente dados fictícios, após backup exportado, dry-run e rollback. Importação não pode destruir a base local atual. Não prometer sincronização ou persistência em nuvem até testes funcionais reais.

## Bloqueios de implantação

1. Projeto RADAR de testes está **inativo**.
2. Nenhum teste real de RLS em banco ativo foi executado neste ciclo.
3. O app atual não contém integração Supabase Auth nem backend autorizado por usuário.
4. A versão Comercial v1.5 operacional não tem fonte canônica comprovada.
5. Não há autorização para usar dados corporativos, pessoais ou de clientes.

**Critério de encerramento:** Auth e RLS implantados em ambiente separado, verificados com contas A/B e testes de isolamento e recuperação. Até lá: apenas laboratório sintético com acesso Vercel protegido.

Referência técnica: https://supabase.com/docs/guides/database/postgres/row-level-security
