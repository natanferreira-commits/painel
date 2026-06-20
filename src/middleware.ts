import { NextRequest, NextResponse } from "next/server";

// Protege o painel com uma senha simples (HTTP Basic Auth).
// Se PANEL_PASSWORD nao estiver definido (ex: dev local), nao bloqueia.
// O webhook /api/sendpulse fica de fora pra o SendPulse conseguir postar.
export function middleware(req: NextRequest) {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Autenticacao necessaria", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel Arena"' },
  });
}

export const config = {
  // Tudo, menos as rotas de API, estaticos e favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
