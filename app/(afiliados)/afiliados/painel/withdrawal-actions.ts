"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function requestWithdrawalAction(input: {
  amount: number;
  pixKey: string;
  pixKeyType: "cpf" | "email" | "telefone" | "aleatoria";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, status, balance")
    .eq("user_id", user.id)
    .single();

  if (!affiliate || affiliate.status !== "ativo") return { error: "Conta inativa." };
  if (affiliate.balance < 100) return { error: "Saldo mínimo para saque é R$ 100,00." };
  if (input.amount < 100) return { error: "Valor mínimo de saque é R$ 100,00." };
  if (input.amount > affiliate.balance) return { error: "Valor maior que o saldo disponível." };
  if (!input.pixKey.trim()) return { error: "Informe a chave Pix." };

  const admin = await createAdminClient();

  // Verifica se já tem saque pendente
  const { data: existing } = await admin
    .from("affiliate_withdrawals")
    .select("id")
    .eq("affiliate_id", affiliate.id)
    .in("status", ["pendente", "processando"])
    .limit(1);
  if (existing?.length) return { error: "Você já tem um saque em andamento. Aguarde a conclusão." };

  // Reserva o valor (desconta do saldo imediatamente)
  await admin.from("affiliates").update({ balance: affiliate.balance - input.amount }).eq("id", affiliate.id);

  // Cria o saque
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wd, error } = await (admin as any)
    .from("affiliate_withdrawals")
    .insert({
      affiliate_id: affiliate.id,
      amount: input.amount,
      status: "pendente",
      pix_key: input.pixKey.trim(),
      pix_key_type: input.pixKeyType,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Devolve o saldo se falhou
    await admin.from("affiliates").update({ balance: affiliate.balance }).eq("id", affiliate.id);
    return { error: error.message };
  }

  return { error: null, withdrawal: wd };
}
