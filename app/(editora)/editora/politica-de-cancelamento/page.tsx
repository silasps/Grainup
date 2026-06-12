import { Suspense } from "react";
import type { Metadata } from "next";
import { XCircle, Clock, CreditCard, RefreshCw } from "lucide-react";
import { LegalContent } from "@/components/editora/legal-content";
import { LegalPageLoading } from "@/components/editora/legal-page-loading";

export const metadata: Metadata = {
  title: "Política de Cancelamento — Editora Jocum",
  description:
    "Entenda como funciona o cancelamento de pedidos, o período de 24 horas para nova tentativa de pagamento e o processo de reembolso.",
};

const CONFIG = {
  badge: "Compra e Pagamento",
  icon: XCircle,
  title: "Política de",
  titleAccent: "Cancelamento",
  description:
    "Transparência em cada etapa. Saiba como funciona o cancelamento de pedidos e o processo de reembolso na Editora Jocum.",
  highlights: [
    { icon: Clock, label: "24h para retry" },
    { icon: RefreshCw, label: "Nova tentativa" },
    { icon: CreditCard, label: "Reembolso garantido" },
    { icon: XCircle, label: "Processo simples" },
  ],
};

export default function PoliticaDeCancelamentoPage() {
  return (
    <Suspense fallback={<LegalPageLoading />}>
      <LegalContent type="cancellation" config={CONFIG} />
    </Suspense>
  );
}
