import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/editora",
  "/auth/login",
  "/auth/cadastro",
  "/auth/recuperar-senha",
  "/auth/callback",
];

const ADMIN_ROUTES = /^\/admin/;
const AFILIADO_PAINEL = /^\/afiliados\/painel/;

// Rotas EAD públicas (sem autenticação)
const EAD_PUBLIC_ROUTES = /^\/(ead\/cursos|ead\/cursos\/[^/]+)$/;
// Rotas EAD que exigem autenticação mas não papel específico (estudante comum)
const EAD_AUTH_ROUTES = /^\/ead/;

const ROLE_ROUTES: Record<string, RegExp> = {
  admin_editora: /^\/admin\/editora/,
  admin_ead:     /^\/admin\/ead/,
  admin_eifol:   /^\/admin\/eifol/,
};

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get("host") ?? "";

  // Injeta o hostname como header para que Server Components possam resolver o tenant
  supabaseResponse.headers.set("x-tenant-hostname", hostname);

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (
    isPublic ||
    pathname.startsWith("/editora") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/afiliados/inscricao") ||
    (pathname.startsWith("/afiliados") && !AFILIADO_PAINEL.test(pathname)) ||
    pathname.startsWith("/api/") ||
    EAD_PUBLIC_ROUTES.test(pathname)
  ) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Rotas admin: verificação de role
  if (ADMIN_ROUTES.test(pathname)) {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (rolesData as Array<{ role: string }> | null)?.map((r) => r.role) ?? [];
    const isSuperAdmin = userRoles.includes("super_admin");

    if (!isSuperAdmin) {
      const hasAccess = Object.entries(ROLE_ROUTES).some(
        ([role, pattern]) =>
          userRoles.includes(role) && pattern.test(pathname)
      );

      if (!hasAccess) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        return NextResponse.redirect(url);
      }
    }
  }

  // Rotas EAD autenticadas: qualquer usuário logado tem acesso
  // (a verificação de matrícula é feita na Route Handler do token Bunny)
  if (EAD_AUTH_ROUTES.test(pathname)) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
