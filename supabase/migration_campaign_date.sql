-- Migração: data REAL da campanha (lida do nome), não o created_at do fluxo.
-- O created_at do SendPulse é quando o fluxo foi montado/copiado — o time
-- monta com antecedência e duplica fluxos, então ele não serve como data da
-- campanha. Ex: "VITÓRIA GARANTIDA 06/07" tem created_at = 13/07.
-- Rode no SQL Editor do Supabase. Só adiciona coluna.

alter table campaign_flows add column if not exists campaign_date date;

create index if not exists idx_campflows_campaign_date on campaign_flows (campaign_date desc);
