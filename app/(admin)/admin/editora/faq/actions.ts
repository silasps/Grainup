"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/admin/editora/faq");
  revalidatePath("/editora/faq");
}

// Categories
export async function saveCategory(data: { id?: string; name: string; slug: string; position: number }) {
  const supabase = await createAdminClient();
  const { id, ...fields } = data;
  const { error } = id
    ? await supabase.from("faq_categories").update(fields).eq("id", id)
    : await supabase.from("faq_categories").insert(fields);
  if (error) return { error: error.message };
  revalidate();
  return { error: null };
}

export async function deleteCategory(id: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("faq_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { error: null };
}

// FAQs
export async function saveFaq(data: {
  id?: string;
  category_id: string | null;
  question: string;
  answer: string;
  position: number;
  is_active: boolean;
  is_featured: boolean;
}) {
  const supabase = await createAdminClient();
  const { id, ...fields } = data;
  const { error } = id
    ? await supabase.from("faqs").update(fields).eq("id", id)
    : await supabase.from("faqs").insert(fields);
  if (error) return { error: error.message };
  revalidate();
  return { error: null };
}

export async function deleteFaq(id: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { error: null };
}

export async function toggleFaq(id: string, field: "is_active" | "is_featured", value: boolean) {
  const supabase = await createAdminClient();
  const patch = field === "is_active" ? { is_active: value } : { is_featured: value };
  const { error } = await supabase.from("faqs").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { error: null };
}
