"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-foreground text-background border-t border-white/10">
      <div className="container mx-auto max-w-7xl px-4 py-4 sm:py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <p className="flex-1 text-sm text-white/90 leading-relaxed">
            Usamos cookies para melhorar sua experiência de compra e personalizar conteúdo.
            Ao continuar navegando, você concorda com nossa{" "}
            <Link
              href="/editora/politica-de-privacidade"
              className="underline underline-offset-2 hover:text-white"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={decline}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3 text-xs"
            >
              Recusar
            </Button>
            <Button
              size="sm"
              onClick={accept}
              className="bg-brand hover:bg-brand-700 text-white h-8 px-4 text-xs font-medium"
            >
              Aceitar cookies
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
