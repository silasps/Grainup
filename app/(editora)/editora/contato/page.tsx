import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { ContatoForm } from "./contato-form";
import { ContactInfo } from "./contact-info";
import { Send } from "lucide-react";

export const metadata: Metadata = { title: "Contato — Editora Jocum" };
export const dynamic = "force-dynamic";

export default async function ContatoPage() {
  const supabase = await createAdminClient();
  const { data: contact } = await supabase
    .from("contact_settings")
    .select("email, whatsapp, phone, whatsapp_message, whatsapp_enabled, address, business_hours, instagram, facebook, youtube")
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-14">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <Send className="h-5 w-5 text-brand" />
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Atendimento</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">Fale conosco</h1>
          <p className="text-white/65 max-w-xl leading-relaxed">
            Estamos aqui para ajudar. Envie sua mensagem e retornaremos em até 1 dia útil.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-[1fr_380px] gap-12">
            <ContatoForm />
            <ContactInfo contact={contact} />
          </div>
        </div>
      </section>
    </div>
  );
}
