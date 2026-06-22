"use client";

import { useState } from "react";
import { Check, FileText, Printer, Package, BookOpen, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { markFulfillmentStepAction } from "@/app/(admin)/admin/editora/pedidos/actions";
import { toast } from "sonner";

interface Props {
  orderId: string;
  blingOrderId: number | null;
  invoiceNumber: string | null;
  notaImpressa: boolean;
  postagemGerada: boolean;
  orderStatus: string;
  trackingCode: string | null;
}

interface Step {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}

export function FulfillmentPipelineCard({
  orderId,
  blingOrderId,
  invoiceNumber,
  notaImpressa: initialNotaImpressa,
  postagemGerada: initialPostagemGerada,
  orderStatus,
  trackingCode,
}: Props) {
  const [notaImpressa, setNotaImpressa] = useState(initialNotaImpressa);
  const [postagemGerada, setPostagemGerada] = useState(initialPostagemGerada);
  const [loading, setLoading] = useState<string | null>(null);

  const isPaid = ["pago", "separando", "enviado", "entregue"].includes(orderStatus);
  if (!isPaid) return null;

  async function markStep(step: "nota_impressa" | "postagem_gerada", currentValue: boolean) {
    setLoading(step);
    const result = await markFulfillmentStepAction(orderId, step, !currentValue);
    setLoading(null);
    if (result.error) { toast.error(result.error); return; }
    if (step === "nota_impressa") setNotaImpressa(!currentValue);
    if (step === "postagem_gerada") setPostagemGerada(!currentValue);
  }

  const notaEmitida = !!(blingOrderId || invoiceNumber);
  const livroSeparado = ["separando", "enviado", "entregue"].includes(orderStatus);
  const enviado = ["enviado", "entregue"].includes(orderStatus);

  const steps: Step[] = [
    {
      key: "nota",
      label: "Nota emitida",
      description: invoiceNumber
        ? `NF-e ${invoiceNumber.slice(0, 8)}...`
        : blingOrderId
          ? `Bling #${blingOrderId}`
          : "Use o botao Enviar ao Bling no card acima",
      icon: FileText,
      done: notaEmitida,
      hint: !notaEmitida ? "Use o card Bling ERP para enviar" : undefined,
    },
    {
      key: "impressa",
      label: "Nota impressa",
      description: notaImpressa ? "Confirmado" : "Imprima o DANFE antes de embalar",
      icon: Printer,
      done: notaImpressa,
      actionLabel: notaImpressa ? "Desfazer" : "Marcar como impressa",
      onAction: notaEmitida ? () => markStep("nota_impressa", notaImpressa) : undefined,
    },
    {
      key: "postagem",
      label: "Postagem gerada",
      description: postagemGerada
        ? (trackingCode ? `Rastreio: ${trackingCode}` : "Confirmado")
        : "Gere a etiqueta dos Correios / transportadora",
      icon: Package,
      done: postagemGerada,
      actionLabel: postagemGerada ? "Desfazer" : "Marcar postagem gerada",
      onAction: notaEmitida ? () => markStep("postagem_gerada", postagemGerada) : undefined,
      hint: !notaImpressa && !postagemGerada ? "Imprima a nota primeiro" : undefined,
    },
    {
      key: "separar",
      label: "Livro separado",
      description: livroSeparado
        ? "Confirmado"
        : "Altere o status para Separando ao embalar",
      icon: BookOpen,
      done: livroSeparado,
      hint: !livroSeparado ? "Use o seletor de status acima" : undefined,
    },
    {
      key: "enviado_step",
      label: "Enviado",
      description: enviado
        ? "Confirmado"
        : "Altere o status para Enviado apos despachar",
      icon: Truck,
      done: enviado,
      hint: !enviado ? "Use o seletor de status acima" : undefined,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      <h3 className="text-sm font-semibold">Etapas de envio</h3>
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLoading = loading === (step.key === "impressa" ? "nota_impressa" : "postagem_gerada");
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                <div className={cn(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  step.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border bg-background text-muted-foreground"
                )}>
                  {step.done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn("w-px flex-1 min-h-[12px]", step.done ? "bg-emerald-300" : "bg-border")} />
                )}
              </div>
              <div className="flex-1 pb-2">
                <p className={cn("text-sm font-medium leading-tight", step.done ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                {step.onAction && (
                  <button
                    onClick={isLoading ? undefined : step.onAction}
                    className={cn(
                      "mt-1.5 text-xs px-2.5 py-1 rounded border font-medium transition-colors",
                      isLoading
                        ? "border-border text-muted-foreground opacity-50 cursor-wait pointer-events-none"
                        : "border-brand/40 text-brand hover:bg-brand/5 cursor-pointer"
                    )}
                  >
                    {isLoading ? "Salvando..." : step.actionLabel}
                  </button>
                )}
                {step.hint && !step.onAction && (
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 italic">{step.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
