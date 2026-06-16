"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ContratoRow {
  id: string;
  token: string;
  client_name: string;
  client_email: string;
  contract_slug: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  expires_at: string;
  evidence_json: Record<string, unknown> | null;
  signer_ip: string | null;
  signer_latitude: number | null;
  signer_longitude: number | null;
}

export async function getContratosAction(): Promise<ContratoRow[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("contratos")
    .select("id, token, client_name, client_email, contract_slug, status, signed_at, created_at, expires_at, evidence_json, signer_ip, signer_latitude, signer_longitude")
    .order("created_at", { ascending: false });
  return (data ?? []) as ContratoRow[];
}

export async function deleteContratoAction(id: string): Promise<{ error?: string }> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", id)
    .neq("status", "assinado"); // nunca deleta contratos assinados
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/contratos");
  return {};
}

export async function createContratoAction(
  clientName: string,
  clientEmail: string,
): Promise<{ token?: string; error?: string }> {
  if (!clientName.trim() || !clientEmail.trim()) return { error: "Nome e e-mail são obrigatórios." };

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("contratos")
    .insert({ client_name: clientName.trim(), client_email: clientEmail.trim() })
    .select("token")
    .single();

  if (error || !data) return { error: error?.message ?? "Erro ao criar contrato." };
  revalidatePath("/admin/editora/contratos");
  return { token: data.token };
}
