-- Migração: data de criação do fluxo (pra filtrar campanhas por período).
-- Rode no SQL Editor do Supabase. Só adiciona coluna.

alter table campaign_flows add column if not exists flow_created_at timestamptz;

create index if not exists idx_campflows_created on campaign_flows (flow_created_at desc);
