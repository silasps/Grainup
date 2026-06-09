"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { requestWithdrawalAction } from "./withdrawal-actions";

interface Withdrawal {
  id: string; amount: number; status: string;
  pix_key: string | null; pix_key_type: string | null;
  notes: string | null; requested_at: string | null; paid_at: string | null; created_at: string;
}

const WD_STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pendente:    { label: "Aguardando",   cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  processando: { label: "Processando",  cls: "bg-blue-100 text-blue-700",     icon: Clock },
  pago:        { label: "Pago",         cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  recusado:    { label: "Recusado",     cls: "bg-red-100 text-red-700",        icon: XCircle },
};

const PIX_TYPES = [
  { v: "cpf",       l: "CPF" },
  { v: "email",     l: "E-mail" },
  { v: "telefone",  l: "Telefone" },
  { v: "aleatoria", l: "Chave aleatória" },
] as const;

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function WithdrawalPanel({
  balance,
  initialWithdrawals,
}: {
  balance: number;
  initialWithdrawals: Withdrawal[];
}) {
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState<typeof PIX_TYPES[number]["v"]>("cpf");
  const [saving, startSaving] = useTransition();

  const canRequest = balance >= 100 && !withdrawals.some((w) => ["pendente", "processando"].includes(w.status));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount.replace(",", "."));
    startSaving(async () => {
      const result = await requestWithdrawalAction({ amount: num, pixKey, pixKeyType: pixType });
      if (result.error) { toast.error(result.error); return; }
      setWithdrawals((prev) => [result.withdrawal as Withdrawal, ...prev]);
      setAmount(""); setPixKey(""); setShowForm(false);
      toast.success("Solicitação enviada! Você receberá em até 3 dias úteis.");
    });
  }

  return (
    <Card id="saque" className="bg-white border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Saque
          </CardTitle>
          {canRequest && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm((v) => !v)}>
              <ArrowDownToLine className="h-3 w-3" /> Solicitar saque
            </Button>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Info de saldo */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/60">
          <div>
            <p className="text-xs text-muted-foreground">Saldo disponível</p>
            <p className="text-xl font-bold text-foreground">{fmt(balance)}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Mínimo: <strong className="text-foreground">R$ 100</strong></p>
            <p>Prazo: <strong className="text-foreground">3 dias úteis</strong></p>
          </div>
        </div>

        {!canRequest && balance < 100 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Acumule mais <strong>{fmt(100 - balance)}</strong> para poder solicitar um saque.
          </p>
        )}

        {!canRequest && balance >= 100 && withdrawals.some((w) => ["pendente", "processando"].includes(w.status)) && (
          <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-3">
            Você já tem um saque em andamento. Aguarde a conclusão para solicitar outro.
          </p>
        )}

        {/* Formulário */}
        {showForm && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-secondary/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Máx: ${fmt(balance)}`}
                  required
                  type="number" min="100" step="0.01"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de chave Pix</label>
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value as typeof pixType)}
                  className="h-9 rounded-md border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {PIX_TYPES.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Chave Pix</label>
                <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Informe sua chave Pix" required />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O valor será debitado do seu saldo imediatamente e pago em até 3 dias úteis.</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" className="bg-brand hover:bg-brand-700 text-white" disabled={saving}>
                {saving ? "Enviando…" : "Solicitar saque"}
              </Button>
            </div>
          </form>
        )}

        {/* Histórico */}
        {withdrawals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação de saque ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {withdrawals.map((w) => {
              const ws = WD_STATUS[w.status] ?? WD_STATUS.pendente;
              const Icon = ws.icon;
              return (
                <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${w.status === "pago" ? "text-emerald-600" : w.status === "recusado" ? "text-red-500" : "text-yellow-600"}`} />
                    <div>
                      <p className="text-sm font-semibold">{fmt(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">{w.pix_key_type}: {w.pix_key}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${ws.cls}`}>{ws.label}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(w.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
