"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SegurancaPage() {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isValid = password.length >= 6 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Erro ao atualizar senha: " + error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso!");
    setPassword("");
    setConfirm("");
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-5">
      <div>
        <Link
          href="/minha-conta"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Minha conta
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">Acesso e segurança</h1>
            <p className="text-sm text-muted-foreground">Altere sua senha de acesso</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              className={cn("pr-10", mismatch && "border-destructive focus-visible:ring-destructive")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mismatch && (
            <p className="text-xs text-destructive">As senhas não coincidem</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={saving || !isValid}
          className="bg-brand hover:bg-brand-700 text-white"
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Atualizar senha
        </Button>
      </div>
    </div>
  );
}
