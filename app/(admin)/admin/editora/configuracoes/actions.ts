"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ContactPayload = {
  id: string;
  email: string;
  phone: string;
  whatsapp: string;
  whatsapp_message: string;
  whatsapp_enabled: boolean;
  address: string;
  business_hours: string;
  instagram: string;
  facebook: string;
  youtube: string;
};

export async function saveContactAction(payload: ContactPayload) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("contact_settings").upsert(payload);
  if (error) return { error: error.message };
  revalidatePath("/editora", "layout");
  revalidatePath("/editora/contato");
  return { error: null };
}

export type LegalPayload = {
  id: string;
  title: string;
  content: string;
};

export async function saveLegalPageAction(payload: LegalPayload) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("legal_pages")
    .update({ title: payload.title, content: payload.content })
    .eq("id", payload.id);
  if (error) return { error: error.message };
  return { error: null };
}
