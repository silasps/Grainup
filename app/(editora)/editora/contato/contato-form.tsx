"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Send, UserCircle, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createContactTicketAction } from "./actions";

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

const ASSUNTOS = [
  "Pedido / Entrega",
  "Dúvida sobre produto",
  "Troca ou devolução",
  "Parceria / Afiliados",
  "Imprensa",
  "Outro",
];

const ASSUNTOS_COM_PEDIDO = new Set(["Pedido / Entrega", "Dúvida sobre produto", "Troca ou devolução"]);

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  order_items: Array<{ quantity: number; books: { title: string } | null }>;
};

function applyPhoneMask(value: string, ddi: string) {
  const digits = value.replace(/\D/g, "");
  if (ddi !== "55") return digits.slice(0, 15);
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function parseStoredPhone(stored: string): { ddi: string; local: string } {
  if (!stored.startsWith("+")) {
    return { ddi: "55", local: applyPhoneMask(stored, "55") };
  }
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  const matched = sorted.find((c) => stored.startsWith("+" + c.code));
  if (matched) {
    return { ddi: matched.code, local: applyPhoneMask(stored.slice(matched.code.length + 1), matched.code) };
  }
  return { ddi: "55", local: stored.slice(1) };
}

export function ContatoForm() {
  const [enviado, setEnviado] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [logado, setLogado] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ddi, setDdi] = useState("55");
  const [telefone, setTelefone] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pedidoId, setPedidoId] = useState("");
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const pedidoRef = useRef<HTMLDivElement>(null);
  const [pedidos, setPedidos] = useState<Order[]>([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);

  useEffect(() => {
    async function preencherDados() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      const typedProf = prof as { full_name?: string; phone?: string } | null;
      setNome(typedProf?.full_name ?? user.user_metadata?.full_name ?? "");
      setEmail(user.email ?? "");

      if (typedProf?.phone) {
        const parsed = parseStoredPhone(typedProf.phone);
        setDdi(parsed.ddi);
        setTelefone(parsed.local);
      }

      setLogado(true);
    }
    preencherDados();
  }, []);

  useEffect(() => {
    if (!ASSUNTOS_COM_PEDIDO.has(assunto)) {
      setPedidos([]);
      setPedidoId("");
      return;
    }

    async function carregarPedidos() {
      setCarregandoPedidos(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCarregandoPedidos(false); return; }

      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, order_items(quantity, books(title))")
        .eq("user_id", user.id)
        .in("status", ["pago", "entregue"])
        .order("created_at", { ascending: false });

      setPedidos((data as Order[]) ?? []);
      setCarregandoPedidos(false);
    }
    carregarPedidos();
  }, [assunto]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pedidoRef.current && !pedidoRef.current.contains(e.target as Node)) {
        setPedidoOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const CATEGORY_MAP: Record<string, string> = {
    "Pedido / Entrega": "pedido",
    "Dúvida sobre produto": "produto",
    "Troca ou devolução": "devolucao",
    "Parceria / Afiliados": "parceria",
    "Imprensa": "imprensa",
    "Outro": "outros",
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nome.trim()) { setErro("Informe seu nome."); return; }
    if (!email.trim()) { setErro("Informe seu e-mail."); return; }
    if (!assunto) { setErro("Selecione o assunto."); return; }
    if (!mensagem.trim()) { setErro("Escreva uma mensagem."); return; }
    setErro("");
    setCarregando(true);

    const phoneDigits = telefone.replace(/\D/g, "");
    const selectedOrder = pedidos.find((p) => p.id === pedidoId);

    const result = await createContactTicketAction({
      customerName: nome.trim(),
      customerEmail: email.trim(),
      customerPhone: phoneDigits ? `+${ddi}${phoneDigits}` : null,
      orderId: selectedOrder?.id ?? null,
      category: CATEGORY_MAP[assunto] ?? "outros",
      subject: assunto,
      message: mensagem.trim(),
    });

    if (result.error) {
      setErro(result.error);
      setCarregando(false);
      return;
    }

    setProtocolo(result.ticketNumber!);
    setCarregando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="h-14 w-14 text-brand mb-4" />
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Mensagem enviada!</h2>
        <p className="text-muted-foreground max-w-sm mb-4">
          Recebemos sua mensagem e responderemos em breve pelo e-mail <strong>{email}</strong>.
        </p>
        {protocolo && (
          <div className="inline-block bg-secondary rounded-lg px-5 py-3 text-sm font-mono font-medium text-foreground mb-4">
            Protocolo: <span className="text-brand">{protocolo}</span>
          </div>
        )}
        <Button variant="outline" onClick={() => { setEnviado(false); setProtocolo(""); }}>
          Enviar nova mensagem
        </Button>
      </div>
    );
  }

  const mostrarPedidos = ASSUNTOS_COM_PEDIDO.has(assunto);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {logado && (
        <div className="flex items-center gap-2 text-xs text-brand bg-brand-50 border border-brand/20 rounded-lg px-3 py-2">
          <UserCircle className="h-3.5 w-3.5 shrink-0" />
          Campos preenchidos com os dados da sua conta. Você pode editá-los se quiser.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            name="nome"
            placeholder="Seu nome"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone">Telefone / WhatsApp (opcional)</Label>
        <div className="flex h-10 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="relative shrink-0">
            <select
              value={ddi}
              onChange={(e) => { setDdi(e.target.value); setTelefone(""); }}
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
            id="telefone"
            name="telefone"
            value={telefone}
            onChange={(e) => setTelefone(applyPhoneMask(e.target.value, ddi))}
            placeholder={ddi === "55" ? "(11) 99999-9999" : "Número"}
            inputMode="tel"
            className="flex-1 min-w-0 px-3 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assunto">Assunto</Label>
        <Select value={assunto} onValueChange={(v) => setAssunto(v ?? "")} required>
          <SelectTrigger id="assunto">
            <SelectValue placeholder="Selecione o assunto" />
          </SelectTrigger>
          <SelectContent>
            {ASSUNTOS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mostrarPedidos && (
        <div className="space-y-1.5" ref={pedidoRef}>
          <Label className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            Pedido relacionado
            <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
          </Label>
          {carregandoPedidos ? (
            <div className="h-10 rounded-md border border-input bg-secondary/40 animate-pulse" />
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Nenhum pedido concluído encontrado na sua conta.
            </p>
          ) : (
            <div className="relative">
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setPedidoOpen((v) => !v)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {pedidoId ? (() => {
                  const o = pedidos.find((p) => p.id === pedidoId);
                  return o ? (
                    <span className="truncate text-foreground">
                      #{o.order_number} — {o.order_items.map((i) => i.books?.title).filter(Boolean).join(", ")}
                    </span>
                  ) : null;
                })() : (
                  <span className="text-muted-foreground">Selecione o pedido (opcional)</span>
                )}
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${pedidoOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Painel */}
              {pedidoOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white shadow-lg overflow-hidden">
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {pedidos.map((order) => {
                      const titles = order.order_items.map((i) => i.books?.title).filter(Boolean) as string[];
                      const total = order.total?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "";
                      const date = new Date(order.created_at).toLocaleDateString("pt-BR");
                      const selected = pedidoId === order.id;
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => { setPedidoId(selected ? "" : order.id); setPedidoOpen(false); }}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-brand-50 ${selected ? "bg-brand-50" : "bg-white"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground">
                                #{order.order_number}
                                {selected && <span className="ml-2 text-[10px] font-bold text-brand">✓</span>}
                              </p>
                              {titles.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {titles.join(" · ")}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                            </div>
                            <p className="shrink-0 font-bold text-sm text-brand">{total}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="mensagem">Mensagem</Label>
        <Textarea
          id="mensagem"
          name="mensagem"
          placeholder="Descreva sua dúvida ou solicitação..."
          rows={5}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button
        type="submit"
        disabled={carregando}
        className="bg-brand hover:bg-brand-700 text-white w-full sm:w-auto px-8"
      >
        {carregando ? "Enviando..." : <><Send className="mr-2 h-4 w-4" /> Enviar mensagem</>}
      </Button>
    </form>
  );
}
