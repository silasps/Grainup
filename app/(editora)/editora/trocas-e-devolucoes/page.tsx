import { Suspense } from "react";
import type { Metadata } from "next";
import { RotateCcw, Clock, CheckCircle, HeartHandshake } from "lucide-react";
import { LegalContent } from "@/components/editora/legal-content";
import { LegalPageLoading } from "@/components/editora/legal-page-loading";

export const metadata: Metadata = {
  title: "Trocas e Devoluções — Editora Jocum",
  description:
    "Saiba como funciona o processo de troca e devolução de produtos da Editora Jocum.",
};

const CONFIG = {
  badge: "Trocas e Devoluções",
  icon: RotateCcw,
  title: "Política de",
  titleAccent: "Devoluções",
  description:
    "Sua satisfação é nossa prioridade. Entenda como funciona o processo de troca e devolução de pedidos.",
  highlights: [
    { icon: Clock, label: "Prazo de 7 dias" },
    { icon: CheckCircle, label: "Processo simples" },
    { icon: HeartHandshake, label: "Atendimento humano" },
    { icon: RotateCcw, label: "Troca garantida" },
  ],
};

export default function TrocasEDevolucoesPage() {
  return (
    <Suspense fallback={<LegalPageLoading />}>
      <LegalContent type="returns" config={CONFIG} />
    </Suspense>
  );
}
