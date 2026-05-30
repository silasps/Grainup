"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";

function applyPhoneMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function MeusDadosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login?redirectTo=/minha-conta/dados");
        return;
      }
      setEmail(user.email ?? "");
      supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name ?? "");
            setPhone(data.phone ? applyPhoneMask(data.phone) : "");
          }
          setLoading(false);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!fullName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const phoneDigits = phone.replace(/\D/g, "") || null;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phoneDigits })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar dados");
      return;
    }
    toast.success("Dados atualizados!");
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-6 animate-pulse">
        <div className="h-5 bg-secondary rounded w-1/3 mb-6" />
        <div className="flex flex-col gap-4">
          <div className="h-10 bg-secondary rounded" />
          <div className="h-10 bg-secondary rounded" />
          <div className="h-10 bg-secondary rounded" />
        </div>
      </div>
    );
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
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <UserCircle className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">Meus dados</h1>
            <p className="text-sm text-muted-foreground">Atualize suas informações pessoais</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">Nome completo</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            E-mail{" "}
            <span className="text-muted-foreground font-normal text-xs">(não editável aqui)</span>
          </Label>
          <Input
            id="email"
            value={email}
            disabled
            className="bg-secondary/50 text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={saving || !fullName.trim()}
          className="bg-brand hover:bg-brand-700 text-white"
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
