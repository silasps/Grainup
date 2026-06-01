import { Suspense } from "react";
import type { Metadata } from "next";
import { Truck, MapPin, Clock, Package } from "lucide-react";
import { LegalContent } from "@/components/editora/legal-content";
import { LegalPageLoading } from "@/components/editora/legal-page-loading";

export const metadata: Metadata = {
  title: "Política de Frete — Editora Jocum",
  description:
    "Entenda como calculamos o frete, os prazos de entrega e as regiões atendidas pela Editora Jocum.",
};

const CONFIG = {
  badge: "Entrega e Logística",
  icon: Truck,
  title: "Política de",
  titleAccent: "Frete",
  description:
    "Entregamos em todo o Brasil. Veja como calculamos o frete, os prazos estimados e as modalidades disponíveis.",
  highlights: [
    { icon: MapPin, label: "Todo o Brasil" },
    { icon: Clock, label: "Prazos claros" },
    { icon: Package, label: "Embalagem segura" },
    { icon: Truck, label: "Múltiplas transportadoras" },
  ],
};

export default function PoliticaDeFreteePage() {
  return (
    <Suspense fallback={<LegalPageLoading />}>
      <LegalContent type="shipping" config={CONFIG} />
    </Suspense>
  );
}
