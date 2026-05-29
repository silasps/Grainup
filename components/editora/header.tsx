"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, User } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { CartBadge } from "@/components/editora/cart-badge";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/editora/livros", label: "Livros" },
  { href: "/editora/combos", label: "Combos" },
  { href: "/editora/ofertas", label: "Ofertas" },
  { href: "/editora/novidades", label: "Novidades" },
  { href: "/editora/contato", label: "Contato" },
];

export function EditoraHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-200",
          scrolled
            ? "bg-white/95 backdrop-blur-sm shadow-sm"
            : "bg-white border-b border-border"
        )}
      >
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Logo />

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-brand bg-brand-50"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Ações */}
            <div className="flex items-center gap-1">
              {/* Busca */}
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <Link href="/editora/livros?busca=">
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Buscar livros</span>
                </Link>
              </Button>

              {/* Conta */}
              <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
                <Link href="/minha-conta">
                  <User className="h-4 w-4" />
                  <span className="sr-only">Minha conta</span>
                </Link>
              </Button>

              {/* Carrinho */}
              <CartBadge />

              {/* Menu mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16" />

      {/* Menu mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMenuOpen(false)}>
          <nav
            className="absolute top-16 left-0 right-0 bg-white border-b border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="container mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-brand bg-brand-50"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-2 flex gap-2">
                <Link
                  href="/minha-conta"
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <User className="h-4 w-4" /> Minha conta
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
