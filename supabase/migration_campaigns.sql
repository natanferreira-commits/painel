-- Migração: campanhas (fluxos do SendPulse) por afiliado, via snapshot.
-- Rode ISTO no SQL Editor do Supabase. Idempotente.

-- Credenciais da API do SendPulse por afiliado (cada um tem a conta dele).
alter table affiliates add column if not exists sendpulse_client_id text;
alter table affiliates add column if not exists sendpulse_client_secret text;

-- Snapshot dos fluxos: a sincronização puxa da API e grava aqui; as telas leem
-- daqui (instantâneo, sem bater na API a cada abertura).
create table if not exists campaign_flows (
  affiliate_id bigint not null references affiliates (id) on delete cascade,
  flow_id text not null,
  bot_name text,
  name text,
  folder_id text,
  entry_tag text,
  entered int,
  status int,
  captured_at timestamptz not null default now(),
  primary key (affiliate_id, flow_id)
);

create index if not exists idx_campflows_aff on campaign_flows (affiliate_id);
create index if not exists idx_campflows_entered on campaign_flows (entered desc);
