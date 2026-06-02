"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { updateBetaFeedbackStatus } from "@/lib/actions/beta-feedback";
import type { Database } from "@/types/database";

type Feedback = Database["public"]["Tables"]["beta_feedback"]["Row"];

const STATUS_LABELS: Record<Feedback["status"], string> = {
  novo: "Nova",
  em_analise: "Em análise",
  implementado: "Implementada",
  descartado: "Descartada",
};

const STATUS_VARIANTS: Record<Feedback["status"], "default" | "secondary" | "outline" | "destructive"> = {
  novo: "default",
  em_analise: "secondary",
  implementado: "outline",
  descartado: "destructive",
};

const NEXT_STATUS: Record<Feedback["status"], Feedback["status"][]> = {
  novo: ["em_analise", "descartado"],
  em_analise: ["implementado", "descartado", "novo"],
  implementado: ["novo"],
  descartado: ["novo"],
};

export function FeedbackTable({ feedbacks }: { feedbacks: Feedback[] }) {
  const [items, setItems] = useState(feedbacks);
  const [isPending, startTransition] = useTransition();

  function changeStatus(id: string, status: Feedback["status"]) {
    startTransition(async () => {
      try {
        await updateBetaFeedbackStatus(id, status);
        setItems((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status } : f))
        );
        toast.success("Status atualizado.");
      } catch {
        toast.error("Erro ao atualizar status.");
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Nenhuma sugestão recebida ainda.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/30">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Página</th>
          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sugestão</th>
          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quando</th>
          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((f) => (
          <tr key={f.id} className="hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[160px] truncate">
              {f.page_url}
            </td>
            <td className="px-4 py-3 max-w-xs">
              <p className="line-clamp-2 text-foreground">{f.message}</p>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {f.user_name ?? f.user_email ?? (
                <span className="italic">Anônimo</span>
              )}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(f.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[f.status]}>
                  {STATUS_LABELS[f.status]}
                </Badge>
                <select
                  disabled={isPending}
                  value={f.status}
                  onChange={(e) =>
                    changeStatus(f.id, e.target.value as Feedback["status"])
                  }
                  className="text-xs rounded border border-border bg-background px-1.5 py-0.5 text-foreground"
                >
                  <option value={f.status} disabled>
                    Alterar...
                  </option>
                  {NEXT_STATUS[f.status].map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
