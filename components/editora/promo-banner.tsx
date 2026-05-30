"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Tag } from "lucide-react";

const APPEAR_DELAY = 2000;
const AUTO_CLOSE = 7000;

export function PromoBanner() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startAutoClose() {
    timerRef.current = setTimeout(() => setVisible(false), AUTO_CLOSE);
  }

  function clearAutoClose() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => {
    const appear = setTimeout(() => {
      setVisible(true);
      startAutoClose();
    }, APPEAR_DELAY);
    return () => {
      clearTimeout(appear);
      clearAutoClose();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="bg-brand text-white text-sm py-2.5 px-4 relative animate-in slide-in-from-top duration-300"
      onMouseEnter={clearAutoClose}
      onMouseLeave={startAutoClose}
    >
      <div className="container mx-auto max-w-7xl flex items-center justify-center gap-3">
        <Tag className="h-4 w-4 shrink-0" />
        <p className="text-center leading-snug">
          <span className="font-semibold">Frete grátis</span> em compras acima de R$200 para todo o Brasil.{" "}
          <Link href="/editora/ofertas" className="underline underline-offset-2 hover:text-white/80 transition-colors font-medium">
            Ver ofertas →
          </Link>
        </p>
        <button
          onClick={() => { clearAutoClose(); setVisible(false); }}
          aria-label="Fechar aviso"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
