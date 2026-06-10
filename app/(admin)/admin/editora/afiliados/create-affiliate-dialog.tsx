"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, CheckCircle2, Copy, Search, UserCheck } from "lucide-react";
import { createAffiliateWithAccountAction, lookupUserByEmailAction } from "./actions";

const TYPE_LABELS = { geral: "Parceiro Geral", jocum: "JOCUM", diretor: "Diretor Acadêmico EIFOL" } as const;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";

const DDI_OPTIONS = [
  { flag: "🇧🇷", code: "+55" }, { flag: "🇵🇹", code: "+351" }, { flag: "🇺🇸", code: "+1" },
  { flag: "🇦🇷", code: "+54" }, { flag: "🇲🇽", code: "+52" }, { flag: "🇨🇴", code: "+57" },
  { flag: "🇵🇾", code: "+595" }, { flag: "🇬🇧", code: "+44" },
];

function applyPhoneMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function applyCpfMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function PhoneField({ value, ddi, onDdiChange, onChange }: { value: string; ddi: string; onDdiChange: (d: string) => void; onChange: (v: string) => void }) {
  return (
    <div className="flex h-10 rounded-md border border-input focus-within:ring-1 focus-within:ring-ring overflow-hidden">
      <select value={ddi} onChange={(e) => onDdiChange(e.target.value)}
        className="shrink-0 border-0 border-r border-input bg-secondary/40 px-2 text-sm focus:outline-none cursor-pointer">
        {DDI_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.flag} {o.code}</option>)}
      </select>
      <input value={value} onChange={(e) => onChange(ddi === "+55" ? applyPhoneMask(e.target.value) : e.target.value.replace(/\D/g,"").slice(0,15))}
        placeholder="(41) 99999-9999"
        className="flex-1 border-0 bg-transparent px-3 text-sm focus:outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

export function CreateAffiliateDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (a: unknown) => void;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"geral" | "jocum" | "diretor">("geral");
  const [requiresReview, setRequiresReview] = useState(false);
  const [done, setDone] = useState<{ name: string; email: string; phone: string; password: string; type: typeof type; code: string; accountCreated: boolean } | null>(null);
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [phoneDdi, setPhoneDdi] = useState("+55");
  const [cpfDisplay, setCpfDisplay] = useState("");
  // Modo "usuário existente"
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; name: string; cpf: string; phone: string; alreadyAffiliate: boolean } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  function buildWppMsg(d: typeof done) {
    if (!d) return "";
    const typeLabel = TYPE_LABELS[d.type];
    const lines = [
      `Olá ${d.name.split(" ")[0]}! 👋`,
      ``,
      `Sua conta no programa de afiliados da *Editora Jocum* foi criada com sucesso!`,
      ``,
      `*Tipo:* ${typeLabel}`,
      d.accountCreated ? `*Acesso:* ${SITE_URL}/auth/login` : ``,
      d.accountCreated ? `*E-mail:* ${d.email}` : ``,
      d.accountCreated ? `*Senha inicial:* ${d.password}` : ``,
      ``,
      `*Seu link de afiliado:*`,
      `${SITE_URL}/r/${d.code}`,
      ``,
      `Compartilhe esse link e comece a ganhar! 🚀`,
    ].filter((l) => l !== null);
    return lines.join("\n");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string ?? "").trim();

    setSaving(true);
    try {
      const result = await createAffiliateWithAccountAction({
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        cpf: get("cpf"),
        password: get("password"),
        type,
        commission_rate: type === "geral" ? 30 : 50,
        serving_location: get("serving_location") || null,
        leader_name: type === "jocum" ? get("leader_name") || null : null,
        leader_email: type === "jocum" ? get("leader_email") || null : null,
        requires_review: requiresReview,
      });
      toast.success("Afiliado criado com sucesso");
      onCreated(result.affiliate);
      setDone({
        name: get("name"), email: get("email"), phone: get("phone"),
        password: get("password"), type, code: result.code,
        accountCreated: result.accountCreated,
      });
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Erro ao criar afiliado");
    } finally {
      setSaving(false);
    }
  }

  async function handleLookup() {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true); setLookupError(null); setFoundUser(null);
    const res = await lookupUserByEmailAction(lookupEmail.trim());
    setLookupLoading(false);
    if (!res.user) { setLookupError("Nenhum usuário encontrado com esse e-mail."); return; }
    if (res.user.alreadyAffiliate) { setLookupError("Este usuário já é afiliado."); return; }
    setFoundUser(res.user);
    setPhoneDisplay(res.user.phone ?? "");
    setCpfDisplay(applyCpfMask(res.user.cpf ?? ""));
  }

  function handleClose() {
    setDone(null); setMode("new"); setType("geral"); setRequiresReview(false);
    setPhoneDisplay(""); setPhoneDdi("+55"); setCpfDisplay("");
    setLookupEmail(""); setFoundUser(null); setLookupError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{done ? "Afiliado criado!" : "Criar afiliado"}</DialogTitle>
        </DialogHeader>

        {/* ── Toggle de modo ── */}
        {!done && (
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {(["new", "existing"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setFoundUser(null); setLookupError(null); }}
                className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${mode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "new" ? "Novo usuário" : "Usuário existente"}
              </button>
            ))}
          </div>
        )}

        {/* ── Tela de sucesso ── */}
        {done ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{done.name}</p>
                <p className="text-sm text-green-700">{done.email} · <Badge className="text-xs">{TYPE_LABELS[done.type]}</Badge></p>
                {done.accountCreated && <p className="text-xs text-green-600 mt-0.5">Conta criada · senha: <code className="font-mono">{done.password}</code></p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground font-medium">Link de afiliado:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary px-3 py-2 rounded-lg border truncate">{SITE_URL}/r/{done.code}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => { navigator.clipboard.writeText(`${SITE_URL}/r/${done.code}`); toast.success("Copiado!"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {done.phone && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const msg = encodeURIComponent(buildWppMsg(done));
                    const phone = done.phone.replace(/\D/g, "");
                    window.open(`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${msg}`, "_blank");
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Enviar via WhatsApp
                </Button>
              )}
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : mode === "existing" ? (

        /* ── Modo: usuário existente ── */
        <div className="flex flex-col gap-4 py-1">
          <div className="flex gap-2">
            <Input value={lookupEmail} onChange={(e) => { setLookupEmail(e.target.value); setLookupError(null); }}
              placeholder="E-mail do usuário cadastrado"
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className={lookupError ? "border-destructive" : ""}
            />
            <Button type="button" variant="outline" onClick={handleLookup} disabled={lookupLoading} className="shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}

          {foundUser && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <UserCheck className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">{foundUser.name || "(sem nome)"}</p>
                  <p className="text-xs text-blue-600">{foundUser.email}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tipo de participação</Label>
                <div className="flex gap-2 flex-wrap">
                  {(["geral", "jocum", "diretor"] as const).map((v) => (
                    <label key={v} className={`flex-1 border rounded-lg px-3 py-2 text-sm cursor-pointer text-center transition-colors min-w-[100px] ${type === v ? "border-brand bg-brand-50 text-brand font-medium" : "border-border text-muted-foreground"}`}>
                      <input type="radio" className="sr-only" checked={type === v} onChange={() => setType(v)} />
                      {TYPE_LABELS[v]}
                    </label>
                  ))}
                </div>
              </div>

              {type === "jocum" && (
                <Input name="serving_location_ex" placeholder="Base / Local de serviço" />
              )}

              <Button className="bg-brand hover:bg-brand-700 text-white w-full" disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const result = await createAffiliateWithAccountAction({
                      name: foundUser.name || foundUser.email,
                      email: foundUser.email,
                      phone: foundUser.phone || "",
                      cpf: foundUser.cpf || "",
                      password: "",
                      type,
                      commission_rate: type === "geral" ? 30 : 50,
                      serving_location: null,
                      leader_name: null,
                      leader_email: null,
                      requires_review: false,
                    });
                    toast.success("Afiliado criado com sucesso");
                    onCreated(result.affiliate);
                    setDone({ name: foundUser.name || foundUser.email, email: foundUser.email, phone: foundUser.phone || "", password: "", type, code: result.code, accountCreated: false });
                  } catch (err: unknown) {
                    toast.error((err as Error).message ?? "Erro");
                  } finally { setSaving(false); }
                }}>
                {saving ? "Promovendo…" : "Tornar afiliado"}
              </Button>
            </div>
          )}
        </div>

        ) : (

        /* ── Formulário (novo usuário) ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <Label>Nome completo</Label>
            <Input name="name" required placeholder="Nome completo" />
          </div>
          {/* Email + Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>E-mail</Label>
              <Input name="email" type="email" required placeholder="email@exemplo.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Telefone / WhatsApp</Label>
              <PhoneField value={phoneDisplay} ddi={phoneDdi} onDdiChange={setPhoneDdi} onChange={setPhoneDisplay} />
              <input type="hidden" name="phone" value={`${phoneDdi} ${phoneDisplay}`} />
            </div>
          </div>
          {/* CPF + Senha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>CPF</Label>
              <Input value={cpfDisplay} onChange={(e) => setCpfDisplay(applyCpfMask(e.target.value))} placeholder="000.000.000-00" required />
              <input type="hidden" name="cpf" value={cpfDisplay} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Senha inicial</Label>
              <Input name="password" type="text" required placeholder="Senha para o afiliado" minLength={6} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo de participação</Label>
            <div className="flex gap-2 flex-wrap">
              {(["geral", "jocum", "diretor"] as const).map((v) => (
                <label key={v} className={`flex-1 border rounded-lg px-3 py-2 text-sm cursor-pointer text-center transition-colors min-w-[100px] ${type === v ? "border-brand bg-brand-50 text-brand font-medium" : "border-border text-muted-foreground"}`}>
                  <input type="radio" className="sr-only" checked={type === v} onChange={() => { setType(v); setRequiresReview(v === "jocum"); }} />
                  {TYPE_LABELS[v]}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {type === "geral" ? "Margem 30% → 50% conforme vendas." : "Margem 50% fixo."}
            </p>
          </div>

          {type === "jocum" && (
            <div className="flex flex-col gap-1.5">
              <Label>Base / Local de serviço</Label>
              <Input name="serving_location" placeholder="Ex: Base JOCUM Curitiba" />
            </div>
          )}

          {type === "jocum" && (
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
          )}

          {type === "jocum" && (
            <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
              <input type="checkbox" checked={requiresReview} onChange={(e) => setRequiresReview(e.target.checked)} className="mt-0.5 accent-brand" />
              <div>
                <p className="text-sm font-medium">Requer avaliação periódica (6 meses)</p>
                <p className="text-xs text-muted-foreground mt-0.5">O líder será contatado a cada 6 meses para confirmar o vínculo.</p>
              </div>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand hover:bg-brand-700 text-white" disabled={saving}>
              {saving ? "Criando…" : "Criar afiliado"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
