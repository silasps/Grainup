import type { Metadata } from "next";
import { EditoraHeader } from "@/components/editora/header";
import { EditoraFooter } from "@/components/editora/footer";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { CookieBanner } from "@/components/shared/cookie-banner";

export const metadata: Metadata = {
  title: {
    default: "Editora Jocum",
    template: "%s | Editora Jocum",
  },
  description: "Livros que transformam vidas. Conheça o catálogo completo da Editora Jocum.",
};

export default function EditoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EditoraHeader />
      <main className="flex-1">{children}</main>
      <EditoraFooter />
      <WhatsAppButton phone="5541991435610" enabled />
      <CookieBanner />
    </>
  );
}
