# PRD, Painel Arena

| Campo | Valor |
|---|---|
| Produto | Painel Arena (interno) |
| Empresa | Arena Afiliados, Grupo Dupla |
| Autor | Natan Ferreira |
| Quem constrói | Natan mais Claude (sem dev sênior no time) |
| Status | Em definição |
| Última atualização | 2026-06-20 |

---

## 1. Resumo executivo

O Arena Afiliados opera em modelo de agência de performance para influenciadores no nicho de apostas, com 8 afiliados. Cada afiliado mantém um canal de dicas no Telegram. Hoje a operação tem duas dores que custam dinheiro e energia.

1. Não conseguimos enxergar nem aprender com o que é postado nos 8 canais de forma sistemática. Falta um lugar que mapeie tudo que foi publicado pra que o time consiga olhar conteúdo e resultado lado a lado.
2. O atendimento de reembolso está disperso e vazando. Durante a Copa o volume escalou, pessoas não receberam reembolso, e isso frustrou afiliados. Conferir 8 canais na mão é inviável.

O Painel Arena é um produto único, com dois módulos que compartilham a mesma infraestrutura (webhook, função serverless, banco), resolvendo as duas dores.

* **Módulo A, Inteligência de Conteúdo** (analítico): mapeia de forma exaustiva e categoriza cada post, e entrega esse acervo de forma navegável pra que o time relacione conteúdo com resultado manualmente.
* **Módulo B, Central de Reembolso e Suporte** (operacional): centraliza os atendimentos dos 8 canais num só lugar, prioriza por tempo de espera e impede vazamento.

---

## 2. Contexto e problema

### 2.1. Como a operação funciona hoje
* 8 afiliados, cada um com um canal de dicas no Telegram (canal normal).
* O Arena roda uma ação de reembolso como incentivo de CPA. Manda uma tip. Se a tip "reda" (perde) e a conta é nova, o valor é devolvido.
* A captação de informação de reembolso era feita no mesmo canal das promoções (ruim). Está sendo migrada para um canal e bot dedicado por afiliado, rodando no SendPulse (ferramenta de atendimento).
* O time de suporte é comissionado como time comercial (cerca de 10 por cento do valor do CPA feito com o link dele). Resultado: tem baixo incentivo para atender reembolso, vê como perda de tempo.

### 2.2. Dor 1, cegueira de conteúdo
Não há forma de acompanhar, de forma agregada e estruturada, o que cada afiliado posta. Sem esse mapa, o time não consegue olhar a movimentação no canal junto com o resultado e tirar aprendizado. O objetivo não é o sistema concluir sozinho o que funciona, e sim entregar o conteúdo mapeado e organizado pra que o humano faça essa leitura.

### 2.3. Dor 2, atendimento de reembolso disperso e vazando
Conferir 8 canais individualmente é inviável. Mensagens importantes ficam sem resposta, reembolsos não são pagos, afiliados se frustram. O risco é de confiança (afiliado desanima) e de dinheiro (CPA perdido e má reputação).

---

## 3. Objetivos e métricas de sucesso

### Módulo A
**Objetivo:** mapear de forma exaustiva todo o conteúdo postado e entregar como insumo navegável pra análise humana.

Sucesso quando:
* 100 por cento dos posts dos 8 canais são coletados e categorizados automaticamente.
* O time consegue navegar e filtrar o acervo por afiliado, tipo de conteúdo, casa, formato, gatilho e período.
* Conseguimos visualizar a assinatura de conteúdo de cada afiliado (distribuição de tipos de post, frequência, horários).
* Eventos externos relevantes aparecem de forma discreta na linha do tempo pra contextualizar a leitura.

> O painel não tenta correlacionar conteúdo com CPA automaticamente. Essa relação é feita por humanos. O sistema entrega o mapa, a pessoa tira a conclusão.

### Módulo B
**Objetivo:** zero vazamento de reembolso e fricção mínima pra quem atende.

Sucesso quando:
* Todos os atendimentos dos 8 canais aparecem num único painel.
* Nenhum pedido de reembolso fica esquecido. Todo item esperando resposta é visível e ordenado por tempo de espera.
* O tempo médio até a primeira resposta cai (medível).
* O atendente decide um reembolso (aprovar ou negar) sem precisar caçar informação.

---

## 4. Usuários

| Persona | Uso principal | Módulo |
|---|---|---|
| Natan (Growth e operação) | Mapear e explorar conteúdo, perfilar afiliados, fazer a leitura conteúdo versus resultado; monitorar saúde do atendimento | A (principal) e B (visão gerencial) |
| Time de suporte (comissionado) | Ver a fila unificada de reembolso e decidir aprovar ou negar com o mínimo de fricção | B |
| Dono da empresa e gestão | Visão macro de SLA e vazamento; insumo pra decisão de incentivo | B (leitura) |

> Nota: o problema de incentivo do suporte é responsabilidade do dono da empresa, não do produto. O papel do Painel é deixar o trabalho à prova de erro (mais fácil, menos erro), não criar incentivo.

---

## 5. Escopo

### 5.1. Módulo A, Inteligência de Conteúdo

**Coleta.** Um bot nosso do Telegram, membro ou admin dos canais de dica, recebe cada post via Telegram Bot API (webhook, função serverless, banco). Como o bot é nosso, somos donos do webhook (sem conflito de consumidor único).

**Categorização.** Cada post passa por uma chamada à API do Claude que aplica uma taxonomia fixa de tags. Dimensões previstas:
* **Tipo:** dica ou palpite, análise ou stats sem tip (categoria valiosa pro apostador bom), bônus ou promo, prova social (print de green), motivacional ou lifestyle, CTA de cadastro, educacional, interação.
* **Casa** mencionada.
* **Modalidade ou esporte.**
* **Formato:** texto, imagem, vídeo, vídeo bolinha (sinaliza humanização), link.
* **Tem link de afiliado?** (sim ou não).
* **Gatilho:** urgência ou FOMO, autoridade, escassez, proximidade ("amigão").
* **Horário e dia da semana.**

**Mapa navegável (o coração do módulo).** O acervo categorizado fica explorável: filtrar por afiliado, tipo, casa, formato, gatilho e período, e ver a linha do tempo de cada canal. A relação entre conteúdo e resultado é feita pelo humano olhando esse mapa. O sistema não conclui causa.

**Atribuição.** Fora de escopo automático. Atribuição post a post é inviável (todos os posts do afiliado usam o mesmo link, não há tracking único por post). A leitura conteúdo versus resultado é manual.

**Eventos externos (contexto discreto).** A visualização mostra, de forma discreta na linha do tempo, eventos externos relevantes (jogos importantes, promoções das casas, datas marcantes). Servem só de contexto pra quem está lendo o mapa não confundir movimento natural com efeito de conteúdo.

**Perfilamento (insumo).** Cada afiliado vira uma distribuição de tags (exemplo: 60 por cento análise técnica, 10 por cento promo, 8 posts por dia, pico às 19h). Isso é apresentado como assinatura de conteúdo pra ajudar o humano a comparar afiliados parecidos. É insumo, não recomendação automática.

> Limitação: com 8 afiliados, qualquer agrupamento é frágil estatisticamente. O perfilamento começa qualitativo, apoiado pelo dado que o painel quantifica. Fica mais forte conforme cresce o número de afiliados e o volume de posts.

### 5.2. Módulo B, Central de Reembolso e Suporte

**Fonte.** SendPulse via webhook (não direto do bot do Telegram, porque o SendPulse é dono do token do bot e um bot do Telegram só aceita um consumidor de webhook por vez). Via SendPulse ainda ganhamos toda a estrutura de atendimento (contato, operador, tags, variáveis de fluxo).

**Natureza.** Não é uma caixa de entrada. É um rastreador de reembolso com SLA e garantia de não vazamento.

**Estado do pedido (ticket):** solicitado, em análise, pago ou negado.

**Visão default:** pedidos não resolvidos, ordenados por tempo de espera. Cada card mostra: afiliado de origem, tag do fluxo (exemplo: reembolso dia 9), tempo esperando, e se está pronto pra decidir.

**Filtro inteligente:** classificar cada mensagem que chega (pedido de reembolso, dúvida de status, reclamação, spam, pergunta geral) e só transformar em card visível o que precisa de humano e está esperando. O resto fica filtrado.

**Intake estruturado (mata a fricção):** o bot de coleta nasce dentro do fluxo do SendPulse. Quando o usuário entra no canal de reembolso, o fluxo coleta de forma padronizada o que é necessário pra decidir (exemplo: print ou ID do bilhete mais confirmação de conta nova). Essas respostas chegam como variáveis no webhook. Resultado: o atendente só aprova ou nega, não caça informação.

---

## 6. Requisitos funcionais

### Módulo B (prioridade, primeira entrega)

**v1**
* [ ] Rota de webhook que recebe eventos do SendPulse (mensagens de entrada e de saída) e grava cada mensagem com: bot ou afiliado, contato, direção (entrada ou saída), timestamp, tags, texto.
* [ ] Tela única com a lista de conversas dos 8 canais que estão esperando resposta (última mensagem é do usuário e sem resposta do operador depois).
* [ ] Ordenação por tempo de espera (maior espera no topo) e cronômetro por card.
* [ ] Tag do fluxo visível no card.
* [ ] Realtime: card novo aparece sozinho (Supabase Realtime).
* [ ] Login (Supabase Auth) restrito ao time.

**v2**
* [ ] Estado do ticket (solicitado, em análise, pago, negado) com ação no painel.
* [ ] Classificação automática da mensagem (reembolso, status, reclamação, spam, geral) pra filtrar ruído.
* [ ] Card "pronto pra decidir" disparado pelo webhook de elemento de fluxo do SendPulse (intake completo).
* [ ] Métricas: tempo médio até primeira resposta, taxa de reembolso resolvido, vazamentos (itens que passaram de X tempo).
* [ ] Visão por afiliado e por operador.

### Módulo A (segunda entrega)

**v1**
* [ ] Bot do Telegram coletando posts dos 8 canais e gravando no banco.
* [ ] Categorização via API do Claude aplicando a taxonomia.
* [ ] Mapa navegável do acervo: filtros por afiliado, tipo, casa, formato, gatilho e período, com linha do tempo por canal.
* [ ] Eventos externos exibidos de forma discreta na linha do tempo.

**v2**
* [ ] Tela de assinatura de conteúdo por afiliado (distribuição de tags, frequência, horários).
* [ ] Visão comparativa entre afiliados parecidos.
* [ ] Exportar o insumo (acervo filtrado) pra análise externa.

---

## 7. Requisitos não funcionais
* **Simplicidade de manutenção:** stack que o Natan mais Claude tocam sem dev sênior.
* **Near real time no Módulo B:** segundos, não minutos (Realtime do Supabase).
* **Confiabilidade de ingestão:** webhooks podem perder evento. Guardar o evento cru e reconciliar periodicamente via API REST.
* **Segurança:** validar assinatura ou segredo nos webhooks. Dados de atendimento são sensíveis (acesso restrito).
* **Custo baixo:** tiers gratuitos ou baratos de Vercel mais Supabase comportam o v1.

---

## 8. Arquitetura técnica

```
                 PAINEL ARENA

 Telegram        (webhook)   Rota /api/telegram   Claude API (tags)   Supabase (Postgres)
 (canais dica)                                                              |    ^
                                                                           |    | Realtime
 SendPulse       (webhook)   Rota /api/sendpulse  ----------------------->  |    |
 (reembolso)                                                                v    |
                                                                        Supabase
                       Next.js (Vercel)  <-- le e assina -->  Supabase
                       (telas Modulo A e Modulo B)
```

**Padrão único dos dois módulos:** evento (webhook), função serverless (rota Next na Vercel), grava no Supabase, painel lê (e assina Realtime no Módulo B). Sem servidor rodando 24 horas.

**Stack:**
* **Next.js (App Router)** no GitHub, deploy automático na Vercel.
* **Supabase:** Postgres (dados relacionais pro acervo do Módulo A), Auth (login do time), Realtime (ping do Módulo B), API automática.
* **API do Claude (Anthropic):** categorização de posts (Módulo A) e classificação de mensagens (Módulo B v2).

---

## 9. Modelo de dados (alto nível)

> Esboço inicial, refinar na implementação.

* **affiliates:** id, nome, id_bot_telegram, id_bot_sendpulse, perfil (opcional).
* **messages_support** (Módulo B): id, affiliate_id, sendpulse_contact_id, operator_id (opcional), direction (entrada ou saída), text, tags, flow_tag, created_at, raw_payload.
* **refund_tickets** (Módulo B v2): id, affiliate_id, contact_id, status, intake (jsonb), opened_at, resolved_at, decided_by.
* **posts** (Módulo A): id, affiliate_id, telegram_msg_id, text, media_type, posted_at, raw.
* **post_tags** (Módulo A): post_id, dimensão, valor (resultado da categorização).
* **external_events** (Módulo A): id, tipo, descrição, início, fim (opcional). Contexto na linha do tempo.

---

## 10. Integrações

| Integração | Uso | Mecanismo | Confirmado |
|---|---|---|---|
| SendPulse | Atendimento de reembolso (Módulo B) | Webhooks (mensagens de entrada e saída, webhook de elemento de fluxo) | Sim, doc oficial |
| Telegram Bot API | Coleta de posts (Módulo A) | Bot nosso, webhook próprio | Sim |
| Claude API | Categorização e classificação | Chamada em função serverless | Sim |
| Eventos externos | Contexto na linha do tempo (Módulo A) | Fonte a definir (manual ou API de calendário) | A definir |

**Detalhe SendPulse (confirmado):** o payload traz objeto `bot` (separa os 8), `contact` (com `tags`, variáveis customizadas, última mensagem), `operator` (quem atendeu), `date` (em ms) e `info`. Eventos de entrada e saída existem separados, então dá pra calcular esperando desde quando. Configuração em Bot Settings, Webhooks (global) e via ação "Send a Webhook" no flow builder.

---

## 11. Roadmap e fases

1. **Fase 0, Setup:** projeto Next mais Supabase mais deploy na Vercel. Rota de webhook recebendo e gravando evento de teste do SendPulse.
2. **Fase 1, Módulo B v1:** fila unificada de reembolso com tempo de espera e Realtime. Valida a stack ponta a ponta e ataca a dor mais urgente.
3. **Fase 2, Módulo B v2:** estado de ticket, classificação, pronto pra decidir, métricas de SLA.
4. **Fase 3, Módulo A v1:** coleta mais categorização de posts, mapa navegável do acervo com eventos externos.
5. **Fase 4, Módulo A v2:** assinatura de conteúdo, comparação entre afiliados, exportação de insumo.

---

## 12. Fora de escopo (por enquanto)
* Atender ou responder o usuário pelo painel (o atendimento segue no SendPulse, o painel só centraliza e decide).
* Correlação automática de conteúdo com CPA (a relação é feita por humano).
* Resolver o modelo de comissão do suporte (responsabilidade do dono).
* Agrupamento estatístico automático de afiliados (8 é pouco, começa qualitativo).
* App mobile nativo.

---

## 13. Questões em aberto
* [ ] Quem zera a fila de reembolso e ganha o quê? (incentivo, decisão do dono, impacta a adoção do Módulo B)
* [ ] O que exatamente precisa ser verificado pra liberar um reembolso? (bilhete vermelho mais conta nova mais o quê?) Define os campos do intake no SendPulse e do card.
* [ ] De onde vêm os eventos externos? Cadastro manual no painel ou alguma API de calendário esportivo?
* [ ] O SendPulse de vocês tem builder de fluxo ou chatbot pra o intake nascer lá dentro? (forte indício de que sim)
* [ ] Granularidade da linha do tempo no Módulo A (dia ou hora?).
