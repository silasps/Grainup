"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, User, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { CartBadge } from "@/components/editora/cart-badge";
import { LogoutButton } from "@/components/shared/logout-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/editora/livros", label: "Livros", exact: false },
  { href: "/editora/combos", label: "Combos", exact: false },
  { href: "/editora/ofertas", label: "Ofertas", exact: false },
  { href: "/editora/novidades", label: "Novidades", exact: false },
  { href: "/editora/contato", label: "Contato", exact: false },
];

type AdminArea = { href: string; label: string };

export function EditoraHeader({ adminArea }: { adminArea?: AdminArea | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(64);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Mantém o spacer sempre igual à altura real do header
  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setHeaderHeight(entries[0].contentRect.height);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const mobileMenuTop = headerHeight;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-shadow duration-300",
          scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm" : "bg-white border-b border-border"
        )}
      >
        {/* Barra de navegação */}
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <Logo />

            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    (link.exact ? pathname === link.href : pathname.startsWith(link.href))
                      ? "text-brand bg-brand-50"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {adminArea && (
                <Link
                  href={adminArea.href}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {adminArea.label}
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/editora/livros?busca=">
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Buscar livros</span>
                </Link>
              </Button>

              <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
                <Link href="/minha-conta">
                  <User className="h-4 w-4" />
                  <span className="sr-only">Minha conta</span>
                </Link>
              </Button>

              <CartBadge />

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

      {/* Spacer dinâmico — sempre igual à altura real do header */}
      <div style={{ height: headerHeight }} />

      {/* Menu mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          style={{ top: mobileMenuTop }}
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className="bg-white border-b border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="container mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    (link.exact ? pathname === link.href : pathname.startsWith(link.href))
                      ? "text-brand bg-brand-50"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-2 flex flex-col gap-1">
                <Link
                  href="/minha-conta"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                >
                  <User className="h-4 w-4" /> Minha conta
                </Link>
                {adminArea && (
                  <Link
                    href={adminArea.href}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-md hover:bg-brand-100"
                  >
                    <ShieldCheck className="h-4 w-4" /> {adminArea.label}
                  </Link>
                )}
                <LogoutButton variant="menu-item" />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
