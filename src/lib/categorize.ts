import Anthropic from "@anthropic-ai/sdk";

// Modelo barato e rapido pra classificacao em volume.
const MODEL = "claude-haiku-4-5";

export const TIPOS = [
  "dica",
  "analise",
  "promo",
  "prova_social",
  "motivacional",
  "cta_cadastro",
  "educacional",
  "interacao",
  "outro",
] as const;

export const GATILHOS = [
  "urgencia",
  "autoridade",
  "escassez",
  "proximidade",
  "nenhum",
] as const;

export type PostCategory = {
  tipo: string;
  casa: string; // "" se nenhuma
  modalidade: string; // "" se nenhuma
  gatilho: string;
  tem_link: boolean;
};

let cached: Anthropic | null = null;
function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY nao configurada");
  if (!cached) cached = new Anthropic({ apiKey: key });
  return cached;
}

const SYSTEM = `Voce classifica posts de canais de Telegram de afiliados de apostas (tipsters).
Para cada post, devolva um objeto JSON com EXATAMENTE estas chaves:

- "tipo": um de [${TIPOS.join(", ")}]
   dica = palpite/entrada pra apostar; analise = estatisticas/leitura de jogo SEM dar o palpite pronto;
   promo = bonus/promocao; prova_social = print de ganho/green; motivacional = lifestyle/conexao;
   cta_cadastro = chamada pra se cadastrar; educacional = ensina algo; interacao = enquete/conversa; outro = nenhum dos anteriores.
- "casa": nome da casa de apostas mencionada, ou "" se nenhuma.
- "modalidade": esporte/modalidade (ex: futebol, basquete, cassino), ou "" se nao der pra saber.
- "gatilho": um de [${GATILHOS.join(", ")}] (gatilho mental predominante; "nenhum" se nao houver).
- "tem_link": true se o post tem link de cadastro/afiliado, senao false.

Responda APENAS com o JSON, sem markdown, sem texto antes ou depois.`;

function clean(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export async function categorizePost(
  text: string | null,
  mediaType: string | null,
): Promise<PostCategory> {
  const client = getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Tipo de midia: ${mediaType ?? "texto"}\n\nTexto do post:\n${text || "(post sem texto, so midia)"}`,
      },
    ],
  });

  const block = resp.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "{}";

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(clean(raw));
  } catch {
    parsed = {};
  }

  return {
    tipo: pick(parsed.tipo, TIPOS, "outro"),
    casa: typeof parsed.casa === "string" ? parsed.casa : "",
    modalidade: typeof parsed.modalidade === "string" ? parsed.modalidade : "",
    gatilho: pick(parsed.gatilho, GATILHOS, "nenhum"),
    tem_link: parsed.tem_link === true,
  };
}
