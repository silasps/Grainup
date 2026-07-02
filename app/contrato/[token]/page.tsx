import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getContratoContent } from "@/lib/contratos/content";
import { SignForm } from "./sign-form";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ContratoPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createAdminClient();

  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("id, token, client_name, client_email, status, signed_at, expires_at, contract_slug")
    .eq("token", token)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = not found; qualquer outro erro é problema de infra
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Serviço temporariamente indisponível</h1>
          <p className="text-sm text-slate-500 mb-4">
            Tente novamente em alguns instantes. Se o problema persistir, entre em contato com{" "}
            <a href="mailto:silaspereiras@gmail.com" className="text-blue-600 underline">
              silaspereiras@gmail.com
            </a>.
          </p>
          <p className="text-xs text-slate-300">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!contrato) notFound();

  const expired =
    contrato.status === "expirado" ||
    (contrato.status !== "assinado" && new Date(contrato.expires_at) < new Date());

  if (expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Link expirado</h1>
          <p className="text-sm text-slate-500">
            Este link de assinatura expirou. Entre em contato com{" "}
            <a href="mailto:silaspereiras@gmail.com" className="text-blue-600 underline">
              silaspereiras@gmail.com
            </a>{" "}
            para receber um novo link.
          </p>
        </div>
      </div>
    );
  }

  return <SignForm contrato={contrato} content={getContratoContent(contrato.contract_slug)} />;
}
