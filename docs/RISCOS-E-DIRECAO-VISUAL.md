# Riscos a monitorar e direção visual

> Este documento não faz parte do PRD. São anotações de apoio: o que pode dar errado e um palpite de linha visual pro painel.

---

## Parte 1, riscos e pontos de atenção

### Risco alto (pode matar o projeto ou o valor)

**1. Leitura errada do conteúdo versus resultado.**
A relação conteúdo versus resultado é feita por humano (decisão de escopo). O risco não é mais o sistema concluir errado, e sim o humano tirar conclusão causal de algo que é só coincidência, já que muita coisa acontece na mesma janela (jogo importante, promoção da casa, mídia paga rodando).
Mitigar: tratar tudo como correlação, nunca como causa. Mostrar de forma discreta os eventos externos na linha do tempo, justamente pra a pessoa não confundir movimento natural com efeito de conteúdo. Olhar tendência ao longo de muitas janelas, não um dia isolado.

**2. Oito afiliados é pouco.**
Qualquer perfil ou agrupamento com 8 afiliados é frágil estatisticamente. Risco de inventar padrão onde não tem.
Mitigar: perfilamento qualitativo assistido por humano no começo. Só prometer rigor estatístico quando o volume crescer.

**3. O Módulo B vira painel de ansiedade.**
Se ninguém é dono ou incentivado a zerar a fila, mostrar a fila não resolve, só deixa o problema visível e parado. Esse risco é organizacional, não técnico.
Mitigar: deixar explícito que isso depende do dono. Enquanto isso, focar o produto em reduzir fricção (intake estruturado) pra que mesmo sem incentivo o atendimento fique fácil o bastante.

**4. Dependência de webhook do SendPulse (perda de evento).**
Webhook pode falhar ou perder mensagem. Se a fila mentir, a confiança no painel cai e ninguém usa.
Mitigar: guardar o evento cru. Reconciliar periodicamente via API REST. Mostrar última sincronização no painel.

### Risco médio

**5. Mudança ou limite da API do Telegram ou do SendPulse.**
Bot pode ser removido do canal, token revogado, rate limit. Mitigar: monitorar saúde da ingestão. Alerta se um canal parar de chegar dado.

**6. Custo de LLM no Módulo A.**
Categorizar cada post tem custo por chamada. Com volume alto (a gente posta muito), pode pesar. Mitigar: usar modelo barato pra categorização, agrupar em lote, cachear.

**7. Privacidade e sensibilidade dos dados de atendimento.**
Conversas de reembolso têm dado de usuário. Mitigar: acesso restrito, não expor além do necessário, atenção à LGPD.

**8. Qualidade da categorização.**
O LLM pode errar tag, principalmente em posts curtos ou ambíguos, ou em mídia (vídeo bolinha, print). Mitigar: taxonomia bem definida com exemplos. Permitir correção manual. Revisar amostra.

**9. Identificação consistente do afiliado entre as fontes.**
Casar o bot do SendPulse, o bot do Telegram e o afiliado precisa de um mapeamento confiável. Mitigar: tabela affiliates como fonte única de verdade desde o dia 1.

### Atenção (não bloqueia, mas anota)

**10. Escopo escorregando.** Fácil querer atender pelo painel, métricas mirabolantes, correlação automática. Segurar no v1.
**11. Fuso e timestamp.** SendPulse manda date em ms, Telegram em outro formato. Padronizar timezone (Brasil) cedo pra não bagunçar linha do tempo e SLA.
**12. Onboarding de novo afiliado.** Quando entrar o nono, décimo, o sistema tem que escalar sem retrabalho. Pensar nisso no modelo de dados.

---

## Parte 2, palpite de direção visual

> É um chute inicial pra dar norte, não decisão fechada. Você é o designer, refina à vontade.

### Conceito
Um cockpit operacional, não um BI bonito de PowerPoint. A vibe é de sala de controle: denso de informação, mas calmo, e o olho vai sozinho pro que precisa de ação. Dark first (o operador olha o dia inteiro, dark cansa menos e dá ar de ferramenta séria e de tempo real).

### Tom
* Sério e confiável, não festivo. É ferramenta de trabalho e mexe com dinheiro e atendimento.
* Ação em destaque, resto em segundo plano. O que está esperando resposta grita, o resolvido some.

### Paleta (sugestão)
* **Base:** cinza grafite ou quase preto no fundo, com camadas em tons de cinza pra criar profundidade.
* **Texto:** branco suave ou cinza claro (evitar branco puro).
* **Accent de marca:** um tom de roxo funciona bem (combina com a identidade da Klicka, se quiser coerência entre seus projetos). Usar com parcimônia, só em estado ativo, foco e CTA.
* **Cores semânticas (semáforo de SLA):**
  * verde, em dia ou resolvido
  * âmbar, esperando há um tempo (atenção)
  * vermelho, passou do limite (vazamento iminente)
  * Usar cor com parcimônia e sempre com reforço não cromático (ícone ou label) por acessibilidade.

### Tipografia
* Sans serif limpa e legível em tamanho pequeno (exemplo: Inter, Geist, IBM Plex Sans).
* Números e contadores com fonte tabular ou mono (cronômetro de espera, métricas) pra não dançar.

### Layout do Módulo B (a fila)
* Lista densa estilo inbox de triagem, não cards gigantes. Cada linha: afiliado, trecho da última mensagem, tag do fluxo, cronômetro de espera (cor pelo SLA), status.
* Filtros no topo (afiliado, status, só esperando).
* Atualização Realtime com um destaque sutil quando entra item novo, sem barulho visual exagerado.
* Estado vazio que comemora (fila zerada), reforço positivo pra quem atende.

### Layout do Módulo A (a inteligência)
* Mais analítico. Cada afiliado com um card de perfil (a assinatura de conteúdo, um gráfico de distribuição de tags simples, tipo barras horizontais ou donut).
* Linha do tempo navegável do acervo, com os eventos externos marcados de forma discreta ao fundo (não competem com o conteúdo).
* Visão comparativa lado a lado entre afiliados parecidos.

### Princípios
1. Densidade calma. Muita informação sem poluição, espaço escuro pra respirar.
2. Cor é significado. Cor só carrega estado (SLA, alerta), nunca decoração.
3. Mobile aware no Módulo B. O atendente pode querer olhar a fila do celular, a lista tem que funcionar em tela estreita.
4. Velocidade percebida. Realtime e skeletons, nunca uma tela parada em carregando.

### Referências de vibe
Linear (densidade calma, dark, foco), Vercel dashboard (minimalismo técnico), painéis de status e observabilidade (semáforo de SLA), inbox de triagem tipo Front ou Missive (a metáfora certa pro Módulo B).
