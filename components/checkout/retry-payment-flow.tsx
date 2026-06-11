"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MpCardForm, type CardPaymentData } from "@/components/checkout/mp-card-form";
import { OrderStatusPoller } from "@/components/conta/order-status-poller";
import { formatCurrency } from "@/lib/utils/format";
import {
  createMpPixPaymentAction,
  createMpCardPaymentAction,
  checkOrderPaymentStatusAction,
} from "@/app/(checkout)/checkout/actions";

type Step = "pagamento" | "pix" | "cartao" | "sucesso";

interface Props {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerEmail: string;
  customerCpf: string;
  customerName: string;
}

export function RetryPaymentFlow({ orderId, orderNumber, amount, customerEmail, customerCpf, customerName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pagamento");
  const [loading, setLoading] = useState(false);
  const [pixQrCode, setPixQrCode] = useState("");
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState("");
  const [pixSecondsLeft, setPixSecondsLeft] = useState(600);
  const [cardPending, setCardPending] = useState(false);
  const pixPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pixTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handlePix() {
    setLoading(true);
    const result = await createMpPixPaymentAction({ orderId, orderNumber, amount, customerEmail, customerCpf, customerName });
    setLoading(false);
    if (result.error) { toast.error(result.error); return; }
    setPixQrCode(result.qrCode ?? "");
    setPixQrCodeBase64(result.qrCodeBase64 ?? "");
    setPixSecondsLeft(600);
    setStep("pix");

    pixTimerRef.current = setInterval(() => {
      setPixSecondsLeft((s) => { if (s <= 1) { clearInterval(pixTimerRef.current!); return 0; } return s - 1; });
    }, 1000);

    pixPollRef.current = setInterval(async () => {
      const r = await checkOrderPaymentStatusAction(orderId);
      if (r.paymentStatus === "aprovado") {
        clearInterval(pixPollRef.current!);
        clearInterval(pixTimerRef.current!);
        setStep("sucesso");
      }
    }, 5000);
  }

  async function handleCardPayment(data: CardPaymentData) {
    setLoading(true);
    const result = await createMpCardPaymentAction({
      orderId, orderNumber, token: data.token, installments: data.installments,
      paymentMethodId: data.paymentMethodId, issuerId: data.issuerId,
      amount, customerEmail, customerCpf, customerName,
    });
    setLoading(false);
    if (result.error) { toast.error(result.error); return; }
    if (result.status === "approved") { setCardPending(false); setStep("sucesso"); }
    else if (result.status === "pending") { setCardPending(true); setStep("sucesso"); }
    else { toast.error("Pagamento recusado. Tente outro cartão ou use o PIX."); }
  }

  if (step === "sucesso") {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center px-4">
        <OrderStatusPoller hasPending={cardPending} orderId={orderId} />
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${cardPending ? "bg-yellow-400" : "bg-brand"}`}>
          <PackageCheck className="h-10 w-10 text-white" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-1">
            {cardPending ? "Pagamento em análise" : "Pagamento confirmado!"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {cardPending
              ? "Você receberá um e-mail assim que o pagamento for aprovado."
              : `Pedido #${orderNumber} pago com sucesso.`}
          </p>
        </div>
        <Button onClick={() => router.push(`/minha-conta/pedidos/${orderId}`)} className="bg-brand hover:bg-brand-700 text-white">
          Ver meu pedido
        </Button>
      </div>
    );
  }

  if (step === "pix") {
    const mins = String(Math.floor(pixSecondsLeft / 60)).padStart(2, "0");
    const secs = String(pixSecondsLeft % 60).padStart(2, "0");
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Pedido <strong>#{orderNumber}</strong></p>
          <p className="text-3xl font-bold">{formatCurrency(amount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Expira em {mins}:{secs}</p>
        </div>
        {pixQrCodeBase64 && (
          <div className="bg-white border-2 border-border rounded-2xl p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/png;base64,${pixQrCodeBase64}`} alt="QR Code PIX" width={180} height={180} />
          </div>
        )}
        {pixQrCode && (
          <Button variant="outline" className="w-full text-xs" onClick={() => { navigator.clipboard.writeText(pixQrCode); toast.success("Código copiado!"); }}>
            Copiar código PIX
          </Button>
        )}
      </div>
    );
  }

  if (step === "cartao") {
    return (
      <div className="py-4 px-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">Total a pagar</p>
          <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
        </div>
        <MpCardForm
          publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!}
          amount={amount}
          defaultEmail={customerEmail}
          onSubmit={handleCardPayment}
        />
        <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground" onClick={() => setStep("pagamento")}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-8 px-4 max-w-sm mx-auto w-full">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">Pedido <strong>#{orderNumber}</strong></p>
        <p className="text-3xl font-bold">{formatCurrency(amount)}</p>
      </div>
      <Button onClick={handlePix} disabled={loading} variant="outline" className="w-full h-14 text-base font-semibold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
        Pagar com PIX
      </Button>
      <Button onClick={() => setStep("cartao")} disabled={loading} variant="outline" className="w-full h-14 text-base font-semibold">
        Pagar com Cartão
      </Button>
    </div>
  );
}
