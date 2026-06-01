import { Suspense } from "react";
import type { Metadata } from "next";
import { FileText, CheckCircle, AlertCircle, Scale } from "lucide-react";
import { LegalContent } from "@/components/editora/legal-content";
import { LegalPageLoading } from "@/components/editora/legal-page-loading";

export const metadata: Metadata = {
  title: "Termos de Uso — Editora Jocum",
  description:
    "Leia os Termos de Uso da Editora Jocum e entenda as condições para utilização da nossa plataforma.",
};

const CONFIG = {
  badge: "Condições de Uso",
  icon: FileText,
  title: "Termos de",
  titleAccent: "Uso",
  description:
    "Ao utilizar nossa plataforma, você concorda com estas condições. Leia com atenção antes de realizar uma compra.",
  highlights: [
    { icon: CheckCircle, label: "Uso responsável" },
    { icon: Scale, label: "Relação justa" },
    { icon: AlertCircle, label: "Seus direitos" },
    { icon: FileText, label: "Regras claras" },
  ],
};

export default function TermosDeUsoPage() {
  return (
    <Suspense fallback={<LegalPageLoading />}>
      <LegalContent type="terms" config={CONFIG} />
    </Suspense>
  );
}
