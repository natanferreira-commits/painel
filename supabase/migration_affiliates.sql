-- Migração: registro de afiliados (Gestão → Afiliados)
-- Rode ISTO no SQL Editor do Supabase ANTES de a tela /afiliados subir.
-- Idempotente: pode rodar mais de uma vez sem duplicar.

-- Novas colunas do cadastro/mapeamento.
alter table affiliates add column if not exists nicho text;
alter table affiliates add column if not exists telegram_channel_id text; -- liga em posts.channel_id (ferramenta Conteúdo)
alter table affiliates add column if not exists ativo boolean not null default true;
-- id_bot_sendpulse já existe no schema (liga o atendimento/campanha do SendPulse).

create index if not exists idx_affiliates_channel on affiliates (telegram_channel_id);

-- Seed dos afiliados atuais (idempotente por nome). Nicho do Cabreloa e da Maria
-- ficam em branco pra você preencher na tela.
insert into affiliates (nome, nicho)
select v.nome, v.nicho
from (values
  ('Mateus Caumo', 'futebol'),
  ('Gol do Rayo', 'ao vivo'),
  ('El Barba', 'NBA'),
  ('Rennan Bragança', 'corrida'),
  ('Vitor ZZ', 'FIFA'),
  ('Cabreloa', null),
  ('Maria', null)
) as v(nome, nicho)
where not exists (
  select 1 from affiliates a where a.nome = v.nome
);
