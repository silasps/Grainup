"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/utils/format";
import { batchUpdatePriceByRuleAction } from "@/app/(admin)/admin/editora/livros/actions";

interface BookEntry {
  id: string;
  title: string;
  price: number;
  price_promotional: number | null;
  pages: number | null;
  relevance: number | null;
  bling_product_id: number | null;
}

interface Props {
  books: BookEntry[];
}

const RELEVANCE_LABELS: Record<number, string> = {
  1: "Baixa",
  2: "Média-baixa",
  3: "Média",
  4: "Média-alta",
  5: "Alta",
};

type Step = "form" | "preview" | "done";

interface Rule {
  relevance: number | "";
  pagesMin: string;
  pagesMax: string;
  newPrice: number | null;
  newPricePromotional: number | null;
  clearPromo: boolean;
}

export function BatchPriceUpdate({ books }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("form");
  const [rule, setRule] = useState<Rule>({
    relevance: "",
    pagesMin: "",
    pagesMax: "",
    newPrice: null,
    newPricePromotional: null,
    clearPromo: false,
  });
  const [result, setResult] = useState<{ updated: number; blingUpdated: number; errors: string[] } | null>(null);

  function getMatching(): BookEntry[] {
    if (!rule.relevance) return [];
    return books.filter((b) => {
      if (b.relevance !== rule.relevance) return false;
      const pMin = rule.pagesMin ? parseInt(rule.pagesMin) : null;
      const pMax = rule.pagesMax ? parseInt(rule.pagesMax) : null;
      if (pMin !== null && (b.pages ?? 0) < pMin) return false;
      if (pMax !== null && (b.pages ?? 0) > pMax) return false;
      return true;
    });
  }

  const matching = step !== "form" ? getMatching() : [];

  function handlePreview() {
    if (!rule.relevance) {
      toast.error("Selecione uma relevância");
      return;
    }
    if (!rule.newPrice || rule.newPrice <= 0) {
      toast.error("Informe o novo preço");
      return;
    }
    const m = getMatching();
    if (m.length === 0) {
      toast.error("Nenhum livro encontrado com esses critérios");
      return;
    }
    setStep("preview");
  }

  function handleConfirm() {
    if (!rule.newPrice) return;
    const bookIds = getMatching().map((b) => b.id);
    const promoValue = rule.clearPromo ? null : rule.newPricePromotional;

    startTransition(async () => {
      const res = await batchUpdatePriceByRuleAction({
        bookIds,
        newPrice: rule.newPrice!,
        newPricePromotional: promoValue,
      });
      setResult(res);
      setStep("done");
      if (res.errors.length === 0) {
        toast.success(`${res.updated} livros atualizados`);
      } else {
        toast.warning(`${res.updated} atualizados, ${res.errors.length} erros no Bling`);
      }
    });
  }

  if (step === "done" && result) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" className="-mt-2 gap-1.5" onClick={() => router.push("/admin/editora/livros")}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para livros
        </Button>

        <div className="bg-white rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            {result.errors.length === 0 ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
            )}
            <div>
              <h2 className="font-semibold text-foreground">Atualização concluída</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {result.updated} livro{result.updated !== 1 ? "s" : ""} atualizado{result.updated !== 1 ? "s" : ""} na plataforma ·{" "}
                {result.blingUpdated} no Bling
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-orange-700">Erros no Bling ({result.errors.length})</p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-orange-700 font-mono">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            className="bg-brand hover:bg-brand-700 text-white"
            onClick={() => {
              setStep("form");
              setResult(null);
              setRule({ relevance: "", pagesMin: "", pagesMax: "", newPrice: null, newPricePromotional: null, clearPromo: false });
            }}
          >
            Nova atualização
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    const blingCount = matching.filter((b) => b.bling_product_id).length;
    return (
      <div className="p-6 max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" className="-mt-2 gap-1.5" onClick={() => setStep("form")}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Pré-visualização</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {matching.length} livro{matching.length !== 1 ? "s" : ""} serão atualizados
              {blingCount > 0 && ` (${blingCount} também no Bling)`}
            </p>
          </div>

          <div className="px-5 py-3 bg-secondary/30 border-b border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Relevância: <strong className="text-foreground">{rule.relevance} — {RELEVANCE_LABELS[rule.relevance as number]}</strong></span>
            {rule.pagesMin && <span>Páginas ≥ <strong className="text-foreground">{rule.pagesMin}</strong></span>}
            {rule.pagesMax && <span>Páginas ≤ <strong className="text-foreground">{rule.pagesMax}</strong></span>}
            <span>Novo preço: <strong className="text-foreground">{formatCurrency(rule.newPrice!)}</strong></span>
            {rule.clearPromo
              ? <span>Promoção: <strong className="text-foreground">removida</strong></span>
              : rule.newPricePromotional
              ? <span>Promoção: <strong className="text-foreground">{formatCurrency(rule.newPricePromotional)}</strong></span>
              : null}
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Título</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Páginas</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Preço atual</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Novo preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matching.map((book) => (
                  <tr key={book.id}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium line-clamp-1">{book.title}</p>
                      {!book.bling_product_id && (
                        <span className="text-[10px] text-orange-600">Sem Bling</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                      {book.pages ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatCurrency(book.price)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-brand">
                      {formatCurrency(rule.newPrice!)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-border flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep("form")}>
              Cancelar
            </Button>
            <Button
              className="bg-brand hover:bg-brand-700 text-white gap-2"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Atualizando..." : `Confirmar — ${matching.length} livros`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <Button variant="ghost" size="sm" className="-mt-2 gap-1.5" onClick={() => router.push("/admin/editora/livros")}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para livros
      </Button>

      <div className="bg-white rounded-xl border border-border p-5 space-y-5">
        <div>
          <h2 className="font-semibold text-foreground">Definir regra de preço</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selecione os critérios e o novo preço. Os livros correspondentes serão atualizados na plataforma e no Bling.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="relevance-rule">Relevância *</Label>
          <select
            id="relevance-rule"
            value={rule.relevance}
            onChange={(e) => setRule((r) => ({ ...r, relevance: e.target.value ? Number(e.target.value) as 1|2|3|4|5 : "" }))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Selecionar relevância</option>
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <option key={v} value={v}>{v} — {RELEVANCE_LABELS[v]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pages-min">Páginas mínimas (opcional)</Label>
            <Input
              id="pages-min"
              type="number"
              min={0}
              value={rule.pagesMin}
              onChange={(e) => setRule((r) => ({ ...r, pagesMin: e.target.value }))}
              placeholder="ex: 100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pages-max">Páginas máximas (opcional)</Label>
            <Input
              id="pages-max"
              type="number"
              min={0}
              value={rule.pagesMax}
              onChange={(e) => setRule((r) => ({ ...r, pagesMax: e.target.value }))}
              placeholder="ex: 300"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-price">Novo preço *</Label>
          <CurrencyInput
            id="new-price"
            value={rule.newPrice}
            onChange={(v) => setRule((r) => ({ ...r, newPrice: v }))}
            nullable
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-promo">Preço promocional (opcional)</Label>
          <CurrencyInput
            id="new-promo"
            value={rule.clearPromo ? null : rule.newPricePromotional}
            onChange={(v) => setRule((r) => ({ ...r, newPricePromotional: v, clearPromo: false }))}
            nullable
          />
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={rule.clearPromo}
              onChange={(e) => setRule((r) => ({ ...r, clearPromo: e.target.checked, newPricePromotional: null }))}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Remover promoção existente (definir como nulo)</span>
          </label>
        </div>

        {rule.relevance !== "" && (
          <div className="flex items-center gap-2 py-2 px-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {(() => {
                const count = getMatching().length;
                return count === 0
                  ? "Nenhum livro encontrado com esses critérios"
                  : `${count} livro${count !== 1 ? "s" : ""} encontrado${count !== 1 ? "s" : ""}`;
              })()}
            </span>
          </div>
        )}

        <Button
          type="button"
          className="w-full bg-brand hover:bg-brand-700 text-white"
          onClick={handlePreview}
        >
          Pré-visualizar alterações
        </Button>
      </div>
    </div>
  );
}
