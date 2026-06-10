"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, Mail, Clock, Share2, Wallet, UserPlus, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DDI_OPTIONS = [
  { flag: "🇧🇷", code: "+55", label: "Brasil" },
  { flag: "🇵🇹", code: "+351", label: "Portugal" },
  { flag: "🇺🇸", code: "+1", label: "EUA/Canadá" },
  { flag: "🇦🇷", code: "+54", label: "Argentina" },
  { flag: "🇲🇽", code: "+52", label: "México" },
  { flag: "🇨🇴", code: "+57", label: "Colômbia" },
  { flag: "🇨🇱", code: "+56", label: "Chile" },
  { flag: "🇵🇾", code: "+595", label: "Paraguai" },
  { flag: "🇺🇾", code: "+598", label: "Uruguai" },
  { flag: "🇧🇴", code: "+591", label: "Bolívia" },
  { flag: "🇵🇪", code: "+51", label: "Peru" },
  { flag: "🇬🇧", code: "+44", label: "Reino Unido" },
  { flag: "🇩🇪", code: "+49", label: "Alemanha" },
  { flag: "🇪🇸", code: "+34", label: "Espanha" },
];

function PhoneWithDdi({
  id,
  placeholder,
  display,
  ddi,
  onDdiChange,
  onPhoneChange,
  error,
}: {
  id: string;
  placeholder: string;
  display: string;
  ddi: string;
  onDdiChange: (ddi: string) => void;
  onPhoneChange: (display: string, value: string) => void;
  error?: string;
}) {
  const selected = DDI_OPTIONS.find((d) => d.code === ddi) ?? DDI_OPTIONS[0];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex">
        <select
          value={ddi}
          onChange={(e) => onDdiChange(e.target.value)}
          className="h-10 w-24 shrink-0 rounded-l-md rounded-r-none border border-r-0 border-input bg-secondary/40 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          aria-label="DDI"
        >
          {DDI_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.flag} {opt.code}
            </option>
          ))}
        </select>
        <Input
          id={id}
          value={display}
          onChange={(e) => {
            const masked = ddi === "+55" ? applyPhoneMask(e.target.value) : e.target.value.replace(/[^\d\s\-()]/g, "").slice(0, 20);
            onPhoneChange(masked, `${ddi} ${masked}`);
          }}
          placeholder={placeholder}
          className="rounded-l-none flex-1"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone obrigatório"),
  cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"),
  type: z.enum(["geral", "jocum", "diretor"]),
  serving_location: z.string().optional(),
  leader_name: z.string().optional(),
  leader_email: z.string().optional(),
  leader_phone: z.string().optional(),
  how_to_promote: z.string().min(10, "Conte como você pretende divulgar (mín. 10 caracteres)"),
});

type FormData = z.infer<typeof schema>;

function applyCpfMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function applyPhoneMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export function AfiliadoForm({ inline = false }: { inline?: boolean }) {
  const supabase = createClient();
  const [cpfDisplay, setCpfDisplay] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [phoneDdi, setPhoneDdi] = useState("+55");
  const [leaderPhoneDisplay, setLeaderPhoneDisplay] = useState("");
  const [leaderPhoneDdi, setLeaderPhoneDdi] = useState("+55");
  const [submitted, setSubmitted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isJocum, setIsJocum] = useState(false);
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; cpf: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setAuthUser(user);
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, phone, cpf").eq("user_id", user.id).maybeSingle();
        setProfile(p ?? null);
        // Pré-preenche campos do form com dados da conta
        setValue("name", p?.full_name || user.user_metadata?.full_name as string || "");
        setValue("email", user.email || "");
        if (p?.cpf) { const m = applyCpfMask(p.cpf); setCpfDisplay(m); setValue("cpf", m); }
        if (p?.phone) { const m = applyPhoneMask(p.phone); setPhoneDisplay(m); setValue("phone", `+55 ${m}`); }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const typeValue = watch("type");

  async function onSubmit(data: FormData) {
    const { error } = await supabase.from("affiliates").insert({
      user_id: authUser!.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: data.type as any,
      name: data.name,
      email: data.email,
      cpf: data.cpf.replace(/\D/g, ""),
      phone: data.phone.replace(/\D/g, ""),
      status: "pendente",
      commission_rate: data.type === "geral" ? 30 : 50,
      serving_location: data.serving_location || null,
      leader_name: data.leader_name || null,
      leader_email: data.leader_email || null,
      leader_phone: data.leader_phone || null,
      last_confirmed_at: null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Você já possui uma inscrição no programa de afiliados.");
      } else {
        toast.error("Erro ao enviar inscrição", { description: error.message });
      }
      return;
    }

    setSubmitted(true);
    setModalOpen(true);
  }

  const PROXIMOS_PASSOS = [
    {
      icon: Clock,
      titulo: "Sua solicitação está sendo avaliada",
      descricao: "Nossa equipe irá analisar as informações enviadas. Esse processo leva até 3 dias úteis.",
    },
    {
      icon: Mail,
      titulo: "Você receberá um e-mail de aprovação",
      descricao: "Ao ser aprovado, você receberá um e-mail com as instruções de acesso ao painel de afiliados.",
    },
    {
      icon: Share2,
      titulo: "Acesse o painel e pegue seu link",
      descricao: "Faça login, acesse Minha Conta → Afiliados e copie seu link exclusivo para divulgar.",
    },
    {
      icon: Wallet,
      titulo: "Divulgue e receba suas comissões",
      descricao: "Compartilhe os livros e acompanhe cliques, vendas e comissões em tempo real. Pagamentos mensais via Pix.",
    },
  ];

  // Carregando estado de autenticação
  if (authUser === undefined) {
    return (
      <div className="bg-white rounded-2xl border border-border p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Não logado → pedir para criar conta primeiro
  if (authUser === null) {
    return (
      <div className="bg-white rounded-2xl border border-border p-10 flex flex-col items-center text-center gap-6">
        <div className="bg-brand-50 rounded-full p-5">
          <UserPlus className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">
            Primeiro, crie sua conta
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
            Para participar do programa de afiliados você precisa de uma conta na plataforma.
            É rápido e gratuito — depois é só voltar aqui e preencher a inscrição.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button
            className="flex-1 bg-brand hover:bg-brand-700 text-white"
            onClick={() => {
              window.location.href = "/auth/cadastro?redirectTo=/editora/afiliados%23cadastro";
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Criar conta
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              window.location.href = "/auth/login?redirectTo=/editora/afiliados%23cadastro";
            }}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Já tenho conta
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Após o login, o formulário de inscrição abrirá automaticamente aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="bg-brand-50 rounded-full p-4 mb-4">
                <CheckCircle2 className="h-10 w-10 text-brand" />
              </div>
              <DialogTitle className="font-heading text-xl font-bold text-foreground">
                Inscrição recebida!
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Obrigado pelo seu interesse. Veja o que acontece agora:
              </p>
            </div>
          </DialogHeader>

          <ol className="flex flex-col gap-4 mt-2">
            {PROXIMOS_PASSOS.map(({ icon: Icon, titulo, descricao }, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="bg-brand-50 rounded-full p-2 shrink-0">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                  {i < PROXIMOS_PASSOS.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">{titulo}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{descricao}</p>
                </div>
              </li>
            ))}
          </ol>

          <Button
            className="w-full bg-brand hover:bg-brand-700 text-white mt-2"
            onClick={() => setModalOpen(false)}
          >
            Entendido, obrigado!
          </Button>
        </DialogContent>
      </Dialog>

      {submitted && !modalOpen && (
        <div className="bg-white rounded-2xl border border-border p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-brand mx-auto mb-4" />
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">
            Inscrição recebida!
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Fique de olho no seu e-mail — nossa equipe entrará em contato em até 3 dias úteis.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setModalOpen(true)}
          >
            Ver próximos passos
          </Button>
        </div>
      )}

      {!submitted && (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={inline ? "flex flex-col gap-5" : "bg-white rounded-2xl border border-border p-8 flex flex-col gap-5"}
    >
      {/* Dados pessoais — mostra apenas o que falta */}
      <div>
        {/* Chip mostrando conta identificada */}
        {authUser && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Conta: <strong>{authUser.email}</strong></span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nome — sempre mostra (pode precisar corrigir) */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Seu nome" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          {/* Email — hidden, vem do auth */}
          <input type="hidden" {...register("email")} />

          {/* Telefone — só mostra se não tiver no perfil */}
          {!profile?.phone && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <PhoneWithDdi
                id="phone"
                placeholder="(00) 00000-0000"
                display={phoneDisplay}
                ddi={phoneDdi}
                onDdiChange={setPhoneDdi}
                onPhoneChange={(display, value) => { setPhoneDisplay(display); setValue("phone", value); }}
                error={errors.phone?.message}
              />
            </div>
          )}
          {profile?.phone && <input type="hidden" {...register("phone")} />}

          {/* CPF — só mostra se não tiver no perfil */}
          {!profile?.cpf && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpfDisplay}
                onChange={(e) => { const m = applyCpfMask(e.target.value); setCpfDisplay(m); setValue("cpf", m); }}
                placeholder="000.000.000-00"
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
            </div>
          )}
          {profile?.cpf && <input type="hidden" {...register("cpf")} />}

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label>Tipo de participação</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { value: "geral", label: "Parceiro Geral", desc: "Qualquer pessoa — margem de 30% a 50% conforme vendas" },
                { value: "jocum", label: "Colaborador JOCUM", desc: "Membro ou voluntário da JOCUM — 50% fixo" },
                { value: "diretor", label: "Diretor Acadêmico EIFOL", desc: "Diretor acadêmico EIFOL — 50% fixo" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                    typeValue === opt.value
                      ? "border-brand bg-brand-50"
                      : "border-border hover:border-brand/40"
                  }`}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register("type")}
                    onChange={() => {
                      setValue("type", opt.value as "geral" | "jocum" | "diretor");
                      setIsJocum(opt.value === "jocum");
                    }}
                    className="sr-only"
                  />
                  <span className={`block text-sm font-medium ${typeValue === opt.value ? "text-brand" : "text-foreground"}`}>{opt.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                </label>
              ))}
            </div>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>
        </div>
      </div>

      {/* Dados JOCUM/Diretor (só para não-geral) */}
      {typeValue && typeValue === "jocum" && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            Contexto na JOCUM
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="serving_location">Local de serviço / Base JOCUM</Label>
              <Input id="serving_location" placeholder="Ex: Base JOCUM Curitiba" {...register("serving_location")} />
            </div>
            {/* Campos de líder só para tipo jocum */}
            {typeValue === "jocum" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="leader_name">Nome do seu líder direto</Label>
                  <Input id="leader_name" placeholder="Nome do líder" {...register("leader_name")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="leader_email">E-mail do líder</Label>
                  <Input id="leader_email" type="email" placeholder="lider@jocum.org.br" {...register("leader_email")} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="leader_phone">Telefone do líder</Label>
                  <PhoneWithDdi
                    id="leader_phone"
                    placeholder="(00) 00000-0000"
                    display={leaderPhoneDisplay}
                    ddi={leaderPhoneDdi}
                    onDdiChange={setLeaderPhoneDdi}
                    onPhoneChange={(display, value) => { setLeaderPhoneDisplay(display); setValue("leader_phone", value); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Como vai divulgar */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="how_to_promote">
          Como você pretende divulgar os livros?
        </Label>
        <Textarea
          id="how_to_promote"
          placeholder="Ex: Tenho um blog cristão com 5.000 leitores mensais, grupo de WhatsApp de estudos bíblicos, Instagram..."
          rows={4}
          {...register("how_to_promote")}
        />
        {errors.how_to_promote && <p className="text-xs text-destructive">{errors.how_to_promote.message}</p>}
      </div>

      <Button type="submit" className="bg-brand hover:bg-brand-700 text-white w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Enviar inscrição
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Ao enviar, você concorda com os termos do programa de afiliados.
      </p>
    </form>
      )}
    </>
  );
}
