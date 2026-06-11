"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Chama router.refresh() a cada 8s enquanto houver pedido aguardando pagamento.
// Para após 8 minutos (tempo máximo razoável para um PIX ser confirmado).
export function OrderStatusPoller({ hasPending }: { hasPending: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasPending) return;

    let ticks = 0;
    const MAX_TICKS = 60; // 60 × 8s = 8 min

    const id = setInterval(() => {
      ticks++;
      router.refresh();
      if (ticks >= MAX_TICKS) clearInterval(id);
    }, 8000);

    return () => clearInterval(id);
  }, [hasPending, router]);

  return null;
}
