-- Migracao: taxonomia de conteudo remodelada (por objetivo) + link determinístico.
-- Rode no SQL Editor do Supabase depois de subir o deploy com o codigo novo.

-- 1) Link determinístico (detectado do Telegram, sem IA), setado na ingestao.
alter table posts add column if not exists has_link boolean;

-- 2) A taxonomia de cat_tipo mudou: entrou green/red/reembolso, a interacao foi
--    desmembrada (enquete/interacao/motivacional) e saiu educacional/prova_social/
--    dica/cta_cadastro. Pra reprocessar tudo com o modelo novo, zera a
--    categorizacao. O backfill (/api/categorize) recategoriza e ja preenche o
--    has_link dos posts antigos a partir do payload cru.
update posts set categorized_at = null;

-- 3) Depois da migracao, rode o backfill ate zerar os pendentes (25 por chamada):
--    GET (ou POST) em  https://SEU-DOMINIO/api/categorize
--    Repita ate "processed" voltar 0.

-- Opcional (quando tiver certeza que nada le mais a coluna velha):
-- alter table posts drop column if exists cat_tem_link;
