-- RADAR 360 | PROPOSTA, NÃO EXECUTAR EM PRODUÇÃO
-- Escopo: usuário individual autenticado; módulos Comercial e Observatório.
-- Este arquivo NÃO constitui migração homologada. Avaliar em projeto de teste isolado.
begin;
create table if not exists public.radar_private_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module text not null check (module in ('comercial','observatorio')),
  record_key text not null check (length(record_key) between 1 and 128),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, module, record_key)
);
create index if not exists radar_private_records_owner_module_idx
  on public.radar_private_records(owner_user_id,module);
alter table public.radar_private_records enable row level security;
revoke all on public.radar_private_records from public, anon, authenticated;
grant select, insert, update, delete on public.radar_private_records to authenticated;

create policy "radar_owner_select" on public.radar_private_records
 for select to authenticated
 using ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));
create policy "radar_owner_insert" on public.radar_private_records
 for insert to authenticated
 with check ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));
create policy "radar_owner_update" on public.radar_private_records
 for update to authenticated
 using ((select auth.uid()) is not null and owner_user_id = (select auth.uid()))
 with check ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));
create policy "radar_owner_delete" on public.radar_private_records
 for delete to authenticated
 using ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));
commit;
