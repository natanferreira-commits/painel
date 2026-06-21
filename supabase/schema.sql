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

-- Caixa-preta: payload cru de todo evento recebido do SendPulse (auditoria e debug).
create table if not exists webhook_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  body jsonb not null
);

-- Modulo A: posts dos canais de dica do Telegram (conteudo publicado).
create table if not exists posts (
  id bigint generated always as identity primary key,
  channel_id text not null,
  channel_title text,
  telegram_msg_id bigint,
  text text,
  media_type text,
  posted_at timestamptz not null,
  created_at timestamptz not null default now(),
  raw_payload jsonb not null,
  unique (channel_id, telegram_msg_id)
);

create index if not exists idx_posts_channel on posts (channel_id, posted_at desc);
create index if not exists idx_posts_posted on posts (posted_at desc);

-- Categorizacao do post (preenchida pela IA). categorized_at null = ainda nao categorizado.
alter table posts add column if not exists cat_tipo text;
alter table posts add column if not exists cat_casa text;
alter table posts add column if not exists cat_modalidade text;
alter table posts add column if not exists cat_gatilho text;
alter table posts add column if not exists cat_tem_link boolean;
alter table posts add column if not exists categorized_at timestamptz;

create index if not exists idx_posts_uncategorized on posts (categorized_at) where categorized_at is null;
