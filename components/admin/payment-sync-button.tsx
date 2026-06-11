"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminSyncPaymentAction } from "@/app/(admin)/admin/editora/pedidos/[id]/actions";

export function PaymentSyncButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    const result = await adminSyncPaymentAction(orderId);
    setLoading(false);

    if (result.status === "aprovado") {
      toast.success(result.message);
      router.refresh();
    } else if (result.status === "sem_id") {
      toast.warning(result.message);
    } else {
      toast.info(result.message);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full text-xs"
      onClick={handleSync}
      disabled={loading}
    >
      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Verificando no MP…" : "Verificar pagamento no MP"}
    </Button>
  );
}
