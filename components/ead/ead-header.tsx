"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap, LogIn, LayoutDashboard } from "lucide-react";
import type { Tenant, TenantSettings } from "@/types/ead";

interface Props {
  tenant: Tenant | null;
  settings: TenantSettings | null;
  isLoggedIn: boolean;
}

export function EadHeader({ tenant, settings, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const primaryColor = settings?.primary_color ?? "#1B4332";
  const logoUrl = settings?.logo_url;
  const name = tenant?.name ?? "EAD";

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10"
      style={{ background: primaryColor }}
    >
      <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/ead/cursos" className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image src={logoUrl} alt={name} width={120} height={36} className="h-8 w-auto object-contain" />
          ) : (
            <span className="flex items-center gap-2 text-white font-heading font-bold text-lg">
              <GraduationCap className="h-6 w-6" />
              {name}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/ead/cursos" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
            Cursos
          </Link>
          {isLoggedIn && (
            <Link href="/ead" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Minha área
            </Link>
          )}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Button asChild size="sm" className="bg-white text-foreground hover:bg-white/90 font-semibold">
              <Link href="/ead">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                Meus cursos
              </Link>
            </Button>
          ) : (
            <>
              <Link
                href="/auth/login?redirectTo=/ead"
                className="text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                Entrar
              </Link>
              <Button asChild size="sm" className="bg-white text-foreground hover:bg-white/90 font-semibold">
                <Link href="/auth/cadastro">
                  Criar conta grátis
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setOpen((p) => !p)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/20" style={{ background: primaryColor }}>
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Link href="/ead/cursos" onClick={() => setOpen(false)} className="text-white/90 text-sm font-medium py-1">
              Cursos
            </Link>
            {isLoggedIn && (
              <Link href="/ead" onClick={() => setOpen(false)} className="text-white/90 text-sm font-medium py-1">
                Minha área
              </Link>
            )}
            <div className="pt-2 flex flex-col gap-2">
              {isLoggedIn ? (
                <Button asChild size="sm" className="bg-white text-foreground hover:bg-white/90 font-semibold w-full">
                  <Link href="/ead" onClick={() => setOpen(false)}>
                    <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    Meus cursos
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="border-white text-white hover:bg-white/10 bg-transparent w-full">
                    <Link href="/auth/login?redirectTo=/ead" onClick={() => setOpen(false)}>
                      <LogIn className="h-4 w-4 mr-1.5" />
                      Entrar
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-white text-foreground hover:bg-white/90 font-semibold w-full">
                    <Link href="/auth/cadastro" onClick={() => setOpen(false)}>
                      Criar conta grátis
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
