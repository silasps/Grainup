"use client";

import { useEffect } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

export interface CardPaymentData {
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId: string;
}

interface Props {
  publicKey: string;
  amount: number;
  defaultEmail?: string;
  onSubmit: (data: CardPaymentData) => Promise<void>;
}

export function MpCardForm({ publicKey, amount, defaultEmail, onSubmit }: Props) {
  useEffect(() => {
    initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  const payer = { email: defaultEmail ?? "" };

  return (
    <CardPayment
      initialization={{ amount, payer }}
      customization={{ paymentMethods: { maxInstallments: 3 } }}
      onSubmit={async (formData) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = formData as any;
        await onSubmit({
          token: d.token ?? "",
          installments: d.installments ?? 1,
          paymentMethodId: d.payment_method_id ?? "",
          issuerId: String(d.issuer_id ?? ""),
        });
      }}
      onError={(error) => console.error("[MP CardPayment]", error)}
    />
  );
}
