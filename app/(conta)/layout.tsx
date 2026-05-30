import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { LogoutButton } from "@/components/shared/logout-button";
import { User, ShoppingBag, MapPin, ChevronRight, UserCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/minha-conta", label: "Visão geral", icon: User },
  { href: "/minha-conta/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/minha-conta/enderecos", label: "Endereços", icon: MapPin },
  { href: "/minha-conta/dados", label: "Meus dados", icon: UserCircle },
  { href: "/minha-conta/seguranca", label: "Segurança", icon: ShieldCheck },
];

function roleToAdminArea(role: string) {
  if (role === "super_admin" || role === "admin_editora") return { href: "/admin/editora", label: "Painel Admin" };
  if (role === "admin_ead") return { href: "/admin/ead", label: "Painel EAD" };
  if (role === "admin_eifol") return { href: "/admin/eifol", label: "Painel EIFOL" };
  if (role === "afiliado_jocum" || role === "afiliado_diretor" || role === "lider_jocum") return { href: "/editora/afiliados", label: "Área de Afiliado" };
  return null;
}

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  let adminArea: { href: string; label: string } | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1).single();
      if (data) adminArea = roleToAdminArea(data.role);
    }
  } catch { /* unauthenticated */ }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-white">
        <Logo />
        <Link
          href="/editora/livros"
          className="md:hidden text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar à loja
        </Link>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar nav — hidden on mobile (cards on overview page serve as nav) */}
          <aside className="hidden md:block md:col-span-1">
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Minha conta
                </p>
              </div>
              <nav className="flex flex-col">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {adminArea && (
              <Link
                href={adminArea.href}
                className="flex items-center gap-2 mt-3 px-4 py-3 text-sm font-medium bg-brand-50 border border-brand-100 text-brand-700 rounded-xl hover:bg-brand-100 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                {adminArea.label}
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Link>
            )}

            <div className="bg-white rounded-xl border border-border overflow-hidden mt-3">
              <LogoutButton />
            </div>

            <Link
              href="/editora/livros"
              className="block mt-3 text-xs text-center text-brand hover:underline"
            >
              ← Continuar comprando
            </Link>
          </aside>

          {/* Main content */}
          <main className="md:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
