"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkOrderPaymentStatusAction } from "@/app/(checkout)/checkout/actions";

// Quando orderId é fornecido, consulta o MP diretamente a cada 8s e atualiza
// o banco antes de chamar router.refresh(). Para após 8 minutos.
export function OrderStatusPoller({
  hasPending,
  orderId,
}: {
  hasPending: boolean;
  orderId?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasPending) return;

    let ticks = 0;
    const MAX_TICKS = 60; // 60 × 8s = 8 min

    const id = setInterval(async () => {
      ticks++;

      if (orderId) {
        const result = await checkOrderPaymentStatusAction(orderId);
        if (result.paymentStatus === "aprovado") {
          clearInterval(id);
          router.refresh();
          return;
        }
      }

      router.refresh();
      if (ticks >= MAX_TICKS) clearInterval(id);
    }, 8000);

    return () => clearInterval(id);
  }, [hasPending, orderId, router]);

  return null;
}
