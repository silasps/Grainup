"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ticket, Plus, ToggleLeft, ToggleRight, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { createPromoCouponAction, togglePromoCouponAction, deletePromoCouponAction } from "./actions";

export interface PromoCoupon {
  id: string;
  code: string;
  label: string | null;
  discount_type: "percent" | "fixed";
  discount_percent: number;
  discount_fixed: number | null;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function CuponsTable({ initialCoupons }: { initialCoupons: PromoCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountPct, setDiscountPct] = useState(20);
  const [discountFixed, setDiscountFixed] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [saving, startSaving] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();

  function resetForm() {
    setCode(""); setLabel(""); setDiscountType("percent");
    setDiscountPct(20); setDiscountFixed(""); setMaxUses(""); setExpiresAt("");
    setShowForm(false);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const res = await createPromoCouponAction({
        code, label, discountType,
        discountPercent: discountType === "percent" ? discountPct : 0,
        discountFixed: discountType === "fixed" ? parseFloat(discountFixed) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt || null,
      });
      if (res.error) { toast.error(res.error); return; }
      setCoupons((p) => [res.coupon as PromoCoupon, ...p]);
      toast.success("Cupom criado!");
      resetForm();
    });
  }

  function handleToggle(c: PromoCoupon) {
    startToggle(async () => {
      const res = await togglePromoCouponAction(c.id, !c.active);
      if (res.error) { toast.error(res.error); return; }
      setCoupons((p) => p.map((x) => x.id === c.id ? { ...x, active: !x.active } : x));
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const res = await deletePromoCouponAction(id);
      if (res.error) { toast.error(res.error); return; }
      setCoupons((p) => p.filter((x) => x.id !== id));
      setConfirmDelete(null);
      toast.success("Cupom excluído.");
    });
  }

  function discountLabel(c: PromoCoupon) {
    if (c.discount_type === "fixed")
      return `R$ ${c.discount_fixed?.toFixed(2).replace(".", ",")} off`;
    return `${c.discount_percent}% off`;
  }

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground items-start flex-1 mr-4">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand" />
          <p>
            Cupons criados aqui <strong className="text-foreground">não geram crédito para afiliados</strong>.
            O código é global — não pode colidir com cupons de afiliados.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Novo cupom
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Código *</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="EX: NATAL20" maxLength={20} required className="uppercase"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Label interno</label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Natal 2026, Presente João…" />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de desconto</label>
                <div className="flex gap-2">
                  {(["percent", "fixed"] as const).map((t) => (
                    <label key={t} className={`flex-1 text-center text-sm py-2 rounded-lg border cursor-pointer transition-colors ${discountType === t ? "border-brand bg-brand-50 text-brand font-medium" : "border-border text-muted-foreground"}`}>
                      <input type="radio" className="sr-only" checked={discountType === t} onChange={() => setDiscountType(t)} />
                      {t === "percent" ? "Porcentagem (%)" : "Valor fixo (R$)"}
                    </label>
                  ))}
                </div>
              </div>

              {discountType === "percent" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Desconto (%) *</label>
                  <Input type="number" min={1} max={100} value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value))} required />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
                  <Input type="number" min={0.01} step="0.01" value={discountFixed}
                    onChange={(e) => setDiscountFixed(e.target.value)} placeholder="Ex: 15.00" required />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Limite de usos (vazio = ilimitado)</label>
                <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Ilimitado" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Validade (opcional)</label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>

              <div className="col-span-2 flex gap-2 justify-end pt-1">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" size="sm" className="bg-brand hover:bg-brand-700 text-white" disabled={saving}>
                  {saving ? "Criando…" : "Criar cupom"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {coupons.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>
              <p className="text-xs text-muted-foreground">Use o botão "Novo cupom" para criar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Código / Label</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Desconto</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Usos</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Validade</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Ativo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${!c.active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold">{c.code}</p>
                        {c.label && <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{discountLabel(c)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {c.uses_count}{c.max_uses !== null ? `/${c.max_uses}` : ""}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggle(c)} disabled={toggling}
                          title={c.active ? "Desativar" : "Ativar"}
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          {c.active
                            ? <ToggleRight className="h-5 w-5 text-brand" />
                            : <ToggleLeft className="h-5 w-5" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {confirmDelete === c.id ? (
                          <span className="flex items-center gap-2 justify-end text-xs">
                            <span className="text-destructive">Excluir?</span>
                            <button onClick={() => handleDelete(c.id)} disabled={deleting}
                              className="text-destructive font-medium hover:underline">Sim</button>
                            <span className="text-muted-foreground">/</span>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-muted-foreground hover:underline">Não</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDelete(c.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
