-- Conversas que o time ocultou da fila (Modulo B).
-- Rode no SQL Editor do Supabase.
create table if not exists dismissed_conversations (
  contact_id text primary key,
  created_at timestamptz not null default now()
);
