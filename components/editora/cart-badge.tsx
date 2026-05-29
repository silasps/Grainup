"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cart";

export function CartBadge() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = useCartStore((s) => s.itemCount());

  return (
    <Link
      href="/editora/carrinho"
      className="relative inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-secondary transition-colors"
      aria-label={`Carrinho${mounted && count > 0 ? ` (${count} itens)` : ""}`}
    >
      <ShoppingCart className="h-5 w-5" />
      {mounted && count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] font-bold bg-brand text-white flex items-center justify-center rounded-full">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
