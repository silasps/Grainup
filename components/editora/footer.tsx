"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const LINKS_LOJA = [
  { href: "/editora/livros", label: "Todos os livros" },
  { href: "/editora/combos", label: "Combos" },
  { href: "/editora/ofertas", label: "Ofertas" },
  { href: "/editora/novidades", label: "Novidades" },
];

const LINKS_AJUDA = [
  { href: "/editora/faq", label: "Perguntas frequentes" },
  { href: "/editora/sac", label: "Atendimento (SAC)" },
  { href: "/editora/contato", label: "Fale conosco" },
  { href: "/editora/trocas-e-devolucoes", label: "Trocas e devoluções" },
];

const LINKS_LEGAL = [
  { href: "/editora/politica-de-privacidade", label: "Privacidade" },
  { href: "/editora/termos-de-uso", label: "Termos de uso" },
  { href: "/editora/trocas-e-devolucoes", label: "Política de devoluções" },
];

export function EditoraFooter() {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo variant="white" href="/editora" className="mb-4" />
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Conhecer a Deus e fazê-lo conhecido.
            </p>
            <div className="flex items-center gap-3">
              {[
                { href: "https://instagram.com/editorajocum", label: "Instagram" },
                { href: "https://facebook.com/editorajocum", label: "Facebook" },
                { href: "https://youtube.com/editorajocum", label: "YouTube" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-white/60 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
                  suppressHydrationWarning
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Loja */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Loja</h4>
            <ul className="space-y-2.5">
              {LINKS_LOJA.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ajuda */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Ajuda</h4>
            <ul className="space-y-2.5">
              {LINKS_AJUDA.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programa de afiliados */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Programa</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/afiliados"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Seja um afiliado
                </Link>
              </li>
              <li>
                <Link
                  href="/afiliados/painel"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Painel do afiliado
                </Link>
              </li>
            </ul>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-2">Contato</h4>
              <p className="text-sm text-white/60">
                (41) 9914-35610
              </p>
              <p className="text-sm text-white/60">
                Almirante Tamandaré, PR
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Editora Jocum. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            {LINKS_LEGAL.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
