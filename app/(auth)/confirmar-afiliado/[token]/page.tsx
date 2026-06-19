import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Logo } from "@/components/shared/logo";
import { ShieldCheck } from "lucide-react";
import { ConfirmationForm } from "./confirmation-form";

export const metadata = { title: "Confirmação de vínculo JOCUM — Editora JOCUM" };

export default async function ConfirmarAfiliadoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createAdminClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("name, serving_location, leader_confirmed_at, type")
    .eq("leader_token", token)
    .single();

  if (!affiliate || affiliate.type !== "jocum") notFound();

  const alreadyAnswered = !!affiliate.leader_confirmed_at;

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <Logo href="/editora" imageClassName="h-14" />

      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 w-full flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="bg-brand-50 rounded-full p-3">
            <ShieldCheck className="h-7 w-7 text-brand" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            Confirmação de vínculo JOCUM
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O programa de afiliados da Editora JOCUM requer que líderes diretos
            confirmem o vínculo missionário dos candidatos.
          </p>
        </div>

        {alreadyAnswered ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <ShieldCheck className="h-10 w-10 text-brand" />
            <p className="font-semibold text-foreground">Resposta já registrada</p>
            <p className="text-sm text-muted-foreground">
              Você já respondeu ao formulário de confirmação para{" "}
              <strong>{affiliate.name}</strong>. Obrigado!
            </p>
          </div>
        ) : (
          <ConfirmationForm
            token={token}
            affiliateName={affiliate.name}
            servingLocation={affiliate.serving_location}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Dúvidas? Entre em contato com{" "}
        <a href="mailto:contato@editorajocum.com.br" className="underline hover:text-foreground">
          contato@editorajocum.com.br
        </a>
      </p>
    </div>
  );
}
