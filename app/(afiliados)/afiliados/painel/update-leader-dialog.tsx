"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function UpdateLeaderDialog({
  affiliateId, open, onOpenChange,
  defaultName, defaultEmail, defaultPhone,
}: {
  affiliateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("affiliates").update({
      leader_name: (fd.get("leader_name") as string).trim(),
      leader_email: (fd.get("leader_email") as string).trim(),
      leader_phone: (fd.get("leader_phone") as string).trim() || null,
    }).eq("id", affiliateId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dados do líder atualizados!");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar dados do líder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <Label>Nome do líder</Label>
            <Input name="leader_name" required defaultValue={defaultName ?? ""} placeholder="Nome completo" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>E-mail do líder</Label>
            <Input name="leader_email" type="email" required defaultValue={defaultEmail ?? ""} placeholder="lider@jocum.org.br" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Telefone do líder</Label>
            <Input name="leader_phone" defaultValue={defaultPhone ?? ""} placeholder="(00) 00000-0000" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-brand hover:bg-brand-700 text-white" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
