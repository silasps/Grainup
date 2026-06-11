"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminSyncPaymentAction } from "@/app/(admin)/admin/editora/pedidos/[id]/actions";

export function AdminOrderStatusPoller({
  orderId,
  hasPending,
}: {
  orderId: string;
  hasPending: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasPending) return;

    let ticks = 0;
    const MAX_TICKS = 60; // 8 min

    const id = setInterval(async () => {
      ticks++;
      const result = await adminSyncPaymentAction(orderId);
      if (result.status === "aprovado" || result.status === "recusado") {
        clearInterval(id);
        router.refresh();
        return;
      }
      router.refresh();
      if (ticks >= MAX_TICKS) clearInterval(id);
    }, 8000);

    return () => clearInterval(id);
  }, [hasPending, orderId, router]);

  return null;
}
