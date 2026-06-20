-- Painel Arena, schema inicial (Fase 0 e Modulo B v1)
-- Rode isto no SQL Editor do Supabase depois de criar o projeto.

-- Afiliados (fonte unica de verdade pra casar Telegram, SendPulse e CRM)
create table if not exists affiliates (
  id bigint generated always as identity primary key,
  nome text not null,
  id_bot_telegram text,
  id_bot_sendpulse text,
  perfil text,
  created_at timestamptz not null default now()
);

-- Mensagens de atendimento (Modulo B), vindas do webhook do SendPulse
create table if not exists messages_support (
  id bigint generated always as identity primary key,
  affiliate_id bigint references affiliates (id),
  sendpulse_bot_id text,
  sendpulse_contact_id text,
  contact_name text,
  operator_id text,
  operator_name text,
  direction text not null check (direction in ('in', 'out')),
  text text,
  tags text[] not null default '{}',
  flow_tag text,
  event_title text,
  service text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  raw_payload jsonb not null
);

create index if not exists idx_msg_contact on messages_support (sendpulse_contact_id, occurred_at desc);
create index if not exists idx_msg_occurred on messages_support (occurred_at desc);
create index if not exists idx_msg_bot on messages_support (sendpulse_bot_id);

-- Liga o Realtime na tabela de mensagens (o "ping" do painel).
-- Se der erro dizendo que ja existe, pode ignorar.
alter publication supabase_realtime add table messages_support;
