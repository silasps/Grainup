"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check, ChevronRight, MapPin, Truck,
  CreditCard, PackageCheck, Loader2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Step = "endereco" | "entrega" | "confirmacao";

const STEPS: Array<{ id: Step; label: string; icon: React.ElementType }> = [
  { id: "endereco", label: "Endereço", icon: MapPin },
  { id: "entrega", label: "Entrega", icon: Truck },
  { id: "confirmacao", label: "Confirmação", icon: CreditCard },
];

const SHIPPING_OPTIONS = [
  { id: "pac", label: "PAC — Correios", days: "8–15 dias úteis", price: 18.9 },
  { id: "sedex", label: "SEDEX — Correios", days: "2–5 dias úteis", price: 32.5 },
  { id: "gratis", label: "Frete Grátis", days: "10–20 dias úteis", price: 0, minOrder: 200 },
];

const PAYMENT_OPTIONS = [
  { id: "pix", label: "PIX", description: "5% de desconto · Aprovação imediata" },
  { id: "cartao_credito", label: "Cartão de Crédito", description: "Em até 3x sem juros" },
  { id: "cartao_debito", label: "Cartão de Débito", description: "Aprovação imediata" },
];

type SavedAddress = {
  id: string;
  label: string | null;
  full_name: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
};

interface IdentData { name: string; email: string }
interface AddrData {
  cep: string; street: string; number: string;
  complement: string; neighborhood: string; city: string; state: string;
}

const emptyIdent: IdentData = { name: "", email: "" };
const emptyAddr: AddrData = {
  cep: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
};

export function CheckoutFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("endereco");
  const [shipping, setShipping] = useState("pac");
  const [payment, setPayment] = useState("pix");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [ident, setIdent] = useState<IdentData>(emptyIdent);
  const [addr, setAddr] = useState<AddrData>(emptyAddr);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/cadastro?redirectTo=/checkout");
        return;
      }
      const [{ data: profile }, { data: addresses }] = await Promise.all([
        supabase.from("profiles").select("full_name, cpf, phone").eq("id", user.id).single(),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setIdent({ name: profile?.full_name ?? "", email: user.email ?? "" });

      const addrs = (addresses ?? []) as SavedAddress[];
      setSavedAddresses(addrs);

      if (addrs.length > 0) {
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        setSelectedSavedId(def.id);
        fillAddrFromSaved(def);
      } else {
        setShowManualForm(true);
      }

      setAuthLoading(false);
    });
  }, [router]);

  function fillAddrFromSaved(a: SavedAddress) {
    setAddr({
      cep: a.zip_code,
      street: a.street,
      number: a.number,
      complement: a.complement ?? "",
      neighborhood: a.neighborhood,
      city: a.city,
      state: a.state,
    });
    setErrors({});
  }

  const { items: storeItems, buyNowItem, clear, clearBuyNow } = useCartStore();

  const items = mounted
    ? buyNowItem
      ? [{ ...buyNowItem, quantity: 1 }]
      : storeItems
    : [];
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const selectedShipping = SHIPPING_OPTIONS.find((s) => s.id === shipping)!;
  const shippingPrice = sub >= 200 ? 0 : selectedShipping.price;
  const pixDiscount = payment === "pix" ? sub * 0.05 : 0;
  const total = sub + shippingPrice - pixDiscount;

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);
  const visibleSteps = STEPS.slice(0, -1);
  const visibleStepIndex = visibleSteps.findIndex((s) => s.id === step);

  function goNext() {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex].id);
  }

  function maskCep(raw: string): string {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  function setAdF(field: keyof AddrData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const value = field === "cep" ? maskCep(raw) : raw;
      setAddr((p) => ({ ...p, [field]: value }));
      setErrors((p) => ({ ...p, [field]: "" }));
      if (field === "cep") lookupCep(value);
    };
  }

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddr((p) => ({
          ...p,
          street: data.logradouro ?? p.street,
          neighborhood: data.bairro ?? p.neighborhood,
          city: data.localidade ?? p.city,
          state: data.uf ?? p.state,
        }));
      }
    } catch {
      // silently ignore network errors
    } finally {
      setCepLoading(false);
    }
  }

  function validateAddr() {
    const e: Record<string, string> = {};
    if (!addr.cep.trim()) e.cep = "Obrigatório";
    if (!addr.street.trim()) e.street = "Obrigatório";
    if (!addr.number.trim()) e.number = "Obrigatório";
    if (!addr.city.trim()) e.city = "Obrigatório";
    if (!addr.state.trim()) e.state = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAddrNext() {
    if (validateAddr()) goNext();
  }

  async function placeOrder() {
    setPlacing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setPlacing(false);
      return;
    }

    const paymentMethodMap: Record<string, "pix" | "credito" | "debito"> = {
      pix: "pix",
      cartao_credito: "credito",
      cartao_debito: "debito",
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_email: ident.email,
        customer_name: ident.name,
        shipping_address: {
          cep: addr.cep,
          street: addr.street,
          number: addr.number,
          complement: addr.complement || null,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
        },
        subtotal: sub,
        discount: pixDiscount,
        shipping_cost: shippingPrice,
        total,
        status: "aguardando_pagamento" as const,
        payment_status: "pendente" as const,
        payment_method: paymentMethodMap[payment] ?? null,
        fiscal_status: "nao_emitida" as const,
        customer_cpf: null,
        affiliate_id: null,
        coupon_code: null,
        notes: null,
        tracking_code: null,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      toast.error("Erro ao finalizar pedido. Tente novamente.");
      setPlacing(false);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        book_id: item.type === "book" ? item.id : null,
        combo_id: item.type === "combo" ? item.id : null,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }))
    );

    if (itemsError) {
      toast.error("Erro ao salvar itens do pedido. Contate o suporte.");
      setPlacing(false);
      return;
    }

    setOrderNumber(order.order_number);
    setOrderPlaced(true);
    setStep("confirmacao");
    clear();
    clearBuyNow();
    setPlacing(false);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (orderPlaced && step === "confirmacao") {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center">
          <PackageCheck className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            Pedido realizado! 🎉
          </h1>
          <p className="text-muted-foreground mb-1">
            Seu pedido <strong>{orderNumber}</strong> foi recebido com sucesso.
          </p>
          <p className="text-sm text-muted-foreground">
            Em breve você receberá um e-mail com a confirmação e os dados para pagamento.
          </p>
        </div>

        <div className="w-full bg-white rounded-xl border border-border p-5 text-left">
          <h2 className="font-semibold text-sm mb-3">Resumo do pedido</h2>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Número</span>
            <span className="font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Pagamento</span>
            <span className="font-medium capitalize">{payment.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Entrega</span>
            <span className="font-medium">{selectedShipping.label}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <Button asChild className="bg-brand hover:bg-brand-700 text-white">
            <Link href="/minha-conta/pedidos">Ver meus pedidos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/editora/livros">Continuar comprando</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Stepper */}
      <div className="flex items-center mb-8 overflow-x-auto px-1 py-1">
        {visibleSteps.map((s, i) => {
          const done = visibleStepIndex > i;
          const active = visibleStepIndex === i;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    done
                      ? "bg-brand text-white"
                      : active
                      ? "bg-brand text-white ring-2 ring-brand ring-offset-2"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:block",
                    active
                      ? "font-semibold text-foreground"
                      : done
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < visibleSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-2 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-border p-6">

            {/* ── Step: Endereço ── */}
            {step === "endereco" && (
              <div>
                <h2 className="font-heading font-bold text-lg mb-5">Endereço de entrega</h2>

                {/* Saved addresses */}
                {savedAddresses.length > 0 && (
                  <div className="flex flex-col gap-3 mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Endereços salvos
                    </p>
                    {savedAddresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-colors",
                          selectedSavedId === a.id && !showManualForm
                            ? "border-brand bg-brand-50"
                            : "border-border hover:border-brand/50"
                        )}
                        onClick={() => {
                          setSelectedSavedId(a.id);
                          setShowManualForm(false);
                          fillAddrFromSaved(a);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {a.label && (
                                <span className="text-xs font-semibold text-brand bg-brand-50 border border-brand/20 px-2 py-0.5 rounded-full">
                                  {a.label}
                                </span>
                              )}
                              {a.is_default && (
                                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-sm text-foreground">{a.full_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.street}, {a.number}
                              {a.complement && ` — ${a.complement}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {a.neighborhood} · {a.city}/{a.state} · CEP {a.zip_code}
                            </p>
                          </div>
                          {selectedSavedId === a.id && !showManualForm && (
                            <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-colors flex items-center gap-3",
                        showManualForm
                          ? "border-brand bg-brand-50"
                          : "border-dashed border-border hover:border-brand/50"
                      )}
                      onClick={() => {
                        setShowManualForm(true);
                        setSelectedSavedId(null);
                        setAddr(emptyAddr);
                        setErrors({});
                      }}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        showManualForm ? "border-brand bg-brand" : "border-muted-foreground/40"
                      )}>
                        {showManualForm
                          ? <Check className="h-3 w-3 text-white" />
                          : <Plus className="h-3 w-3 text-muted-foreground/60" />
                        }
                      </div>
                      <span className="text-sm text-muted-foreground">Usar outro endereço</span>
                    </button>
                  </div>
                )}

                {/* Manual form */}
                {showManualForm && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="CEP" error={errors.cep} className="col-span-2">
                        <div className="relative">
                          <Input
                            placeholder="00000-000"
                            inputMode="numeric"
                            value={addr.cep}
                            onChange={setAdF("cep")}
                            maxLength={9}
                          />
                          {cepLoading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </Field>
                    </div>
                    <Field label="Logradouro" error={errors.street}>
                      <Input
                        placeholder="Rua, Avenida..."
                        value={addr.street}
                        onChange={setAdF("street")}
                      />
                    </Field>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Número" error={errors.number}>
                        <Input
                          placeholder="123"
                          value={addr.number}
                          onChange={setAdF("number")}
                        />
                      </Field>
                      <Field label="Complemento" className="col-span-2">
                        <Input
                          placeholder="Apto, Bloco..."
                          value={addr.complement}
                          onChange={setAdF("complement")}
                        />
                      </Field>
                    </div>
                    <Field label="Bairro">
                      <Input
                        placeholder="Seu bairro"
                        value={addr.neighborhood}
                        onChange={setAdF("neighborhood")}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Cidade" error={errors.city}>
                        <Input
                          placeholder="Sua cidade"
                          value={addr.city}
                          onChange={setAdF("city")}
                        />
                      </Field>
                      <Field label="Estado" error={errors.state}>
                        <Input
                          placeholder="PR"
                          value={addr.state}
                          onChange={setAdF("state")}
                          maxLength={2}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                <Button
                  className="bg-brand hover:bg-brand-700 text-white mt-5 w-full"
                  onClick={handleAddrNext}
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* ── Step: Entrega + Pagamento ── */}
            {step === "entrega" && (
              <div>
                <h2 className="font-heading font-bold text-lg mb-5">Forma de entrega</h2>
                <RadioGroup
                  value={shipping}
                  onValueChange={setShipping}
                  className="flex flex-col gap-3"
                >
                  {SHIPPING_OPTIONS.filter((s) => s.id !== "gratis" || sub >= 200).map((opt) => (
                    <label
                      key={opt.id}
                      htmlFor={`ship-${opt.id}`}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors",
                        shipping === opt.id ? "border-brand bg-brand-50" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={opt.id} id={`ship-${opt.id}`} />
                        <div>
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.days}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {opt.id === "gratis" && (
                          <Badge className="bg-brand text-white text-[10px]">Grátis</Badge>
                        )}
                        <p className="font-bold text-sm">
                          {opt.price === 0 ? "Grátis" : formatCurrency(opt.price)}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                <Separator className="my-5" />

                <h3 className="font-semibold text-sm mb-3">Forma de pagamento</h3>
                <RadioGroup
                  value={payment}
                  onValueChange={setPayment}
                  className="flex flex-col gap-3"
                >
                  {PAYMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      htmlFor={`pay-${opt.id}`}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors",
                        payment === opt.id ? "border-brand bg-brand-50" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={opt.id} id={`pay-${opt.id}`} />
                        <div>
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                <Button
                  className="bg-brand hover:bg-brand-700 text-white mt-5 w-full"
                  onClick={goNext}
                >
                  Revisar pedido
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* ── Step: Confirmação ── */}
            {step === "confirmacao" && (
              <div>
                <h2 className="font-heading font-bold text-lg mb-5">Revisão do pedido</h2>
                <div className="flex flex-col gap-4">
                  <div className="bg-secondary rounded-lg p-4">
                    <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Itens ({count})
                    </h3>
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1">
                        <span className="text-foreground line-clamp-1 max-w-[250px]">
                          {item.quantity}× {item.title}
                        </span>
                        <span className="font-medium flex-shrink-0 ml-2">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-secondary rounded-lg p-4 text-sm flex flex-col gap-1">
                    {ident.name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente</span>
                        <span>{ident.name}</span>
                      </div>
                    )}
                    {addr.city && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Endereço</span>
                        <span className="text-right max-w-[200px] truncate">
                          {addr.street}, {addr.number} — {addr.city}/{addr.state}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entrega</span>
                      <span>{selectedShipping.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pagamento</span>
                      <span className="capitalize">{payment.replace("_", " ")}</span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="bg-brand hover:bg-brand-700 text-white font-semibold w-full"
                    onClick={placeOrder}
                    disabled={placing}
                  >
                    {placing ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <PackageCheck className="h-5 w-5 mr-2" />
                    )}
                    {placing ? "Processando..." : "Confirmar pedido"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao confirmar, você aceita os{" "}
                    <Link href="/editora/termos-de-uso" className="text-brand hover:underline">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/editora/politica-de-privacidade"
                      className="text-brand hover:underline"
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-border p-5 sticky top-4">
            <h3 className="font-semibold text-sm mb-4">Resumo do pedido</h3>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({count} itens)</span>
                <span>{formatCurrency(sub)}</span>
              </div>

              {shippingPrice > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{formatCurrency(shippingPrice)}</span>
                </div>
              ) : sub > 0 ? (
                <div className="flex justify-between text-brand">
                  <span>Frete</span>
                  <span className="font-medium">Grátis 🎉</span>
                </div>
              ) : null}

              {pixDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto PIX (5%)</span>
                  <span>-{formatCurrency(pixDiscount)}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-brand">{formatCurrency(total)}</span>
              </div>
            </div>

            {sub < 200 && sub > 0 && (
              <div className="mt-4 p-3 bg-brand-50 rounded-lg text-xs text-brand">
                Adicione mais {formatCurrency(200 - sub)} para frete grátis!
              </div>
            )}
            <Button variant="outline" size="sm" asChild className="w-full mt-3">
              <Link href="/editora/livros">Continuar comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
