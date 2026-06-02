import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/shared/logo";
import { LogoutButton } from "@/components/shared/logout-button";
import { LayoutDashboard, Link2, ShoppingBag, ChevronRight, BookOpen } from "lucide-react";

const NAV = [
  { href: "/afiliados/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/afiliados/painel#links", label: "Meus links", icon: Link2 },
  { href: "/afiliados/painel#vendas", label: "Minhas vendas", icon: ShoppingBag },
];

export default async function AfiliadosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirectTo=/afiliados/painel");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, status")
    .eq("user_id", user.id)
    .single();

  const displayName = affiliate?.name.split(" ")[0] ?? user.email?.split("@")[0] ?? "Afiliado";

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo className="h-7 w-auto" />
            {affiliate && (
              <nav className="hidden md:flex items-center gap-1">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/editora"
              className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Loja
              <ChevronRight className="h-3 w-3" />
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
