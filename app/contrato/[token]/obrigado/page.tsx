import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ObrigadoPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createAdminClient();

  const { data: contrato } = await supabase
    .from("contratos")
    .select("client_name, client_email, signed_at, id")
    .eq("token", token)
    .eq("status", "assinado")
    .single();

  const dateStr = contrato?.signed_at
    ? new Date(contrato.signed_at).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full text-center">
        {/* Checkmark animado */}
        <div className="mx-auto w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Contrato assinado!
        </h1>

        {contrato && (
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Olá, <strong className="text-slate-700">{contrato.client_name.split(" ")[0]}</strong>!<br />
            Sua assinatura eletrônica foi registrada com sucesso.
          </p>
        )}

        {/* Detalhes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 text-left space-y-3">
          {contrato && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Signatário</span>
              <span className="font-medium text-slate-700">{contrato.client_name}</span>
            </div>
          )}
          {dateStr && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Data e hora</span>
              <span className="font-medium text-slate-700">{dateStr}</span>
            </div>
          )}
          {contrato?.id && (
            <div className="flex justify-between items-start text-sm gap-4">
              <span className="text-slate-400 shrink-0">ID do contrato</span>
              <span className="text-xs text-slate-400 text-right break-all">{contrato.id}</span>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
          <p className="text-xs text-blue-700 leading-relaxed">
            Uma cópia desta confirmação foi enviada para{" "}
            <strong>{contrato?.client_email}</strong>. Guarde este e-mail como
            comprovante da sua assinatura eletrônica (Lei 14.063/2020).
          </p>
        </div>

        <Link
          href={`/contrato/${token}`}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
        >
          Voltar ao contrato
        </Link>
      </div>
    </div>
  );
}
