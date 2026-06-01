import { Suspense } from "react";
import type { Metadata } from "next";
import { Shield, Eye, Lock, UserCheck } from "lucide-react";
import { LegalContent } from "@/components/editora/legal-content";
import { LegalPageLoading } from "@/components/editora/legal-page-loading";

export const metadata: Metadata = {
  title: "Política de Privacidade — Editora Jocum",
  description:
    "Saiba como a Editora Jocum coleta, usa e protege seus dados pessoais em conformidade com a LGPD.",
};

const CONFIG = {
  badge: "Transparência e Privacidade",
  icon: Shield,
  title: "Política de",
  titleAccent: "Privacidade",
  description:
    "Valorizamos sua confiança. Saiba como coletamos, utilizamos e protegemos seus dados pessoais em conformidade com a LGPD.",
  highlights: [
    { icon: Shield, label: "LGPD em conformidade" },
    { icon: Lock, label: "Dados criptografados" },
    { icon: UserCheck, label: "Seus direitos garantidos" },
    { icon: Eye, label: "Transparência total" },
  ],
};

export default function PoliticaDePrivacidadePage() {
  return (
    <Suspense fallback={<LegalPageLoading />}>
      <LegalContent type="privacy" config={CONFIG} />
    </Suspense>
  );
}
