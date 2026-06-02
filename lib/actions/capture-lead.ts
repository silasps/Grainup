"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function captureLeadAction(data: {
  name: string;
  email: string;
  origin: string;
  bookId?: string;
  marketingConsent: boolean;
}) {
  if (!data.name.trim() || !data.email.trim()) {
    return { error: "Nome e e-mail são obrigatórios." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { error: "E-mail inválido." };
  }

  const supabase = await createAdminClient();
  const email = data.email.toLowerCase().trim();

  // Verifica se já existe
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Atualiza consentimento se já cadastrado
    await supabase
      .from("leads")
      .update({ marketing_consent: data.marketingConsent, name: data.name.trim() })
      .eq("id", existing.id);
    return { error: null };
  }

  const { error } = await supabase.from("leads").insert({
    name: data.name.trim(),
    email,
    phone: null,
    origin: data.origin,
    book_id: data.bookId ?? null,
    marketing_consent: data.marketingConsent,
  });

  if (error) return { error: "Não foi possível salvar. Tente novamente." };
  return { error: null };
}
