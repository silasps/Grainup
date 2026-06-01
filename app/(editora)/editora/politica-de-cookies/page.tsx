import { Suspense } from "react";
import type { Metadata } from "next";
import { Cookie, Settings, BarChart2, Shield } from "lucide-react";
import { LegalContent } from "@/components/editora/legal-content";
import { LegalPageLoading } from "@/components/editora/legal-page-loading";

export const metadata: Metadata = {
  title: "Política de Cookies — Editora Jocum",
  description:
    "Entenda como a Editora Jocum utiliza cookies e tecnologias similares para melhorar sua experiência.",
};

const CONFIG = {
  badge: "Cookies e Rastreamento",
  icon: Cookie,
  title: "Política de",
  titleAccent: "Cookies",
  description:
    "Usamos cookies para garantir o funcionamento do site e melhorar sua experiência. Saiba quais e para quê.",
  highlights: [
    { icon: Shield, label: "Cookies essenciais" },
    { icon: BarChart2, label: "Análise anônima" },
    { icon: Settings, label: "Suas preferências" },
    { icon: Cookie, label: "Controle total" },
  ],
};

export default function PoliticaDeCookiesPage() {
  return (
    <Suspense fallback={<LegalPageLoading />}>
      <LegalContent type="cookies" config={CONFIG} />
    </Suspense>
  );
}
