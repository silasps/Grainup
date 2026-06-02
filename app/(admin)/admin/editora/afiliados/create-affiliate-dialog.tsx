"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function addMonths(d: Date, m: number) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; }

export function CreateAffiliateDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (a: unknown) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"jocum" | "diretor">("jocum");
  const [requiresReview, setRequiresReview] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string).trim();

    setSaving(true);
    const supabase = createClient();
    const now = new Date();
    const { data: { users } } = await (supabase as any).auth.admin.listUsers();
    // Find user by email to link user_id (optional — may not exist yet)
    const email = get("email");
    const existingUser = (users as { id: string; email: string }[] | undefined)?.find(u => u.email === email);

    const payload = {
      user_id: existingUser?.id ?? crypto.randomUUID(), // placeholder if no user yet
      type,
      name: get("name"),
      email,
      cpf: get("cpf").replace(/\D/g, ""),
      phone: get("phone").replace(/\D/g, ""),
      status: "ativo" as const,
      commission_rate: parseFloat(get("commission_rate")) / 100,
      serving_location: get("serving_location") || null,
      leader_name: get("leader_name") || null,
      leader_email: get("leader_email") || null,
      leader_phone: null,
      last_confirmed_at: now.toISOString(),
      requires_review: requiresReview,
      next_review_at: requiresReview ? addMonths(now, 6).toISOString() : null,
    };

    const { data, error } = await supabase.from("affiliates").insert(payload).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Afiliado criado com sucesso");
    onCreated(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar afiliado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Nome completo</Label>
              <Input name="name" required placeholder="Nome" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>E-mail</Label>
              <Input name="email" type="email" required placeholder="email@exemplo.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Telefone</Label>
              <Input name="phone" required placeholder="(00) 00000-0000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>CPF</Label>
              <Input name="cpf" required placeholder="000.000.000-00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Comissão (%)</Label>
              <Input name="commission_rate" type="number" defaultValue="10" min="1" max="50" required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(["jocum", "diretor"] as const).map((t) => (
                <label key={t} className={`flex-1 border rounded-lg px-3 py-2 text-sm cursor-pointer text-center transition-colors ${type === t ? "border-brand bg-brand-50 text-brand font-medium" : "border-border text-muted-foreground"}`}>
                  <input type="radio" className="sr-only" checked={type === t} onChange={() => { setType(t); setRequiresReview(t === "jocum"); }} />
                  {t === "jocum" ? "JOCUM" : "Diretor / Parceiro"}
                </label>
              ))}
            </div>
          </div>

          {type === "jocum" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Base / Local de serviço</Label>
                <Input name="serving_location" placeholder="Ex: Base JOCUM Curitiba" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome do líder direto</Label>
                  <Input name="leader_name" placeholder="Nome" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>E-mail do líder</Label>
                  <Input name="leader_email" type="email" placeholder="lider@jocum.org.br" />
                </div>
              </div>
            </>
          )}

          <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
            <input
              type="checkbox"
              checked={requiresReview}
              onChange={(e) => setRequiresReview(e.target.checked)}
              className="mt-0.5 accent-brand"
            />
            <div>
              <p className="text-sm font-medium">Requer avaliação periódica (6 meses)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A cada 6 meses o líder será contatado para confirmar o vínculo. Obrigatório para JOCUM.
              </p>
            </div>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-brand hover:bg-brand-700 text-white" disabled={saving}>
              {saving ? "Criando…" : "Criar afiliado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
