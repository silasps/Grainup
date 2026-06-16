import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contrato GrainUp — Editora Jocum",
  description:
    "Contrato de Prestação de Serviços · GrainUp Módulo Editora · Clique para ler e assinar digitalmente.",
  openGraph: {
    title: "Contrato GrainUp — Editora Jocum",
    description:
      "Contrato de Prestação de Serviços · Módulo Editora · R$ 6.000,00 · Clique para ler e assinar.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function ContratoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
