import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { User, ShoppingBag, MapPin, ChevronRight } from "lucide-react";

const NAV = [
  { href: "/minha-conta", label: "Minha conta", icon: User, exact: true },
  { href: "/minha-conta/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/minha-conta/enderecos", label: "Endereços", icon: MapPin },
];

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary">
      <header className="flex h-16 items-center px-6 border-b border-border bg-white">
        <Logo />
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar nav */}
          <aside className="md:col-span-1">
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
