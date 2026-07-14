// Cliente da API REST do SendPulse (chatbots). Diferente do webhook: aqui a
// gente CONSULTA (lista fluxos, conta contatos por tag, etc.).
// Credenciais por conta (cada afiliado tem a sua) — via env por enquanto.

const BASE = "https://api.sendpulse.com";

let cached: { token: string; exp: number } | null = null;

export async function spToken(): Promise<string> {
  const id = process.env.SENDPULSE_CLIENT_ID;
  const secret = process.env.SENDPULSE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("SENDPULSE_CLIENT_ID / SENDPULSE_CLIENT_SECRET não configurados");
  }
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) {
    throw new Error(`auth SendPulse falhou (${res.status}): ${JSON.stringify(json)}`);
  }
  cached = {
    token: json.access_token,
    exp: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

// GET genérico na API. Retorna status + corpo cru (pra sondagem/discovery).
export async function spGet(
  path: string,
): Promise<{ status: number; body: unknown }> {
  const token = await spToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}
