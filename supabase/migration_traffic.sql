-- Migração: tráfego (gasto da planilha + leads do TrackGram) por afiliado/dia.
-- Rode no SQL Editor do Supabase. Idempotente.

-- URL da planilha publicada (CSV) de cada afiliado — de onde vem o GASTO.
alter table affiliates add column if not exists traffic_sheet_url text;

-- Snapshot diário: gasto (planilha) + funil (TrackGram).
create table if not exists traffic_daily (
  affiliate_id bigint not null references affiliates (id) on delete cascade,
  date date not null,
  gasto numeric(12, 2),
  leads int,          -- entries do TrackGram
  page_views int,
  clicks int,
  registrations int,  -- hoje vem 0 (postback nao configurado)
  ftds int,           -- idem
  captured_at timestamptz not null default now(),
  primary key (affiliate_id, date)
);

create index if not exists idx_traffic_date on traffic_daily (date desc);
create index if not exists idx_traffic_aff on traffic_daily (affiliate_id);
