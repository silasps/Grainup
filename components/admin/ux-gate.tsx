"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";
import {
  startUxTrialAction,
  createUxUpgradePaymentAction,
  type UxUpgradeInfo,
} from "@/lib/actions/ux-upgrades";

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function BuyButton({ upgradeKey, label }: { upgradeKey: string; label: string }) {
  const [pending, startTransition] = useTransition();

  function handleBuy() {
    startTransition(async () => {
      const { error, checkoutUrl } = await createUxUpgradePaymentAction(upgradeKey);
      if (error || !checkoutUrl) {
        toast.error(error ?? "Não foi possível iniciar o pagamento.");
        return;
      }
      window.location.href = checkoutUrl;
    });
  }

  return (
    <button
      onClick={handleBuy}
      disabled={pending}
      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex-shrink-0"
    >
      {pending ? "Abrindo pagamento…" : label}
    </button>
  );
}

export function UxGate({
  info,
  newVersion,
  oldVersion,
}: {
  info: UxUpgradeInfo | null;
  newVersion: React.ReactNode;
  oldVersion: React.ReactNode;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  // Só super admin pode alternar manualmente — pra qualquer outro papel isso
  // fica sempre null e não tem efeito nenhum na lógica normal do gate.
  const [previewOverride, setPreviewOverride] = useState<"new" | "old" | null>(null);

  if (!info) {
    return <>{oldVersion}</>;
  }

  function handleStartTrial() {
    startTransition(async () => {
      const { error } = await startUxTrialAction(info!.key);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Experimente por ${info!.trialDays} dias — depois disso, é só comprar pra manter.`);
      router.refresh();
    });
  }

  const showSuperAdminBadge = info.superAdminPreview && info.status !== "trialing" && info.status !== "purchased";

  const showingNew = showSuperAdminBadge
    ? previewOverride !== "old" // super admin: novo por padrão, "old" só se ele escolher
    : info.status === "trialing" || info.status === "purchased";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showSuperAdminBadge && !dismissed && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 bg-violet-50 border-b border-violet-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-3.5 w-3.5 text-violet-700 flex-shrink-0" />
            <p className="text-xs text-violet-900 truncate">
              Prévia de super admin — vendo a versão <strong>{showingNew ? "nova" : "antiga"}</strong> de{" "}
              <strong>{info.title}</strong>.
              {info.status === "none" && " O cliente ainda não experimentou."}
              {info.status === "expired" && " O trial do cliente expirou sem compra."}
              {" "}Isso não inicia nem consome o trial dele.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPreviewOverride(showingNew ? "old" : "new")}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-violet-300 bg-white text-violet-900 text-xs font-medium hover:bg-violet-100 transition-colors"
            >
              Ver versão {showingNew ? "antiga" : "nova"}
            </button>
            <button onClick={() => setDismissed(true)} className="text-violet-700/70 hover:text-violet-900 p-1" aria-label="Fechar aviso">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {!info.superAdminPreview && info.status === "none" && !dismissed && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 bg-brand-50 border-b border-brand-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-brand flex-shrink-0" />
            <p className="text-xs text-foreground truncate">
              <strong>{info.title}</strong> — experimente {info.trialDays} dias grátis, sem compromisso.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleStartTrial}
              disabled={pending}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {pending ? "Ativando…" : "Experimentar grátis"}
            </button>
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Fechar aviso">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {info.status === "trialing" && info.trialEndsAt && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <p className="text-xs text-amber-900">
            Experimentando <strong>{info.title}</strong> — {daysLeft(info.trialEndsAt)} dia(s) restante(s).
            Depois disso volta pra versão anterior.
          </p>
          <BuyButton upgradeKey={info.key} label={`Comprar acesso vitalício — ${formatCurrency(info.price)}`} />
        </div>
      )}

      {!info.superAdminPreview && info.status === "expired" && !dismissed && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 bg-secondary border-b border-border flex-shrink-0">
          <p className="text-xs text-foreground">
            Seu período de teste de <strong>{info.title}</strong> acabou. Os dados continuam guardados —
            compre pra desbloquear de novo, a qualquer momento.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <BuyButton upgradeKey={info.key} label={`Comprar — ${formatCurrency(info.price)}`} />
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Fechar aviso">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {showingNew ? newVersion : oldVersion}
    </div>
  );
}
