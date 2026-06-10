"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Check, ChevronLeft, ChevronRight, MapPin, PackageCheck, Loader2, Plus, Truck, BookOpen, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { handleActionError } from "@/lib/handle-action-error";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useCartStore } from "@/stores/cart";
import {
  placeOrderAction,
  createMpPixPaymentAction,
  createMpCardPaymentAction,
  checkOrderPaymentStatusAction,
  simulatePixApprovedAction,
  validateCouponAction,
} from "@/app/(checkout)/checkout/actions";
import { MpCardForm, type CardPaymentData } from "@/components/checkout/mp-card-form";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Step = "preparando" | "faturamento" | "endereco" | "frete" | "pagamento" | "revisao" | "pix_real" | "cartao_form" | "sucesso";

const STEP_ORDER: Step[] = ["preparando", "faturamento", "endereco", "frete", "pagamento", "revisao", "sucesso"];

const STEP_TITLES: Partial<Record<Step, string>> = {
  faturamento: "Dados fiscais",
  endereco: "Escolha o endereço de entrega",
  frete: "Escolha a modalidade de entrega",
  pagamento: "Escolha como pagar",
  revisao: "Revise e confirme",
};

type ShippingOption = {
  id: string;
  label: string;
  price: number;
  minDays: number;
  maxDays: number;
};

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


interface IdentData { name: string; email: string; cpf: string }
interface AddrData {
  cep: string; street: string; number: string;
  complement: string; neighborhood: string; city: string; state: string;
}

const emptyAddr: AddrData = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function metadataText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function CheckoutFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("preparando");
  const [shipping, setShipping] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [payment, setPayment] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [ident, setIdent] = useState<IdentData>({ name: "", email: "", cpf: "" });
  const [addr, setAddr] = useState<AddrData>(emptyAddr);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [confirmingPix, setConfirmingPix] = useState(false);
  const [pixQrCode, setPixQrCode] = useState("");
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState("");
  const pixPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pixTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pixSecondsLeft, setPixSecondsLeft] = useState(600);
  const [mounted, setMounted] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountPercent: number; discountAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topConfirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // Persiste buyNowItem no carrinho antes de redirecionar (buyNowItem não sobrevive reload)
        const { buyNowItem: bni, addItem } = useCartStore.getState();
        if (bni) addItem(bni);
        router.replace("/auth/cadastro?redirectTo=/checkout");
        return;
      }
      const [{ data: profile }, { data: addresses }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, cpf, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      const metadata = user.user_metadata as Record<string, unknown>;
      const fallbackName = metadataText(metadata.full_name) || metadataText(metadata.name) || user.email?.split("@")[0] || "";
      const fallbackCpf = onlyDigits(metadataText(metadata.cpf));
      const nextIdent = {
        name: profile?.full_name || fallbackName,
        email: user.email ?? "",
        cpf: maskCpf(profile?.cpf || fallbackCpf),
      };
      setIdent(nextIdent);

      if (!profile || (!profile.full_name && nextIdent.name) || (!profile.cpf && fallbackCpf)) {
        await supabase.from("profiles").upsert(
          {
            id: profile?.id ?? crypto.randomUUID(),
            user_id: user.id,
            full_name: profile?.full_name ?? nextIdent.name,
            phone: profile?.phone ?? null,
            cpf: profile?.cpf ?? (onlyDigits(nextIdent.cpf) || null),
            avatar_url: profile?.avatar_url ?? null,
          },
          { onConflict: "user_id" }
        );
      }

      const addrs = (addresses ?? []) as SavedAddress[];
      setSavedAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        fillAddrFromSaved(def);
      } else {
        setShowAddressForm(true);
      }
      setStep(onlyDigits(nextIdent.cpf).length === 11 ? "endereco" : "faturamento");
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

  // Countdown timer do PIX
  useEffect(() => {
    if (step !== "pix_real") return;
    pixTimerRef.current = setInterval(() => {
      setPixSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(pixTimerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (pixTimerRef.current) clearInterval(pixTimerRef.current);
    };
  }, [step]);

  // Polling automático de confirmação PIX
  useEffect(() => {
    if (step !== "pix_real" || !orderId) return;

    const MAX_MS = 10 * 60 * 1000; // 10 minutos
    const startedAt = Date.now();

    pixPollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        clearInterval(pixPollRef.current!);
        return;
      }
      const result = await checkOrderPaymentStatusAction(orderId);
      if (result.paymentStatus === "aprovado") {
        clearInterval(pixPollRef.current!);
        setStep("sucesso");
      }
    }, 4000);

    return () => {
      if (pixPollRef.current) clearInterval(pixPollRef.current);
    };
  }, [step, orderId]);

  async function fetchShippingOptions(cep: string) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    // Lê o estado atual do store diretamente para evitar closure stale do useEffect
    const storeState = useCartStore.getState();
    const currentItems = storeState.buyNowItem
      ? [{ ...storeState.buyNowItem, quantity: 1 }]
      : storeState.items.filter((i) => !storeState.deselectedIds.includes(i.id));

    if (!currentItems.length) {
      setShippingError("Nenhum item no carrinho.");
      return;
    }

    setLoadingShipping(true);
    setShippingError(null);
    setShipping("");
    setShippingOptions([]);

    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep: cleanCep,
          items: currentItems.map((i) => ({ id: i.id, type: i.type, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setShippingError(data.error ?? "Erro ao calcular frete");
        return;
      }
      const opts: ShippingOption[] = data.options ?? [];
      setShippingOptions(opts);
      if (opts.length > 0) setShipping(opts[0].id);
    } catch {
      setShippingError("Erro ao calcular frete. Verifique sua conexão.");
    } finally {
      setLoadingShipping(false);
    }
  }

  useEffect(() => {
    if (step !== "frete") return;
    fetchShippingOptions(addr.cep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, addr.cep]);

  function fillAddrFromSaved(a: SavedAddress) {
    setSelectedAddressId(a.id);
    setAddr({
      cep: a.zip_code, street: a.street, number: a.number,
      complement: a.complement ?? "", neighborhood: a.neighborhood,
      city: a.city, state: a.state,
    });
    setErrors({});
  }

  const { items: storeItems, buyNowItem, clear, clearSelected, clearBuyNow, selectedItems } = useCartStore();
  const items = mounted
    ? buyNowItem
      ? [{ ...buyNowItem, quantity: 1 }]
      : selectedItems()
    : [];
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isFreeShipping = sub >= 200;
  const selectedShipping = shippingOptions.find((s) => s.id === shipping) ?? null;
  const shippingPrice = isFreeShipping ? 0 : (selectedShipping?.price ?? 0);
  const pixDiscount = payment === "pix" ? Math.round(sub * 0.05 * 100) / 100 : 0;
  const couponDiscount = coupon ? Math.min(coupon.discountAmount, sub) : 0;
  const totalDiscount = pixDiscount + couponDiscount;
  const total = sub + shippingPrice - totalDiscount;
  const selectedPayment = PAYMENT_OPTIONS.find((p) => p.id === payment);
  const originalTotal = sub + shippingPrice;
  const savings = originalTotal - total;

  function goBack() {
    if (returnToReview) {
      setReturnToReview(false);
      setStep("revisao");
      return;
    }
    if (step === "revisao") {
      setShowLeaveDialog(true);
      return;
    }
    const i = STEP_ORDER.indexOf(step);
    if (i > 1) setStep(STEP_ORDER[i - 1]);
    else router.back();
  }

  function confirmLeave() {
    setShowLeaveDialog(false);
    const i = STEP_ORDER.indexOf("revisao");
    setStep(STEP_ORDER[i - 1]);
  }

  function maskCep(raw: string): string {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  function setAdF(field: keyof AddrData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const value = field === "cep" ? maskCep(raw) : field === "state" ? raw.toUpperCase().slice(0, 2) : raw;
      setAddr((p) => ({ ...p, [field]: value }));
      setSelectedAddressId(null);
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
    if (!addr.neighborhood.trim()) e.neighborhood = "Obrigatório";
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

  async function handleBillingContinue() {
    const cpf = onlyDigits(ident.cpf);
    if (cpf.length !== 11) {
      setErrors((prev) => ({ ...prev, cpf: "Informe um CPF válido para emitir a nota fiscal." }));
      toast.error("Informe um CPF válido para continuar.");
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { buyNowItem: bni, addItem } = useCartStore.getState();
      if (bni) addItem(bni);
      router.replace("/auth/cadastro?redirectTo=/checkout");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone, cpf, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase.from("profiles").upsert(
      {
        id: profile?.id ?? crypto.randomUUID(),
        user_id: user.id,
        full_name: profile?.full_name ?? ident.name ?? user.email?.split("@")[0] ?? "Cliente",
        phone: profile?.phone ?? null,
        cpf,
        avatar_url: profile?.avatar_url ?? null,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      toast.error("Erro ao salvar CPF. Tente novamente.");
      return;
    }

    setIdent((prev) => ({ ...prev, cpf: maskCpf(cpf) }));
    setErrors((prev) => ({ ...prev, cpf: "" }));
    setStep(returnToReview ? "revisao" : "endereco");
    setReturnToReview(false);
  }

  async function persistCurrentAddress() {
    if (selectedAddressId) return;

    const duplicate = savedAddresses.find((a) =>
      a.zip_code === addr.cep &&
      a.street === addr.street &&
      a.number === addr.number &&
      (a.complement ?? "") === (addr.complement || "") &&
      a.neighborhood === addr.neighborhood &&
      a.city === addr.city &&
      a.state === addr.state.toUpperCase()
    );

    if (duplicate) {
      setSelectedAddressId(duplicate.id);
      return;
    }

    setSavingAddress(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          label: savedAddresses.length === 0 ? "Principal" : null,
          full_name: ident.name || user.email?.split("@")[0] || "Cliente",
          zip_code: addr.cep,
          street: addr.street,
          number: addr.number,
          complement: addr.complement || null,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state.toUpperCase(),
          is_default: savedAddresses.length === 0,
        })
        .select("*")
        .single();

      if (!error && data) {
        const saved = data as SavedAddress;
        setSavedAddresses((prev) => [saved, ...prev]);
        setSelectedAddressId(saved.id);
      }
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleAddrFormContinue() {
    if (!validateAddr()) return;
    await persistCurrentAddress();
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
    if (onlyDigits(ident.cpf).length !== 11) {
      setStep("faturamento");
      return;
    }
    setStep("revisao");
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    const result = await validateCouponAction(couponInput.trim(), sub);
    setCouponLoading(false);
    if (result.error) { setCouponError(result.error); return; }
    setCouponError(null);
    setCoupon(result.coupon!);
    toast.success(`Cupom aplicado!`);
  }

  async function placeOrder() {
    const cpf = onlyDigits(ident.cpf);
    if (cpf.length !== 11) {
      setErrors((prev) => ({ ...prev, cpf: "Informe um CPF válido para emitir a nota fiscal." }));
      setReturnToReview(true);
      setStep("faturamento");
      toast.error("Informe um CPF válido para continuar.");
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
      discount: totalDiscount,
      shippingCost: shippingPrice,
      shippingLabel: selectedShipping?.label,
      total,
      paymentMethod: paymentMethodMap[payment ?? ""] ?? null,
      items: items.map((i) => ({ id: i.id, type: i.type, title: i.title, price: i.price, quantity: i.quantity })),
      couponCode: coupon?.code ?? null,
    });

    if (result.error) {
      handleActionError(result.error);
      setPlacing(false);
      return;
    }

    const newOrderId = result.orderId!;
    const newOrderNumber = result.orderNumber!;
    // Captura total antes de qualquer limpeza para garantir valor correto
    const capturedTotal = total;
    setOrderNumber(newOrderNumber);
    setOrderId(newOrderId);
    setConfirmedTotal(capturedTotal);

    if (payment === "pix") {
      const pixResult = await createMpPixPaymentAction({
        orderId: newOrderId,
        orderNumber: newOrderNumber,
        amount: capturedTotal,
        customerEmail: ident.email,
        customerCpf: onlyDigits(ident.cpf),
        customerName: ident.name,
      });
      setPlacing(false);
      if (pixResult.error) {
        handleActionError(pixResult.error);
        return;
      }
      // Só limpa o carrinho após PIX gerado com sucesso
      buyNowItem ? clear() : clearSelected();
      clearBuyNow();
      setPixQrCode(pixResult.qrCode ?? "");
      setPixQrCodeBase64(pixResult.qrCodeBase64 ?? "");
      setPixSecondsLeft(600);
      setStep("pix_real");
    } else {
      // Para cartão, limpa antes de mostrar o formulário
      buyNowItem ? clear() : clearSelected();
      clearBuyNow();
      setPlacing(false);
      setStep("cartao_form");
    }
  }

  async function handleCardPayment(data: CardPaymentData) {
    const result = await createMpCardPaymentAction({
      orderId,
      orderNumber,
      token: data.token,
      installments: data.installments,
      paymentMethodId: data.paymentMethodId,
      issuerId: data.issuerId,
      amount: confirmedTotal,
      customerEmail: ident.email,
      customerCpf: onlyDigits(ident.cpf),
      customerName: ident.name,
    });

    if (result.error) {
      handleActionError(result.error);
      return;
    }
    if (result.status === "approved" || result.status === "pending") {
      setStep("sucesso");
    } else {
      toast.error("Pagamento recusado. Verifique os dados e tente novamente.");
    }
  }

  async function handleCheckPixPayment() {
    setConfirmingPix(true);
    const result = await checkOrderPaymentStatusAction(orderId);
    setConfirmingPix(false);
    if (result.paymentStatus === "aprovado") {
      setStep("sucesso");
    } else {
      toast.info("Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.");
    }
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

  // ── PIX Real ──
  if (step === "pix_real") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-6 py-8 flex flex-col gap-6">

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Pedido <strong>{orderNumber}</strong></p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(confirmedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Aguardando pagamento via Pix</p>
          </div>

          {pixQrCodeBase64 && (
            <div className="flex justify-center">
              <div className="bg-white border-2 border-border rounded-2xl p-4 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pixQrCodeBase64}`}
                  alt="QR Code PIX"
                  width={180}
                  height={180}
                />
              </div>
            </div>
          )}

          {pixQrCode && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pix Copia e Cola</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixQrCode}
                  className="flex-1 min-w-0 text-xs font-mono bg-secondary border border-border rounded-lg px-3 py-2 text-muted-foreground overflow-hidden"
                />
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(pixQrCode); toast.success("Código copiado!"); }}
                  className="shrink-0 p-2 rounded-lg border border-border bg-white hover:bg-secondary transition-colors"
                  aria-label="Copiar código Pix"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Countdown + polling */}
          {(() => {
            const mins = Math.floor(pixSecondsLeft / 60);
            const secs = pixSecondsLeft % 60;
            const pct = (pixSecondsLeft / 600) * 100;
            const expired = pixSecondsLeft === 0;
            const barColor = pixSecondsLeft > 300
              ? "bg-emerald-500"
              : pixSecondsLeft > 120
              ? "bg-amber-400"
              : "bg-red-500";
            const timeColor = pixSecondsLeft > 300
              ? "text-emerald-600"
              : pixSecondsLeft > 120
              ? "text-amber-600"
              : "text-red-600";
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    {expired ? "Código expirado" : "Tempo para pagar"}
                  </span>
                  <span className={`font-mono font-bold tabular-nums ${timeColor}`}>
                    {expired ? "00:00" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {expired ? (
                  <p className="text-xs text-center text-red-600 font-medium">
                    O tempo expirou. Volte ao carrinho e tente novamente.
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-600 shrink-0" />
                    <span>Verificando pagamento automaticamente...</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Botões de teste — apenas em sandbox */}
          {process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.startsWith("TEST-") && (
            <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-amber-200">
              <p className="text-[11px] text-center text-amber-600 font-medium uppercase tracking-wide">Ambiente de teste</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 text-xs"
                onClick={handleCheckPixPayment}
                disabled={confirmingPix}
              >
                {confirmingPix
                  ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Verificando...</>
                  : "Verificar status no MP"
                }
              </Button>
              <Button
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs"
                onClick={async () => {
                  const r = await simulatePixApprovedAction(orderId);
                  if (!r.error) setStep("sucesso");
                  else handleActionError(r.error);
                }}
              >
                <Check className="h-3 w-3 mr-1.5" />
                Simular pagamento aprovado
              </Button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── Cartão de Crédito/Débito ──
  if (step === "cartao_form") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-6 py-8 flex flex-col gap-6">

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Pedido <strong>{orderNumber}</strong></p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(confirmedTotal)}</p>
          </div>

          {/* Dica de teste — só em sandbox */}
          {process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.startsWith("TEST-") && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Cartões de teste (sandbox)</p>
              <p>Mastercard: <span className="font-mono">5031 4332 1540 6351</span></p>
              <p>Visa: <span className="font-mono">4235 6477 2802 5682</span></p>
              <p>CVV: <span className="font-mono">123</span> · Validade: <span className="font-mono">11/30</span></p>
              <p className="mt-1">Nome: <span className="font-mono">APRO</span> (aprovado) ou <span className="font-mono">OTHE</span> (recusado)</p>
            </div>
          )}

          <MpCardForm
            publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!}
            amount={confirmedTotal}
            defaultEmail={ident.email}
            onSubmit={handleCardPayment}
          />

        </div>
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
            Seu pedido <strong>{orderNumber}</strong> foi confirmado.
          </p>
          <p className="text-sm text-muted-foreground">
            Em breve você receberá um e-mail com a confirmação e os detalhes da entrega.
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
            <span className="font-medium">{selectedShipping?.label ?? "—"}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(confirmedTotal)}</span>
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
    <>
    <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
      <DialogContent className="max-w-sm rounded-2xl text-center px-6 py-8">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-brand" strokeWidth={1.5} />
          </div>
        </div>
        <DialogHeader className="items-center gap-1">
          <DialogTitle className="text-xl font-bold text-foreground leading-snug">
            Você está quase lá!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Revise e confirme seu pedido — é o último passo. Você pode alterar qualquer detalhe diretamente nesta tela.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            className="w-full bg-brand hover:bg-brand-700 text-white font-semibold h-12 rounded-xl"
            onClick={() => setShowLeaveDialog(false)}
          >
            Continuar e confirmar
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground h-12 rounded-xl"
            onClick={confirmLeave}
          >
            Voltar mesmo assim
          </Button>
        </div>
      </DialogContent>
    </Dialog>

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

          {/* ── Faturamento ── */}
          {step === "faturamento" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2">
                <p className="font-semibold text-sm">{ident.name || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{ident.email}</p>
              </div>
              <Field label="CPF para nota fiscal" error={errors.cpf}>
                <Input
                  id="checkout-cpf"
                  value={ident.cpf}
                  onChange={(e) => {
                    setIdent((prev) => ({ ...prev, cpf: maskCpf(e.target.value) }));
                    setErrors((prev) => ({ ...prev, cpf: "" }));
                  }}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                />
              </Field>
              <Button
                className="bg-brand hover:bg-brand-700 text-white w-full mt-1"
                onClick={handleBillingContinue}
              >
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

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
                    onClick={() => { setShowAddressForm(true); setSelectedAddressId(null); setAddr(emptyAddr); setErrors({}); }}
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
                  <Field label="Bairro" error={errors.neighborhood}>
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
                    disabled={savingAddress}
                  >
                    {savingAddress && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {savingAddress ? "Salvando..." : "Continuar"}
                    {!savingAddress && <ChevronRight className="h-4 w-4 ml-1" />}
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

              {loadingShipping && (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  <p className="text-sm">Calculando opções de frete...</p>
                </div>
              )}

              {!loadingShipping && shippingError && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-destructive text-center py-4">{shippingError}</p>
                  <Button
                    variant="outline"
                    onClick={() => fetchShippingOptions(addr.cep)}
                    className="w-full"
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!loadingShipping && !shippingError && shippingOptions.length === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma transportadora disponível para este CEP.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fetchShippingOptions(addr.cep)}
                    className="w-full"
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!loadingShipping && !shippingError && shippingOptions.length > 0 && (
                <div className="flex flex-col gap-3">
                  {shippingOptions.map((opt) => (
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
                        {isFreeShipping && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 block mb-0.5">
                            GRÁTIS
                          </span>
                        )}
                        <p className={cn(
                          "font-bold text-sm",
                          isFreeShipping ? "line-through text-muted-foreground" : "text-foreground"
                        )}>
                          {formatCurrency(opt.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                {coupon && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Cupom {coupon.code} ({coupon.discountPercent}%)</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                {/* Campo para inserir cupom */}
                {!coupon && (
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        placeholder="Código de cupom"
                        className={`h-8 text-sm uppercase ${couponError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      />
                      <Button
                        type="button" size="sm" variant="outline"
                        className="h-8 shrink-0 text-xs"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                      >
                        {couponLoading ? "…" : "Aplicar"}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-destructive">{couponError}</p>
                    )}
                  </div>
                )}
                {coupon && (
                  <button
                    className="text-xs text-muted-foreground underline text-left"
                    onClick={() => { setCoupon(null); setCouponInput(""); }}
                  >
                    Remover cupom
                  </button>
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
                  <p className="text-sm text-muted-foreground">
                    CPF {onlyDigits(ident.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                  </p>
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
                      <span className="text-xs font-semibold text-brand">{selectedShipping?.label ?? "—"}</span>
                    </div>
                    <p className="font-semibold text-sm mb-3">
                      {selectedShipping
                        ? `Chegará no seu endereço ${formatDeliveryRange(selectedShipping.minDays, selectedShipping.maxDays).toLowerCase()}`
                        : "Prazo a confirmar"}
                    </p>
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 py-1">
                        {item.type === "combo" && item.covers && item.covers.length > 1 ? (
                          <div className="relative flex-shrink-0" style={{ width: 48, height: 64 }}>
                            {item.covers.slice(0, 3).reverse().map((src, i, arr) => (
                              <div
                                key={src}
                                className="absolute rounded overflow-hidden border border-white bg-secondary"
                                style={{
                                  width: 36, height: 48,
                                  left: i * 6,
                                  top: (arr.length - 1 - i) * 4,
                                  zIndex: i,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                }}
                              >
                                <Image src={src} alt="" width={36} height={48} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : item.coverUrl ? (
                          <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-secondary">
                            <Image src={item.coverUrl} alt={item.title} width={48} height={64} className="w-full h-full object-cover" />
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
              {loadingShipping ? "—" : shippingPrice === 0 ? "Grátis" : formatCurrency(shippingPrice)}
            </span>
          </div>
          <div className="px-4 pb-4">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-700 text-white font-semibold w-full"
              disabled={loadingShipping || !selectedShipping}
              onClick={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setStep("revisao");
                } else {
                  setStep("pagamento");
                }
              }}
            >
              {loadingShipping ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculando...</> : "Continuar"}
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
    </>
  );
}

function FakeQRCode() {
  const n = 21;
  const cells = Array.from({ length: n * n }, (_, idx) => {
    const r = Math.floor(idx / n);
    const c = idx % n;
    // Finder patterns (top-left, top-right, bottom-left) — 7x7 squares
    function finder(row: number, col: number) {
      if (row === 0 || row === 6 || col === 0 || col === 6) return true;
      if (row >= 2 && row <= 4 && col >= 2 && col <= 4) return true;
      return false;
    }
    if (r < 7 && c < 7) return finder(r, c);
    if (r < 7 && c >= n - 7) return finder(r, c - (n - 7));
    if (r >= n - 7 && c < 7) return finder(r - (n - 7), c);
    // Separators
    if (r === 7 || c === 7) return false;
    // Timing patterns
    if (r === 6) return c % 2 === 0;
    if (c === 6) return r % 2 === 0;
    // Data — deterministic pseudo-random
    return (r * 23 + c * 19 + r * c % 11) % 3 !== 0;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 7px)`, gap: 0 }}>
      {cells.map((filled, i) => (
        <div key={i} style={{ width: 7, height: 7, backgroundColor: filled ? "#111" : "#fff" }} />
      ))}
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
