"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, CheckCircle, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "pedido", label: "Meu pedido" },
  { value: "pagamento", label: "Pagamento" },
  { value: "entrega", label: "Entrega / Frete" },
  { value: "produto", label: "Produto / Livro" },
  { value: "devolucao", label: "Devolução / Troca" },
  { value: "outros", label: "Outros" },
];

interface Profile {
  name: string;
  email: string;
  user_id: string;
}

export default function SACPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    order_id: "",
    category: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      const name = (prof as { full_name?: string } | null)?.full_name ?? user.user_metadata?.full_name ?? "";
      const email = user.email ?? "";
      setProfile({ name, email, user_id: user.id });
      setForm((f) => ({ ...f, name, email }));
    }
    loadUser();
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.category || !form.subject.trim() || !form.message.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .insert({
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim() || null,
        order_id: form.order_id.trim() || null,
        category: form.category,
        subject: form.subject.trim(),
        status: "novo",
        user_id: profile?.user_id ?? null,
      })
      .select("id, ticket_number")
      .single();

    if (ticketErr || !ticket) {
      setError("Não foi possível abrir o chamado. Tente novamente.");
      setLoading(false);
      return;
    }

    const { id: ticketId, ticket_number } = ticket as { id: string; ticket_number: string };

    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_name: form.name.trim(),
      sender_id: profile?.user_id ?? null,
      body: form.message.trim(),
      is_admin: false,
    });

    setTicketNumber(ticket_number);

    setLoading(false);
  }

  if (ticketNumber) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
            Chamado aberto!
          </h1>
          <p className="text-muted-foreground mb-4">
            Recebemos sua mensagem e entraremos em contato em breve pelo e-mail <strong>{form.email}</strong>.
          </p>
          <div className="inline-block bg-secondary rounded-lg px-5 py-3 text-sm font-mono font-medium text-foreground">
            Protocolo: <span className="text-brand">{ticketNumber}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Guarde esse número para acompanhar seu atendimento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand/20">
              <MessageCircle className="h-5 w-5 text-brand" />
            </div>
            <span className="text-sm font-medium text-white/70">Atendimento ao Cliente</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-4 max-w-2xl">
            Como podemos <span className="text-brand">te ajudar?</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            Preencha o formulário abaixo e nossa equipe responderá pelo e-mail informado em até 2 dias úteis.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-14 px-4">
        <div className="container mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order_id">Nº do pedido <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  id="order_id"
                  value={form.order_id}
                  onChange={(e) => set("order_id", e.target.value)}
                  placeholder="Ex: 1234"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria <span className="text-destructive">*</span></Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Selecione o assunto</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject">Assunto <span className="text-destructive">*</span></Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Resumo da sua dúvida ou problema"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Mensagem <span className="text-destructive">*</span></Label>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Descreva sua dúvida ou problema com o máximo de detalhes possível..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-700 text-white h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar chamado"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Respondemos em até 2 dias úteis pelo e-mail informado.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
