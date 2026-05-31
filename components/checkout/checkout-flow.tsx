"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Check, ChevronLeft, ChevronRight, MapPin, PackageCheck, Loader2, Plus, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart";
import { placeOrderAction } from "@/app/(checkout)/checkout/actions";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Step = "preparando" | "endereco" | "frete" | "pagamento" | "revisao" | "sucesso";

const STEP_ORDER: Step[] = ["preparando", "endereco", "frete", "pagamento", "revisao", "sucesso"];

const STEP_TITLES: Partial<Record<Step, string>> = {
  endereco: "Escolha o endereço de entrega",
  frete: "Escolha a modalidade de entrega",
  pagamento: "Escolha como pagar",
  revisao: "Revise e confirme",
};

const SHIPPING_OPTIONS = [
  { id: "pac",    label: "PAC — Correios",   minDays: 8,  maxDays: 15, price: 18.9, badge: null as string | null },
  { id: "sedex",  label: "SEDEX — Correios", minDays: 2,  maxDays: 5,  price: 32.5, badge: "RÁPIDO" },
  { id: "gratis", label: "Econômico",        minDays: 10, maxDays: 20, price: 0,    badge: "GRÁTIS", minOrder: 200 },
];

const WEEKDAYS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS_PT   = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function formatDeliveryRange(minDays: number, maxDays: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = addBusinessDays(today, minDays);
  const maxDate = addBusinessDays(today, maxDays);
  const diffMin = Math.round((minDate.getTime() - today.getTime()) / 86400000);
  const diffMax = Math.round((maxDate.getTime() - today.getTime()) / 86400000);
  const fmtMin = diffMin <= 6 ? WEEKDAYS_PT[minDate.getDay()] : `${minDate.getDate()} de ${MONTHS_PT[minDate.getMonth()]}`;
  const fmtMax = diffMax <= 6 ? WEEKDAYS_PT[maxDate.getDay()] : `${maxDate.getDate()} de ${MONTHS_PT[maxDate.getMonth()]}`;
  if (diffMin > 6 && diffMax > 6 && minDate.getMonth() === maxDate.getMonth()) {
    return `Entre ${minDate.getDate()} e ${maxDate.getDate()} de ${MONTHS_PT[minDate.getMonth()]}`;
  }
  return `Entre ${fmtMin} e ${fmtMax}`;
}

const PAYMENT_OPTIONS = [
  { id: "pix", label: "Pix", description: "Aprovação imediata", badge: "5% OFF", badgeColor: "bg-emerald-500" },
  { id: "cartao_credito", label: "Cartão de Crédito", description: "Em até 3x sem juros", badge: null as string | null, badgeColor: null as string | null },
  { id: "cartao_debito", label: "Cartão de Débito", description: "Aprovação imediata", badge: null as string | null, badgeColor: null as string | null },
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

function applyCpfMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

interface IdentData { name: string; email: string; cpf: string }
interface AddrData {
  cep: string; street: string; number: string;
  complement: string; neighborhood: string; city: string; state: string;
}

const emptyAddr: AddrData = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

export function CheckoutFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("preparando");
  const [shipping, setShipping] = useState("pac");
  const [payment, setPayment] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [ident, setIdent] = useState<IdentData>({ name: "", email: "", cpf: "" });
  const [addr, setAddr] = useState<AddrData>(emptyAddr);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cpfInput, setCpfInput] = useState("");
  const [cpfError, setCpfError] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topConfirmRef = useRef<HTMLButtonElement>(null);
  const cpfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/cadastro?redirectTo=/checkout");
        return;
      }
      const [{ data: profile }, { data: addresses }] = await Promise.all([
        supabase.from("profiles").select("full_name, cpf").eq("id", user.id).single(),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setIdent({ name: profile?.full_name ?? "", email: user.email ?? "", cpf: profile?.cpf ?? "" });
      const addrs = (addresses ?? []) as SavedAddress[];
      setSavedAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        fillAddrFromSaved(def);
      } else {
        setShowAddressForm(true);
      }
      setStep("endereco");
    });
  }, [router]);

  useEffect(() => {
    if (step !== "revisao") {
      setShowStickyFooter(false);
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;

    function check() {
      const button = topConfirmRef.current;
      if (!button || !container) return;
      const buttonBottom = button.getBoundingClientRect().bottom;
      const containerTop = container.getBoundingClientRect().top;
      setShowStickyFooter(buttonBottom < containerTop);
    }

    container.addEventListener("scroll", check);
    // verifica estado inicial (caso o botão já esteja fora da view)
    check();
    return () => container.removeEventListener("scroll", check);
  }, [step]);

  function fillAddrFromSaved(a: SavedAddress) {
    setAddr({
      cep: a.zip_code, street: a.street, number: a.number,
      complement: a.complement ?? "", neighborhood: a.neighborhood,
      city: a.city, state: a.state,
    });
    setErrors({});
  }

  const { items: storeItems, buyNowItem, clear, clearBuyNow } = useCartStore();
  const items = mounted ? (buyNowItem ? [{ ...buyNowItem, quantity: 1 }] : storeItems) : [];
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedShipping = SHIPPING_OPTIONS.find((s) => s.id === shipping)!;
  const shippingPrice = sub >= 200 ? 0 : selectedShipping.price;
  const pixDiscount = payment === "pix" ? sub * 0.05 : 0;
  const total = sub + shippingPrice - pixDiscount;
  const selectedPayment = PAYMENT_OPTIONS.find((p) => p.id === payment);
  const originalTotal = sub + selectedShipping.price;
  const savings = originalTotal - total;

  function goBack() {
    if (returnToReview) {
      setReturnToReview(false);
      setStep("revisao");
      return;
    }
    const i = STEP_ORDER.indexOf(step);
    if (i > 1) setStep(STEP_ORDER[i - 1]);
    else router.back();
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
      // silently ignore
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

  function handleSelectAddress(a: SavedAddress) {
    fillAddrFromSaved(a);
    if (returnToReview) {
      setReturnToReview(false);
      setStep("revisao");
    } else {
      setStep("frete");
    }
  }

  function handleAddrFormContinue() {
    if (!validateAddr()) return;
    if (returnToReview) {
      setReturnToReview(false);
      setStep("revisao");
    } else {
      setStep("frete");
    }
  }

  function handleSelectPayment(id: string) {
    setPayment(id);
    setReturnToReview(false);
    setStep("revisao");
  }

  async function placeOrder() {
    const cpf = ident.cpf || cpfInput.replace(/\D/g, "");
    if (!cpf || cpf.length < 11) {
      setCpfError(true);
      toast.error("Informe seu CPF para emissão da nota fiscal.");
      cpfInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => cpfInputRef.current?.focus(), 300);
      return;
    }
    setPlacing(true);

    const paymentMethodMap: Record<string, "pix" | "credito" | "debito"> = {
      pix: "pix", cartao_credito: "credito", cartao_debito: "debito",
    };

    const result = await placeOrderAction({
      customerName: ident.name,
      customerEmail: ident.email,
      customerCpf: cpf,
      shippingAddress: {
        cep: addr.cep, street: addr.street, number: addr.number,
        complement: addr.complement || null, neighborhood: addr.neighborhood,
        city: addr.city, state: addr.state,
      },
      subtotal: sub,
      discount: pixDiscount,
      shippingCost: shippingPrice,
      total,
      paymentMethod: paymentMethodMap[payment ?? ""] ?? null,
      items: items.map((i) => ({ id: i.id, type: i.type, title: i.title, price: i.price, quantity: i.quantity })),
    });

    if (result.error) {
      toast.error(result.error);
      setPlacing(false);
      return;
    }

    setOrderNumber(result.orderNumber!);
    clear();
    clearBuyNow();
    setPlacing(false);
    setStep("sucesso");
  }

  // ── Preparando ──
  if (step === "preparando") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-5 text-center px-6">
        <p className="text-2xl font-bold text-foreground leading-snug">
          Preparando tudo para<br />sua compra
        </p>
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  // ── Sucesso ──
  if (step === "sucesso") {
    return (
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center justify-center px-6 py-16 gap-6 text-center bg-white min-h-full">
        <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center">
          <PackageCheck className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            Pedido realizado!
          </h1>
          <p className="text-muted-foreground mb-1">
            Seu pedido <strong>{orderNumber}</strong> foi recebido.
          </p>
          <p className="text-sm text-muted-foreground">
            Em breve você receberá um e-mail com a confirmação e os dados para pagamento.
          </p>
        </div>
        <div className="w-full max-w-sm bg-secondary rounded-xl p-5 text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Número do pedido</span>
            <span className="font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Pagamento</span>
            <span className="font-medium">{selectedPayment?.label ?? payment}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Entrega</span>
            <span className="font-medium">{selectedShipping.label}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(total)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <Button asChild className="bg-brand hover:bg-brand-700 text-white">
            <Link href="/minha-conta/pedidos">Ver meus pedidos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/editora/livros">Continuar comprando</Link>
          </Button>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Step header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border bg-white">
        <button
          onClick={goBack}
          className="p-1.5 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-bold text-base leading-tight">
          {STEP_TITLES[step]}
        </h1>
      </div>

      {/* Step content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">

          {/* ── Endereço ── */}
          {step === "endereco" && (
            <div className="flex flex-col gap-3">
              {!showAddressForm ? (
                <>
                  {savedAddresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelectAddress(a)}
                      className="w-full text-left bg-white rounded-xl border border-border p-4 hover:border-brand transition-colors flex items-start justify-between gap-3 active:bg-secondary"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm text-foreground">
                            {a.label ?? "Meu endereço"}
                          </p>
                          {a.is_default && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand whitespace-nowrap">
                              Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {a.neighborhood} · {a.city}/{a.state}
                        </p>
                        <p className="text-xs text-muted-foreground">CEP {a.zip_code}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => { setShowAddressForm(true); setAddr(emptyAddr); setErrors({}); }}
                    className="w-full text-left bg-white rounded-xl border border-dashed border-border p-4 flex items-center gap-3 text-brand font-medium text-sm hover:border-brand transition-colors"
                  >
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    Usar outro endereço
                  </button>
                </>
              ) : (
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
                    <Input placeholder="Rua, Avenida..." value={addr.street} onChange={setAdF("street")} />
                  </Field>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Número" error={errors.number}>
                      <Input placeholder="123" value={addr.number} onChange={setAdF("number")} />
                    </Field>
                    <Field label="Complemento" className="col-span-2">
                      <Input placeholder="Apto, Bloco..." value={addr.complement} onChange={setAdF("complement")} />
                    </Field>
                  </div>
                  <Field label="Bairro">
                    <Input placeholder="Seu bairro" value={addr.neighborhood} onChange={setAdF("neighborhood")} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Cidade" error={errors.city}>
                      <Input placeholder="Sua cidade" value={addr.city} onChange={setAdF("city")} />
                    </Field>
                    <Field label="Estado" error={errors.state}>
                      <Input placeholder="PR" value={addr.state} onChange={setAdF("state")} maxLength={2} />
                    </Field>
                  </div>
                  <Button
                    className="bg-brand hover:bg-brand-700 text-white w-full mt-1"
                    onClick={handleAddrFormContinue}
                  >
                    Continuar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="text-sm text-brand text-center hover:underline"
                    >
                      Usar endereço salvo
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Frete ── */}
          {step === "frete" && (
            <div className="flex flex-col gap-4">
              {addr.street && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  Envio para {addr.street}, {addr.number} · {addr.city}/{addr.state}
                </p>
              )}

              <div className="flex flex-col gap-3">
                {SHIPPING_OPTIONS.filter((s) => !("minOrder" in s) || sub >= (s.minOrder ?? 0)).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShipping(opt.id)}
                    className={cn(
                      "w-full text-left rounded-xl border-2 p-4 flex items-center justify-between gap-3 transition-colors",
                      shipping === opt.id ? "border-brand bg-brand/5" : "border-border bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        shipping === opt.id ? "border-brand bg-brand" : "border-muted-foreground/40"
                      )}>
                        {shipping === opt.id && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDeliveryRange(opt.minDays, opt.maxDays)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {opt.badge && (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full block mb-0.5",
                          opt.badge === "GRÁTIS" ? "bg-emerald-100 text-emerald-700" : "bg-brand/10 text-brand"
                        )}>
                          {opt.badge}
                        </span>
                      )}
                      <p className={cn("font-bold text-sm", opt.price === 0 ? "text-emerald-600" : "text-foreground")}>
                        {opt.price === 0 ? "Grátis" : formatCurrency(opt.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Pagamento ── */}
          {step === "pagamento" && (
            <div className="flex flex-col gap-3">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPayment(opt.id)}
                  className="w-full text-left bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-3 hover:border-brand transition-colors active:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-lg font-bold">
                      {opt.id === "pix" ? (
                        <span className="text-emerald-600 text-sm font-black">PIX</span>
                      ) : opt.id === "cartao_credito" ? (
                        <span>💳</span>
                      ) : (
                        <span>🏦</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {opt.badge && (
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded text-white", opt.badgeColor)}>
                        {opt.badge}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Revisão ── */}
          {step === "revisao" && (
            <div className="flex flex-col gap-5 pb-52">
              {/* Resumo financeiro */}
              <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produto ({count} {count === 1 ? "item" : "itens"})</span>
                  <span>{formatCurrency(sub)}</span>
                </div>
                {pixDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto Pix (5%)</span>
                    <span>-{formatCurrency(pixDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  {shippingPrice === 0 ? (
                    <span className="text-emerald-600 font-medium">Grátis</span>
                  ) : (
                    <span>{formatCurrency(shippingPrice)}</span>
                  )}
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-brand">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Você pagará</span>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(total)}</p>
                    <p className="text-xs text-muted-foreground">{selectedPayment?.label}</p>
                  </div>
                </div>
              </div>

              <Button
                ref={topConfirmRef}
                size="lg"
                className="bg-brand hover:bg-brand-700 text-white font-semibold w-full"
                onClick={placeOrder}
                disabled={placing}
              >
                {placing && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                {placing ? "Processando..." : "Confirmar a compra"}
              </Button>

              {/* Faturamento */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Faturamento
                </p>
                <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2">
                  <p className="font-semibold text-sm">{ident.name}</p>
                  <p className="text-sm text-muted-foreground">{ident.email}</p>
                  {ident.cpf ? (
                    <p className="text-sm text-muted-foreground">
                      CPF {ident.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Input
                        ref={cpfInputRef}
                        placeholder="CPF — 000.000.000-00"
                        inputMode="numeric"
                        maxLength={14}
                        value={cpfInput}
                        onChange={(e) => {
                          const masked = applyCpfMask(e.target.value);
                          setCpfInput(masked);
                          if (masked.replace(/\D/g, "").length === 11) setCpfError(false);
                        }}
                        className={cn("text-sm", cpfError && "border-destructive focus-visible:ring-destructive/20")}
                        aria-invalid={cpfError}
                      />
                      {cpfError ? (
                        <p className="text-xs text-destructive">CPF obrigatório para emissão da nota fiscal</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Necessário para emissão da nota fiscal</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Entrega */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Detalhe da entrega
                </p>
                <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
                  <div className="p-4">
                    <p className="font-semibold text-sm">
                      {addr.street}, {addr.number}
                      {addr.complement ? ` — ${addr.complement}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {addr.neighborhood} · {addr.city}/{addr.state}
                    </p>
                    <p className="text-xs text-muted-foreground">CEP {addr.cep}</p>
                    <button
                      type="button"
                      onClick={() => { setReturnToReview(true); setStep("endereco"); }}
                      className="text-brand text-xs font-medium mt-2 hover:underline block"
                    >
                      Alterar endereço
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-3.5 w-3.5 text-brand" />
                      <span className="text-xs font-semibold text-brand">{selectedShipping.label}</span>
                      {selectedShipping.badge && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          selectedShipping.badge === "GRÁTIS" ? "bg-emerald-100 text-emerald-700" : "bg-brand/10 text-brand"
                        )}>
                          {selectedShipping.badge}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-3">
                      Chegará no seu endereço {formatDeliveryRange(selectedShipping.minDays, selectedShipping.maxDays).toLowerCase()}
                    </p>
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 py-1">
                        {item.coverUrl ? (
                          <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-secondary">
                            <Image
                              src={item.coverUrl}
                              alt={item.title}
                              width={48}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-16 flex-shrink-0 rounded bg-secondary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-3 leading-snug">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">Quantidade: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setReturnToReview(true); setStep("frete"); }}
                      className="text-brand text-xs font-medium mt-3 hover:underline block cursor-pointer"
                    >
                      Alterar forma de entrega
                    </button>
                  </div>
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Detalhe do pagamento
                </p>
                <div className="bg-white rounded-xl border border-border p-4">
                  <p className="font-semibold text-sm">{selectedPayment?.label}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(total)}</p>
                  {payment === "pix" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ao confirmar, você receberá o código Pix para pagamento.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep("pagamento"); }}
                    className="text-brand text-xs font-medium mt-2 hover:underline block"
                  >
                    Alterar forma de pagamento
                  </button>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Ao confirmar, você aceita os{" "}
                <Link href="/editora/termos-de-uso" className="text-brand hover:underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/editora/politica-de-privacidade" className="text-brand hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé de frete — sempre visível na etapa de frete */}
      {step === "frete" && (
        <div className="border-t border-border bg-white flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-muted-foreground">Frete</span>
            <span className="font-bold text-foreground">
              {shippingPrice === 0 ? "Grátis" : formatCurrency(shippingPrice)}
            </span>
          </div>
          <div className="px-4 pb-4">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-700 text-white font-semibold w-full"
              onClick={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setStep("revisao");
                } else {
                  setStep("pagamento");
                }
              }}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Sticky footer — aparece quando "Confirmar" do topo sai da tela */}
      {step === "revisao" && showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="flex items-center justify-between px-6 pt-3 pb-2">
            <div>
              <p className="text-xs text-muted-foreground">Você pagará</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{selectedPayment?.label}</p>
              {savings > 0 && (
                <p className="text-xs text-emerald-600 font-medium">Economia de {formatCurrency(savings)}</p>
              )}
            </div>
          </div>
          <div className="px-6 pb-6 pt-1">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-700 text-white font-semibold w-full h-12 text-base"
              onClick={placeOrder}
              disabled={placing}
            >
              {placing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {placing ? "Processando..." : "Confirmar a compra"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children, className }: {
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
