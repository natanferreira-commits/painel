-- Migração: agregação de conteúdo no banco (mata o teto de 1000 linhas).
-- Em vez de puxar cada post e contar na aplicação (que estoura no limite de
-- linhas da API), o Postgres conta e devolve já somado — resposta sempre pequena.
-- Rode ISTO no SQL Editor do Supabase. Só cria funções; não toca em dado.

-- Volume por bucket (dia/semana) x tipo, opcionalmente filtrado por canais.
-- Janela: últimos ~15 dias (dia) ou ~57 dias (semana). Fuso: America/Sao_Paulo.
create or replace function content_buckets(
  p_bucket text,
  p_channel_ids text[] default null
)
returns table(bucket_key text, cat_tipo text, cnt bigint)
language sql
stable
as $$
  select
    case
      when p_bucket = 'week'
        then to_char(date_trunc('week', (posted_at at time zone 'America/Sao_Paulo')), 'YYYY-MM-DD')
      else to_char((posted_at at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD')
    end as bucket_key,
    coalesce(cat_tipo, 'outro') as cat_tipo,
    count(*) as cnt
  from posts
  where categorized_at is not null
    and posted_at >= now() - (case when p_bucket = 'week' then interval '57 days' else interval '15 days' end)
    and (p_channel_ids is null or channel_id = any (p_channel_ids))
  group by 1, 2;
$$;

-- Contagem por tipo num período (em dias), opcionalmente por canais.
create or replace function content_tipo_counts(
  p_channel_ids text[] default null,
  p_since_days int default 30
)
returns table(cat_tipo text, cnt bigint)
language sql
stable
as $$
  select coalesce(cat_tipo, 'outro') as cat_tipo, count(*) as cnt
  from posts
  where categorized_at is not null
    and posted_at >= now() - ((p_since_days || ' days')::interval)
    and (p_channel_ids is null or channel_id = any (p_channel_ids))
  group by 1;
$$;

-- Contagem por hora do dia (fuso SP) num período — pra achar o horário de pico.
create or replace function content_hour_counts(
  p_channel_ids text[] default null,
  p_since_days int default 30
)
returns table(hour int, cnt bigint)
language sql
stable
as $$
  select extract(hour from (posted_at at time zone 'America/Sao_Paulo'))::int as hour, count(*) as cnt
  from posts
  where categorized_at is not null
    and posted_at >= now() - ((p_since_days || ' days')::interval)
    and (p_channel_ids is null or channel_id = any (p_channel_ids))
  group by 1;
$$;

-- Lista de canais com contagem de posts (pro filtro).
create or replace function channel_list()
returns table(channel_id text, channel_title text, cnt bigint)
language sql
stable
as $$
  select channel_id, max(channel_title) as channel_title, count(*) as cnt
  from posts
  group by channel_id;
$$;
