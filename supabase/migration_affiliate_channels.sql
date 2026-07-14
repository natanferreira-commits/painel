-- Migração: vínculo N:N entre afiliados e canais do Telegram.
-- Um afiliado pode ter vários canais; um canal pode ser de vários afiliados
-- (ex: grupo da Copa compartilhado entre Gol do Rayo e Rennan).
-- Rode ISTO no SQL Editor do Supabase. Idempotente.

create table if not exists affiliate_channels (
  affiliate_id bigint not null references affiliates (id) on delete cascade,
  channel_id text not null,
  channel_title text,
  created_at timestamptz not null default now(),
  primary key (affiliate_id, channel_id)
);

create index if not exists idx_affch_channel on affiliate_channels (channel_id);
create index if not exists idx_affch_affiliate on affiliate_channels (affiliate_id);

-- Traz pra tabela de vínculo qualquer canal que já tenha sido ligado no modelo
-- antigo (coluna única telegram_channel_id), pra não perder o que você já mapeou.
insert into affiliate_channels (affiliate_id, channel_id)
select id, telegram_channel_id
from affiliates
where telegram_channel_id is not null
on conflict do nothing;
