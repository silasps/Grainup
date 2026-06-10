"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, ToggleLeft, ToggleRight, Info } from "lucide-react";
import { toast } from "sonner";
import { createCouponAction, toggleCouponAction } from "./coupon-actions";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_percent: number;
  discount_fixed: number | null;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  created_at: string;
}

const AFFILIATE_MARGIN = 50;

export function CouponManager({ initialCoupons, balance }: { initialCoupons: Coupon[]; balance: number }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discount, setDiscount] = useState(20);
  const [discountFixed, setDiscountFixed] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [saving, startSaving] = useTransition();
  const [toggling, startToggle] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const result = await createCouponAction({
        code,
        discountType,
        discountPercent: discountType === "percent" ? discount : 0,
        discountFixed: discountType === "fixed" ? parseFloat(discountFixed) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
      });
      if (result.error) { toast.error(result.error); return; }
      setCoupons((prev) => [result.coupon as unknown as Coupon, ...prev]);
      setCode(""); setDiscount(20); setDiscountFixed(""); setMaxUses(""); setShowForm(false);
      toast.success("Cupom criado!");
    });
  }

  function handleToggle(c: Coupon) {
    startToggle(async () => {
      const result = await toggleCouponAction(c.id, !c.active);
      if (result.error) { toast.error(result.error); return; }
      setCoupons((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !x.active } : x));
    });
  }

  const earn = discountType === "percent" && discount < AFFILIATE_MARGIN ? `+${AFFILIATE_MARGIN - discount}% vai para sua carteira por venda` : null;
  const debit = discountType === "percent" && discount > AFFILIATE_MARGIN ? `${discount - AFFILIATE_MARGIN}% será debitado do seu saldo por uso` : null;

  function couponLabel(c: Coupon) {
    if (c.discount_type === "fixed") return `R$ ${c.discount_fixed?.toFixed(2).replace(".", ",")} off`;
    return `${c.discount_percent}% off`;
  }

  function earningTag(c: Coupon) {
    if (c.discount_type === "fixed") return { label: "R$ fixo", cls: "text-blue-600" };
    if (c.discount_percent < AFFILIATE_MARGIN) return { label: `+${AFFILIATE_MARGIN - c.discount_percent}% carteira`, cls: "text-emerald-600" };
    if (c.discount_percent > AFFILIATE_MARGIN) return { label: `-${c.discount_percent - AFFILIATE_MARGIN}% saldo`, cls: "text-orange-600" };
    return { label: "divulgação", cls: "text-muted-foreground" };
  }

  return (
    <Card id="cupons" className="bg-white border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" /> Meus cupons de desconto
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3 w-3" /> Novo cupom
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 flex flex-col gap-4">

        <div className="flex gap-2 p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand" />
          <p>
            Você tem <strong className="text-foreground">50% de margem</strong> por livro.
            Cupons percentuais acima de 50% debitam o excesso do seu saldo (atual:{" "}
            <strong className="text-foreground">R$ {balance.toFixed(2).replace(".", ",")}</strong>).
            Cupons de valor fixo são deduzidos da sua comissão por venda.
          </p>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-secondary/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Código do cupom</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="EX: JOCUM20" maxLength={20} required className="uppercase"
                />
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
                  <label className="text-xs font-medium text-muted-foreground">Desconto (%)</label>
                  <Input type="number" min={1} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} required />
                  {earn && <p className="text-xs text-emerald-600">{earn}</p>}
                  {debit && <p className="text-xs text-orange-600">{debit}</p>}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
                  <Input type="number" min={1} step="0.01" value={discountFixed} onChange={(e) => setDiscountFixed(e.target.value)} placeholder="Ex: 10.00" required />
                  <p className="text-xs text-blue-600">Deduzido da sua comissão por venda</p>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Limite de usos (vazio = sem limite)</label>
                <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Ilimitado" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" className="bg-brand hover:bg-brand-700 text-white" disabled={saving}>
                {saving ? "Criando…" : "Criar cupom"}
              </Button>
            </div>
          </form>
        )}

        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum cupom criado ainda. Crie seu primeiro cupom para começar a divulgar!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {coupons.map((c) => {
              const tag = earningTag(c);
              return (
                <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border ${c.active ? "border-border bg-white" : "border-border bg-secondary/30 opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{c.code}</span>
                      <Badge variant="secondary" className="text-xs">{couponLabel(c)}</Badge>
                      <span className={`text-xs ${tag.cls}`}>{tag.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""} uso{c.uses_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button onClick={() => handleToggle(c)} disabled={toggling} title={c.active ? "Desativar" : "Ativar"} className="text-muted-foreground hover:text-foreground transition-colors">
                    {c.active ? <ToggleRight className="h-5 w-5 text-brand" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
