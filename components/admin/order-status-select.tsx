"use client";

import { useState } from "react";
import { updateOrderStatusAction } from "@/app/(admin)/admin/editora/pedidos/actions";
import type { OrderStatus } from "@/types/database";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "aguardando_pagamento",   label: "Aguardando pagamento",   color: "bg-yellow-100 text-yellow-700 border-yellow-200",  selectable: true },
  { value: "pago",                   label: "Pago",                   color: "bg-blue-100 text-blue-700 border-blue-200",        selectable: true },
  { value: "separando",              label: "Separando",              color: "bg-purple-100 text-purple-700 border-purple-200",  selectable: true },
  { value: "enviado",                label: "Enviado",                color: "bg-indigo-100 text-indigo-700 border-indigo-200",  selectable: true },
  { value: "entregue",               label: "Entregue",               color: "bg-emerald-100 text-emerald-700 border-emerald-200", selectable: true },
  { value: "cancelado",              label: "Cancelado",              color: "bg-red-100 text-red-700 border-red-200",           selectable: true },
  { value: "reembolsado",            label: "Reembolsado",            color: "bg-gray-100 text-gray-600 border-gray-200",        selectable: true },
  { value: "cancelamento_solicitado", label: "Cancelamento solicitado", color: "bg-orange-100 text-orange-700 border-orange-200", selectable: false },
];

export function OrderStatusSelect({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const current = STATUSES.find((s) => s.value === status);

  async function handleChange(newStatus: OrderStatus) {
    if (newStatus === status) return;
    setLoading(true);
    const { error } = await updateOrderStatusAction(orderId, newStatus);
    setLoading(false);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setStatus(newStatus);
      toast.success("Status atualizado");
      if (newStatus === "entregue") toast.info("E-mail de avaliação enviado ao cliente");
    }
  }

  return (
    <div className="space-y-2">
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", current?.color ?? "bg-muted text-muted-foreground border-border")}>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {current?.label ?? status}
      </div>
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        disabled={loading}
        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 cursor-pointer"
      >
        {STATUSES.filter((s) => s.selectable || s.value === status).map((s) => (
          <option key={s.value} value={s.value} disabled={!s.selectable}>{s.label}</option>
        ))}
      </select>
      {status === "entregue" && (
        <p className="text-[11px] text-emerald-600">✓ E-mail de avaliação foi enviado ao cliente</p>
      )}
    </div>
  );
}
