# Painel Arena

Produto interno do **Arena Afiliados** (Grupo Dupla). Um painel único que resolve duas dores da operação de afiliados de apostas, ambas alimentadas pelos canais de Telegram dos 8 afiliados.

## Os dois módulos

**Módulo A, Inteligência de Conteúdo.** Mapeia e categoriza de forma exaustiva tudo que é postado nos canais de dica e entrega esse conteúdo de forma navegável, pra que o time relacione manualmente conteúdo com resultado. O painel gera o insumo, o humano faz a leitura.

**Módulo B, Central de Reembolso e Suporte.** Centraliza o atendimento de reembolso dos 8 canais (via SendPulse) num lugar só, com fila por tempo de espera e SLA, pra ninguém mais cair no buraco.

## Stack

* **Frontend e backend:** Next.js (App Router), deploy na Vercel
* **Banco, Auth e Realtime:** Supabase (Postgres)
* **Categorização (Módulo A):** API do Claude (Anthropic)
* **Fontes de dado:** Telegram Bot API (Módulo A), SendPulse Webhooks (Módulo B)

## Documentação

* [`docs/PRD.md`](docs/PRD.md), Product Requirements Document
* [`docs/RISCOS-E-DIRECAO-VISUAL.md`](docs/RISCOS-E-DIRECAO-VISUAL.md), riscos a monitorar e palpite de direção visual (fora do PRD)

## Status

Em definição. Primeira entrega prevista: v1 do Módulo B (valida a stack ponta a ponta).

## Quem constrói

Natan, com o Claude conduzindo o código. Sem dev sênior no time, por isso a stack é proposital simples.
