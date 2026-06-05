"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateBetaFeedbackStatus } from "@/lib/actions/beta-feedback";
import type { Database } from "@/types/database";

type Feedback = Database["public"]["Tables"]["beta_feedback"]["Row"];

const STATUS_LABELS: Record<Feedback["status"], string> = {
  novo: "Nova",
  em_analise: "Em análise",
  implementado: "Feito",
  descartado: "Descartada",
};

const STATUS_VARIANTS: Record<Feedback["status"], "default" | "secondary" | "outline" | "destructive"> = {
  novo: "default",
  em_analise: "secondary",
  implementado: "outline",
  descartado: "destructive",
};

const NEXT_STATUS: Record<Feedback["status"], Feedback["status"][]> = {
  novo: ["em_analise", "implementado", "descartado"],
  em_analise: ["implementado", "descartado", "novo"],
  implementado: ["novo"],
  descartado: ["novo"],
};

const KPI_CONFIG = [
  { key: "novo" as const,         label: "Novas",       color: "text-blue-600" },
  { key: "em_analise" as const,   label: "Em análise",  color: "text-yellow-600" },
  { key: "implementado" as const, label: "Feitas",      color: "text-emerald-600" },
  { key: "descartado" as const,   label: "Descartadas", color: "text-muted-foreground" },
];

function StatusDropdown({
  item,
  onChangeStatus,
  isPending,
  stopPropagation = false,
}: {
  item: Feedback;
  onChangeStatus: (id: string, status: Feedback["status"]) => void;
  isPending: boolean;
  stopPropagation?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        className="flex items-center gap-1 outline-none"
      >
        <Badge variant={STATUS_VARIANTS[item.status]}>
          {STATUS_LABELS[item.status]}
        </Badge>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {NEXT_STATUS[item.status].map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              onChangeStatus(item.id, s);
            }}
          >
            <Badge variant={STATUS_VARIANTS[s]} className="mr-2">
              {STATUS_LABELS[s]}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatFeedbackTime(date: string, now: string) {
  return formatDistance(new Date(date), new Date(now), { addSuffix: true, locale: ptBR });
}

export function FeedbackTable({
  feedbacks,
  renderedAt,
}: {
  feedbacks: Feedback[];
  renderedAt: string;
}) {
  const [items, setItems] = useState(feedbacks);
  const [now, setNow] = useState(renderedAt);
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selected = selectedIndex !== null ? items[selectedIndex] : null;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNow(new Date().toISOString());
    }, 0);

    const interval = window.setInterval(() => {
      setNow(new Date().toISOString());
    }, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  function changeStatus(id: string, newStatus: Feedback["status"]) {
    const prev = items.find((f) => f.id === id)?.status;
    setItems((cur) => cur.map((f) => (f.id === id ? { ...f, status: newStatus } : f)));
    startTransition(async () => {
      try {
        await updateBetaFeedbackStatus(id, newStatus);
        toast.success("Status atualizado.");
      } catch {
        if (prev) setItems((cur) => cur.map((f) => (f.id === id ? { ...f, status: prev } : f)));
        toast.error("Erro ao atualizar status.");
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 md:p-6">
        {KPI_CONFIG.map(({ key, label, color }) => (
          <div key={key} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              {items.filter((f) => f.status === key).length}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma sugestão recebida ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
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
                {items.map((f, i) => (
                  <tr
                    key={f.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedIndex(i)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                      {f.page_url}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="line-clamp-2 text-foreground">{f.message}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.user_name ?? f.user_email ?? <span className="italic">Anônimo</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <time dateTime={f.created_at}>
                        {formatFeedbackTime(f.created_at, now)}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown
                        item={f}
                        onChangeStatus={changeStatus}
                        isPending={isPending}
                        stopPropagation
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => { if (!open) setSelectedIndex(null); }}
      >
        {selected && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <DialogTitle className="text-sm font-mono text-muted-foreground truncate max-w-[280px]">
                  {selected.page_url}
                </DialogTitle>
                <span className="text-xs text-muted-foreground shrink-0">
                  {selectedIndex! + 1} / {items.length}
                </span>
              </div>
            </DialogHeader>

            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selected.message}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <span>
                {selected.user_name ?? selected.user_email ?? "Anônimo"} ·{" "}
                <time dateTime={selected.created_at}>
                  {formatFeedbackTime(selected.created_at, now)}
                </time>
              </span>
              <StatusDropdown
                item={selected}
                onChangeStatus={changeStatus}
                isPending={isPending}
              />
            </div>

            <div className="flex justify-between gap-2 -mx-4 -mb-4 border-t bg-muted/50 px-4 py-3 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIndex === 0}
                onClick={() => setSelectedIndex((i) => (i ?? 0) - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIndex === items.length - 1}
                onClick={() => setSelectedIndex((i) => (i ?? 0) + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
