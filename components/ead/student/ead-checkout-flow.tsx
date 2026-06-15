"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MpCardForm, type CardPaymentData } from "@/components/checkout/mp-card-form";
import {
  createEadOrderAction,
  createEadPixPaymentAction,
  createEadCardPaymentAction,
  checkEadPaymentStatusAction,
} from "@/lib/actions/ead/checkout-actions";
import {
  GraduationCap, QrCode, CreditCard, CheckCircle2, Loader2,
  Copy, Clock, ArrowRight, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseInfo {
  id:               string;
  slug:             string;
  title:            string;
  subtitle:         string | null;
  thumbnail_url:    string | null;
  instructor_name:  string | null;
  price:            number;
  price_promotional: number | null;
  access_days:      number;
}

interface Props {
  course:        CourseInfo;
  primaryColor:  string;
  mpPublicKey:   string | null;
  userEmail:     string;
  userName:      string;
  userCpf:       string | null;
  tenantId:      string;
}

type Step = "metodo" | "pix" | "cartao" | "aguardando" | "sucesso";

function formatPrice(p: number) {
  return p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EadCheckoutFlow({ course, primaryColor, mpPublicKey, userEmail, userName, userCpf, tenantId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("metodo");
  const [isPending, startTransition] = useTransition();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [cpf, setCpf] = useState(userCpf ?? "");
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayPrice = course.price_promotional ?? course.price;
  const hasDiscount = course.price_promotional !== null && course.price_promotional < course.price;

  // Poll para confirmação de PIX
  const startPolling = useCallback((oid: string) => {
    pollerRef.current = setInterval(async () => {
      const { status } = await checkEadPaymentStatusAction(oid);
      if (status === "aprovado") {
        clearInterval(pollerRef.current!);
        setStep("sucesso");
      }
    }, 4000);
  }, []);

  useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

  async function ensureOrder(): Promise<{ orderId: string; orderNumber: string } | null> {
    if (orderId && orderNumber) return { orderId, orderNumber };
    const result = await createEadOrderAction(course.id);
    if (result.error) { toast.error(result.error); return null; }
    setOrderId(result.orderId!);
    setOrderNumber(result.orderNumber!);
    return { orderId: result.orderId!, orderNumber: result.orderNumber! };
  }

  function handleChoosePix() {
    startTransition(async () => {
      const order = await ensureOrder();
      if (!order) return;

      const pix = await createEadPixPaymentAction({
        orderId:       order.orderId,
        orderNumber:   order.orderNumber,
        amount:        displayPrice,
        customerEmail: userEmail,
        customerName:  userName,
        customerCpf:   cpf.replace(/\D/g, ""),
        tenantId,
      });

      if (pix.error) { toast.error(pix.error); return; }

      setQrCode(pix.qrCode ?? null);
      setQrCodeBase64(pix.qrCodeBase64 ?? null);
      setStep("aguardando");
      startPolling(order.orderId);
    });
  }

  function handleChooseCard() {
    startTransition(async () => {
      const order = await ensureOrder();
      if (!order) return;
      setStep("cartao");
    });
  }

  async function handleCardSubmit(data: CardPaymentData) {
    if (!orderId || !orderNumber) return;
    const result = await createEadCardPaymentAction({
      orderId,
      orderNumber,
      token:           data.token,
      installments:    data.installments,
      paymentMethodId: data.paymentMethodId,
      issuerId:        data.issuerId,
      amount:          displayPrice,
      customerEmail:   userEmail,
      customerName:    userName,
      customerCpf:     cpf.replace(/\D/g, ""),
      tenantId,
    });

    if (result.status === "approved") {
      setStep("sucesso");
    } else if (result.status === "pending") {
      setStep("aguardando");
      startPolling(orderId);
    } else {
      toast.error(result.error ?? "Pagamento recusado. Tente novamente.");
    }
  }

  function handleSuccess() {
    router.push(`/ead/curso/${course.slug}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">

      {/* ── Resumo do pedido ─────────────────────────────────────────── */}
      <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4 sticky top-20">
          {course.thumbnail_url && (
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              {course.instructor_name ?? "Curso online"}
            </p>
            <h2 className="font-heading font-bold text-base leading-snug">{course.title}</h2>
            {course.subtitle && <p className="text-xs text-muted-foreground">{course.subtitle}</p>}
          </div>

          <div className="border-t border-border pt-4 flex flex-col gap-2">
            {hasDiscount && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço cheio</span>
                <span className="line-through text-muted-foreground">{formatPrice(course.price)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-extrabold" style={{ color: primaryColor }}>
                {formatPrice(displayPrice)}
              </span>
            </div>
            {hasDiscount && (
              <p className="text-xs text-emerald-600 font-semibold text-right">
                Economia de {formatPrice(course.price - displayPrice)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Pagamento 100% seguro via Mercado Pago
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              Acesso por {course.access_days > 0 ? `${course.access_days} dias` : "tempo ilimitado"}
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              Certificado de conclusão incluso
            </div>
          </div>
        </div>
      </div>

      {/* ── Fluxo de pagamento ───────────────────────────────────────── */}
      <div className="lg:col-span-3 order-1 lg:order-2">

        {/* CPF (necessário para todos os métodos) */}
        {(step === "metodo" || step === "cartao") && (
          <div className="bg-white rounded-2xl border border-border p-5 mb-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm">Seus dados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Nome completo</Label>
                <Input value={userName} disabled className="h-9 text-sm bg-muted/30" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">CPF</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-9 text-sm"
                  maxLength={14}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASSO: método de pagamento */}
        {step === "metodo" && (
          <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
            <h3 className="font-semibold">Como você quer pagar?</h3>

            <button
              onClick={handleChoosePix}
              disabled={isPending || !cpf}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                "border-border hover:border-emerald-400 hover:bg-emerald-50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <QrCode className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">PIX</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aprovação instantânea • Sem juros</p>
              </div>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin ml-auto" /> : <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />}
            </button>

            {mpPublicKey && (
              <button
                onClick={handleChooseCard}
                disabled={isPending || !cpf}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  "border-border hover:border-blue-400 hover:bg-blue-50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Cartão de crédito</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Até 3x sem juros</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </button>
            )}

            {!cpf && (
              <p className="text-xs text-destructive text-center">Informe seu CPF para continuar.</p>
            )}
          </div>
        )}

        {/* PASSO: cartão */}
        {step === "cartao" && mpPublicKey && (
          <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("metodo")} className="text-muted-foreground hover:text-foreground text-sm">
                ← Voltar
              </button>
              <h3 className="font-semibold">Dados do cartão</h3>
            </div>
            <MpCardForm
              publicKey={mpPublicKey}
              amount={displayPrice}
              defaultEmail={userEmail}
              onSubmit={handleCardSubmit}
            />
          </div>
        )}

        {/* PASSO: aguardando PIX */}
        {step === "aguardando" && (
          <div className="bg-white rounded-2xl border border-border p-6 flex flex-col items-center gap-5 text-center">
            <QrCode className="h-10 w-10 text-emerald-500" />
            <div>
              <h3 className="font-bold text-lg">Pague o PIX para concluir</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.
              </p>
            </div>

            {qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48 rounded-xl border border-border"
              />
            )}

            {qrCode && (
              <div className="w-full">
                <div className="flex items-center gap-2 bg-muted rounded-xl p-3">
                  <p className="text-xs font-mono flex-1 truncate text-left text-muted-foreground">{qrCode}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(qrCode); toast.success("Copiado!"); }}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => { navigator.clipboard.writeText(qrCode); toast.success("Código PIX copiado!"); }}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copiar código PIX
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Aguardando confirmação do pagamento…
            </div>
          </div>
        )}

        {/* PASSO: sucesso */}
        {step === "sucesso" && (
          <div className="bg-white rounded-2xl border border-border p-8 flex flex-col items-center gap-5 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `${primaryColor}18` }}
            >
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl">Matrícula confirmada!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Bem-vindo ao curso. Seu acesso está liberado agora.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSuccess}
              className="font-bold text-white mt-2"
              style={{ background: primaryColor }}
            >
              Começar agora
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
