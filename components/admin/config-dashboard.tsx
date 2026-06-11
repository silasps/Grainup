"use client";

import { useState } from "react";
import {
  Mail,
  MapPin,
  Clock,
  Globe,
  Link2,
  MessageSquare,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveContactAction, saveLegalPageAction } from "@/app/(admin)/admin/editora/configuracoes/actions";
import { PhoneInput, COUNTRIES } from "@/components/checkout/phone-input";

type ContactSettings = {
  id: string;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  whatsapp_message: string | null;
  whatsapp_enabled: boolean;
  address: string | null;
  business_hours: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
};

type DaySchedule = { enabled: boolean; open: string; close: string };
type WeekSchedule = Record<string, DaySchedule>;

const DAYS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  seg: { enabled: true,  open: "09:00", close: "18:00" },
  ter: { enabled: true,  open: "09:00", close: "18:00" },
  qua: { enabled: true,  open: "09:00", close: "18:00" },
  qui: { enabled: true,  open: "09:00", close: "18:00" },
  sex: { enabled: true,  open: "09:00", close: "18:00" },
  sab: { enabled: false, open: "09:00", close: "13:00" },
  dom: { enabled: false, open: "09:00", close: "12:00" },
};

function parseSchedule(raw: string | null): WeekSchedule {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (parsed && typeof parsed === "object") return { ...DEFAULT_SCHEDULE, ...parsed };
  } catch {}
  return { ...DEFAULT_SCHEDULE };
}

type LegalPage = {
  id: string;
  type: "privacy" | "terms" | "returns" | "shipping" | "cookies";
  title: string;
  content: string;
  updated_at: string;
};

const LEGAL_LABELS: Record<LegalPage["type"], string> = {
  privacy: "Política de Privacidade",
  terms: "Termos de Uso",
  returns: "Política de Devoluções",
  shipping: "Política de Frete",
  cookies: "Política de Cookies",
};

// Parse stored value like "+55 (41) 99999-9999" → { countryCode: "BR", localValue: "(41) 99999-9999" }
function parseStoredPhone(stored: string | null): { countryCode: string; localValue: string } {
  if (!stored) return { countryCode: "BR", localValue: "" };
  for (const country of COUNTRIES) {
    const prefix = country.ddi + " ";
    if (stored.startsWith(prefix)) {
      return { countryCode: country.code, localValue: stored.slice(prefix.length) };
    }
  }
  return { countryCode: "BR", localValue: stored };
}

// Combine DDI + local into storable string: "+55 (41) 99999-9999"
function buildStoredPhone(countryCode: string, localValue: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  return localValue ? `${country.ddi} ${localValue}` : "";
}

interface Props {
  contact: ContactSettings | null;
  legalPages: LegalPage[];
}

export function ConfigDashboard({ contact, legalPages }: Props) {
  const [isPending, setIsPending] = useState(false);

  // Parse phone fields from DB on init
  const parsedPhone = parseStoredPhone(contact?.phone ?? null);
  const parsedWhatsapp = parseStoredPhone(contact?.whatsapp ?? null);

  // Phone field state (DDI + local value separate, combined on save)
  const [phoneCountry, setPhoneCountry] = useState(parsedPhone.countryCode);
  const [phoneLocal, setPhoneLocal] = useState(parsedPhone.localValue);
  const [whatsappCountry, setWhatsappCountry] = useState(parsedWhatsapp.countryCode);
  const [whatsappLocal, setWhatsappLocal] = useState(parsedWhatsapp.localValue);

  // Schedule state (serialized to business_hours on save)
  const [schedule, setSchedule] = useState<WeekSchedule>(() =>
    parseSchedule(contact?.business_hours ?? null)
  );

  function setDay(key: string, patch: Partial<DaySchedule>) {
    setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setContactStatus("idle");
  }

  // Rest of contact form
  const [contactForm, setContactForm] = useState({
    email: contact?.email ?? "",
    whatsapp_message: contact?.whatsapp_message ?? "",
    whatsapp_enabled: contact?.whatsapp_enabled ?? true,
    address: contact?.address ?? "",
    instagram: contact?.instagram ?? "",
    facebook: contact?.facebook ?? "",
    youtube: contact?.youtube ?? "",
  });
  const [contactStatus, setContactStatus] = useState<"idle" | "ok" | "error">("idle");

  // Legal pages state
  const [pages, setPages] = useState<LegalPage[]>(legalPages);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [legalStatus, setLegalStatus] = useState<Record<string, "idle" | "ok" | "error">>({});

  function setField(key: keyof typeof contactForm, value: string | boolean) {
    setContactForm((prev) => ({ ...prev, [key]: value }));
    setContactStatus("idle");
  }

  function setPageContent(id: string, content: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
    setLegalStatus((prev) => ({ ...prev, [id]: "idle" }));
  }

  async function saveContact() {
    setIsPending(true);
    const { error } = await saveContactAction({
      id: contact?.id ?? crypto.randomUUID(),
      ...contactForm,
      phone: buildStoredPhone(phoneCountry, phoneLocal),
      whatsapp: buildStoredPhone(whatsappCountry, whatsappLocal),
      business_hours: JSON.stringify(schedule),
    });
    setIsPending(false);
    setContactStatus(error ? "error" : "ok");
  }

  async function saveLegalPage(page: LegalPage) {
    setIsPending(true);
    const { error } = await saveLegalPageAction({ id: page.id, title: page.title, content: page.content });
    setIsPending(false);
    setLegalStatus((prev) => ({ ...prev, [page.id]: error ? "error" : "ok" }));
  }

  return (
    <Tabs defaultValue="contato" className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 border-b border-border bg-white">
        <TabsList className="h-9">
          <TabsTrigger value="contato" className="text-xs px-4">
            Contato
          </TabsTrigger>
          <TabsTrigger value="legal" className="text-xs px-4">
            Páginas Legais
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="text-xs px-4">
            Integrações
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ─── Contato ─────────────────────────────────────────────── */}
      <TabsContent value="contato" className="min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl space-y-6 pb-16">
          <Section icon={<Mail className="h-4 w-4" />} title="Canal principal">
            <Field label="E-mail de contato">
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="contato@editora.com.br"
              />
            </Field>
            <Field label="Telefone">
              <PhoneInput
                value={phoneLocal}
                countryCode={phoneCountry}
                onChange={(v) => { setPhoneLocal(v); setContactStatus("idle"); }}
                onCountryChange={(code) => { setPhoneCountry(code); setPhoneLocal(""); setContactStatus("idle"); }}
              />
            </Field>
          </Section>

          <Section
            icon={<MessageSquare className="h-4 w-4" />}
            title={
              <span className="flex items-center gap-1.5">
                WhatsApp
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.533 5.857L.057 23.428a.75.75 0 0 0 .921.921l5.571-1.476A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.668-.523-5.188-1.432l-.372-.22-3.856 1.021 1.021-3.856-.22-.372A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
              </span>
            }
          >
            <Field label="Número WhatsApp">
              <PhoneInput
                value={whatsappLocal}
                countryCode={whatsappCountry}
                onChange={(v) => { setWhatsappLocal(v); setContactStatus("idle"); }}
                onCountryChange={(code) => { setWhatsappCountry(code); setWhatsappLocal(""); setContactStatus("idle"); }}
              />
            </Field>
            <Field label="Mensagem padrão ao abrir chat">
              <Textarea
                value={contactForm.whatsapp_message}
                onChange={(e) => setField("whatsapp_message", e.target.value)}
                placeholder="Olá! Gostaria de saber mais sobre..."
                rows={3}
              />
            </Field>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setField("whatsapp_enabled", !contactForm.whatsapp_enabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  contactForm.whatsapp_enabled ? "bg-brand" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    contactForm.whatsapp_enabled ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-muted-foreground">
                Botão flutuante WhatsApp {contactForm.whatsapp_enabled ? "ativado" : "desativado"}
              </span>
            </div>
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Endereço">
            <Field label="Endereço completo">
              <Textarea
                value={contactForm.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Rua Exemplo, 123 — Bairro, Cidade - UF, CEP 00000-000"
                rows={2}
              />
            </Field>
          </Section>

          <Section icon={<Clock className="h-4 w-4" />} title="Horário de atendimento">
            <div className="space-y-1">
              {DAYS.map(({ key, label }) => {
                const day = schedule[key];
                return (
                  <div
                    key={key}
                    className="grid grid-cols-[7rem_auto] items-center gap-3 py-2 border-b border-border/50 last:border-0"
                  >
                    {/* Day + toggle */}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDay(key, { enabled: !day.enabled })}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                          day.enabled ? "bg-brand" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            day.enabled ? "translate-x-4.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${day.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                        {label}
                      </span>
                    </div>

                    {/* Time range or closed badge */}
                    {day.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={day.open}
                          onChange={(e) => setDay(key, { open: e.target.value })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">até</span>
                        <input
                          type="time"
                          value={day.close}
                          onChange={(e) => setDay(key, { close: e.target.value })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-gray-100 rounded px-2 py-0.5 w-fit">
                        Fechado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section icon={<Globe className="h-4 w-4" />} title="Redes Sociais">
            <Field label="Instagram">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={contactForm.instagram}
                  onChange={(e) => setField("instagram", e.target.value)}
                  placeholder="https://instagram.com/editorajocum"
                />
              </div>
            </Field>
            <Field label="Facebook">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={contactForm.facebook}
                  onChange={(e) => setField("facebook", e.target.value)}
                  placeholder="https://facebook.com/editorajocum"
                />
              </div>
            </Field>
            <Field label="YouTube">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={contactForm.youtube}
                  onChange={(e) => setField("youtube", e.target.value)}
                  placeholder="https://youtube.com/@editorajocum"
                />
              </div>
            </Field>
          </Section>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={saveContact} disabled={isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {isPending ? "Salvando..." : "Salvar configurações"}
            </Button>
            {contactStatus === "ok" && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Salvo com sucesso
              </span>
            )}
            {contactStatus === "error" && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> Erro ao salvar
              </span>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ─── Páginas Legais ───────────────────────────────────────── */}
      <TabsContent value="legal" className="min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm text-muted-foreground">
            Edite o conteúdo de cada página legal exibida na loja. Use markdown para formatação.
          </p>

          {pages.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma página legal encontrada. Crie registros na tabela{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">legal_pages</code>.
            </div>
          )}

          {pages.map((page) => {
            const isOpen = expanded === page.id;
            const status = legalStatus[page.id] ?? "idle";

            return (
              <div
                key={page.id}
                className="bg-white rounded-xl border border-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : page.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{LEGAL_LABELS[page.type]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Atualizado em{" "}
                        {new Date(page.updated_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`title-${page.id}`}>Título da página</Label>
                      <Input
                        id={`title-${page.id}`}
                        value={page.title}
                        onChange={(e) =>
                          setPages((prev) =>
                            prev.map((p) => (p.id === page.id ? { ...p, title: e.target.value } : p))
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`content-${page.id}`}>Conteúdo (Markdown)</Label>
                      <Textarea
                        id={`content-${page.id}`}
                        value={page.content}
                        onChange={(e) => setPageContent(page.id, e.target.value)}
                        rows={16}
                        className="font-mono text-xs resize-y"
                        placeholder="## Título&#10;&#10;Conteúdo da página..."
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => saveLegalPage(page)}
                        disabled={isPending}
                        className="gap-2"
                        size="sm"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isPending ? "Salvando..." : "Salvar página"}
                      </Button>
                      {status === "ok" && (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> Salvo
                        </span>
                      )}
                      {status === "error" && (
                        <span className="flex items-center gap-1.5 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" /> Erro ao salvar
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TabsContent>

      {/* ─── Integrações ─────────────────────────────────────── */}
      <TabsContent value="integracoes" className="min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl space-y-6 pb-16">
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-muted-foreground">🔗</span>
              Bling ERP
            </h3>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Bling para sincronizar pedidos, notas fiscais e estoque automaticamente.
            </p>
            <a
              href="/api/bling/auth"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Conectar ao Bling
            </a>
            <p className="text-xs text-muted-foreground">
              Você será redirecionado ao Bling para autorizar o acesso. Após autorizar, volta aqui automaticamente.
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
