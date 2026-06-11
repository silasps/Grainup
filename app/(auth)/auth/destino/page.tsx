import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/actions/get-my-role";
import { Logo } from "@/components/shared/logo";
import { Store, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

function roleToAdminArea(role: string): { href: string; label: string } | null {
  if (role === "super_admin" || role === "admin_editora") return { href: "/admin/editora", label: "Painel Admin" };
  if (role === "admin_ead") return { href: "/admin/ead", label: "Painel EAD" };
  if (role === "admin_eifol") return { href: "/admin/eifol", label: "Painel EIFOL" };
  if (role === "afiliado_jocum" || role === "afiliado_diretor" || role === "afiliado_geral" || role === "lider_jocum") return { href: "/afiliados/painel", label: "Área de Afiliado" };
  return null;
}

export default async function DestinoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getMyRole(user.id);
  const area = role ? roleToAdminArea(role) : null;

  if (!area) redirect("/editora");

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <Logo href="/editora" imageClassName="h-16" />
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 flex flex-col gap-6 w-full">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-muted-foreground text-sm">Login realizado com sucesso!</p>
          <h1 className="font-heading text-2xl font-bold text-foreground">Para onde ir?</h1>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/editora"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-brand hover:bg-brand/5 transition-colors group"
          >
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary group-hover:bg-brand/10 transition-colors">
              <Store className="h-5 w-5 text-muted-foreground group-hover:text-brand transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">Acessar a Loja</p>
              <p className="text-xs text-muted-foreground">Navegue pelo catálogo de livros</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>

          <Link
            href={area.href}
            className="flex items-center gap-4 p-4 rounded-xl border border-brand-100 bg-brand-50 hover:bg-brand-100 transition-colors group"
          >
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 group-hover:bg-brand-200 transition-colors">
              <ShieldCheck className="h-5 w-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-brand-800 text-sm">{area.label}</p>
              <p className="text-xs text-brand-600">Sua área de acesso especial</p>
            </div>
            <ChevronRight className="h-4 w-4 text-brand-500 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
