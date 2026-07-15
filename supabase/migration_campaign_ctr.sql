-- Migração: fim do funil + categoria por fluxo (pra calcular CTR).
-- Rode no SQL Editor do Supabase. Só adiciona colunas.

alter table campaign_flows add column if not exists end_tag text;
alter table campaign_flows add column if not exists reached int;
alter table campaign_flows add column if not exists category text;

create index if not exists idx_campflows_category on campaign_flows (category);
