"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, ChevronLeft, Loader2, UserCircle } from "lucide-react";
import Link from "next/link";

const COUNTRIES = [
  { code: "55", flag: "🇧🇷", name: "Brasil" },
  { code: "1", flag: "🇺🇸", name: "EUA / Canadá" },
  { code: "351", flag: "🇵🇹", name: "Portugal" },
  { code: "54", flag: "🇦🇷", name: "Argentina" },
  { code: "57", flag: "🇨🇴", name: "Colômbia" },
  { code: "52", flag: "🇲🇽", name: "México" },
  { code: "56", flag: "🇨🇱", name: "Chile" },
  { code: "598", flag: "🇺🇾", name: "Uruguai" },
  { code: "595", flag: "🇵🇾", name: "Paraguai" },
  { code: "591", flag: "🇧🇴", name: "Bolívia" },
  { code: "593", flag: "🇪🇨", name: "Equador" },
  { code: "51", flag: "🇵🇪", name: "Peru" },
  { code: "58", flag: "🇻🇪", name: "Venezuela" },
  { code: "44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "49", flag: "🇩🇪", name: "Alemanha" },
  { code: "33", flag: "🇫🇷", name: "França" },
  { code: "39", flag: "🇮🇹", name: "Itália" },
  { code: "34", flag: "🇪🇸", name: "Espanha" },
  { code: "61", flag: "🇦🇺", name: "Austrália" },
];

function applyPhoneMask(value: string, ddi: string) {
  const digits = value.replace(/\D/g, "");
  if (ddi !== "55") return digits.slice(0, 15);
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function applyCpfMask(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function parseStoredPhone(stored: string): { ddi: string; local: string } {
  if (!stored.startsWith("+")) {
    return { ddi: "55", local: applyPhoneMask(stored, "55") };
  }
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  const matched = sorted.find((c) => stored.startsWith("+" + c.code));
  if (matched) {
    const local = stored.slice(matched.code.length + 1);
    return { ddi: matched.code, local: applyPhoneMask(local, matched.code) };
  }
  return { ddi: "55", local: stored.slice(1) };
}

export default function MeusDadosPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ddi, setDdi] = useState("55");
  const [cpf, setCpf] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login?redirectTo=/minha-conta/dados");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      supabase
        .from("profiles")
        .select("full_name, phone, cpf, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name ?? "");
            setAvatarUrl(data.avatar_url ?? null);
            if (data.phone) {
              const parsed = parseStoredPhone(data.phone);
              setDdi(parsed.ddi);
              setPhone(parsed.local);
            }
            if (data.cpf) {
              setCpf(applyCpfMask(data.cpf));
            }
          }
          setLoading(false);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!fullName.trim()) return;
    setSaving(true);

    let newAvatarUrl = avatarUrl;

    if (avatarFile && userId) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
      if (uploadError) {
        toast.error("Erro ao enviar foto");
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    const localDigits = phone.replace(/\D/g, "");
    const phoneValue = localDigits ? `+${ddi}${localDigits}` : null;
    const cpfDigits = cpf.replace(/\D/g, "") || null;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          full_name: fullName.trim(),
          phone: phoneValue,
          cpf: cpfDigits,
          avatar_url: newAvatarUrl,
        },
        { onConflict: "user_id" }
      );

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar dados");
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    toast.success("Dados atualizados!");
    router.refresh();
  }

  const initials = fullName
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-20 rounded-full bg-secondary shrink-0" />
          <div className="flex flex-col gap-2">
            <div className="h-5 bg-secondary rounded w-32" />
            <div className="h-4 bg-secondary rounded w-48" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-10 bg-secondary rounded" />
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative shrink-0"
            aria-label="Alterar foto de perfil"
          >
            <Avatar className="size-20">
              <AvatarImage src={avatarPreview ?? avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl bg-violet-50 text-violet-600">
                {initials || <UserCircle className="size-8" />}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="size-5 text-white" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
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
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(applyCpfMask(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <div className="flex h-10 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div className="relative shrink-0">
              <select
                value={ddi}
                onChange={(e) => {
                  setDdi(e.target.value);
                  setPhone("");
                }}
                aria-label="DDI"
                className="h-full appearance-none bg-secondary/50 pl-3 pr-7 text-sm border-r border-input focus:outline-none cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} +{c.code}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(applyPhoneMask(e.target.value, ddi))}
              placeholder={ddi === "55" ? "(11) 99999-9999" : "Número"}
              inputMode="tel"
              className="flex-1 min-w-0 px-3 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
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
