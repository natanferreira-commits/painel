-- Migração: agregação de conteúdo por INTERVALO (de..até), não por "últimos N dias".
-- Necessário pro filtro de calendário (permite escolher um período no passado).
-- Rode no SQL Editor do Supabase. Só cria funções novas.

-- Contagem por tipo num intervalo de datas (fuso America/Sao_Paulo).
create or replace function content_tipo_counts_range(
  p_channel_ids text[] default null,
  p_from date default null,
  p_to date default null
)
returns table(cat_tipo text, cnt bigint)
language sql
stable
as $$
  select coalesce(cat_tipo, 'outro') as cat_tipo, count(*) as cnt
  from posts
  where categorized_at is not null
    and (p_from is null or (posted_at at time zone 'America/Sao_Paulo')::date >= p_from)
    and (p_to is null or (posted_at at time zone 'America/Sao_Paulo')::date <= p_to)
    and (p_channel_ids is null or channel_id = any (p_channel_ids))
  group by 1;
$$;

-- Contagem por hora do dia num intervalo (pra achar o horário de pico).
create or replace function content_hour_counts_range(
  p_channel_ids text[] default null,
  p_from date default null,
  p_to date default null
)
returns table(hour int, cnt bigint)
language sql
stable
as $$
  select extract(hour from (posted_at at time zone 'America/Sao_Paulo'))::int as hour, count(*) as cnt
  from posts
  where categorized_at is not null
    and (p_from is null or (posted_at at time zone 'America/Sao_Paulo')::date >= p_from)
    and (p_to is null or (posted_at at time zone 'America/Sao_Paulo')::date <= p_to)
    and (p_channel_ids is null or channel_id = any (p_channel_ids))
  group by 1;
$$;
