"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { backfillFinancialMovements } from "@/app/(admin)/admin/editora/financeiro/actions";

export function FinanceiroBackfillButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const { count } = await backfillFinancialMovements();
      if (count === 0) {
        toast.info("Tudo sincronizado — nenhum pedido novo encontrado.");
      } else {
        toast.success(`${count} pedido${count !== 1 ? "s" : ""} sincronizado${count !== 1 ? "s" : ""} com sucesso.`);
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleSync}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-white text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Sincronizando…" : "Sincronizar histórico"}
    </button>
  );
}
