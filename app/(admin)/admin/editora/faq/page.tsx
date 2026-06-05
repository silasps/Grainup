import { createAdminClient } from "@/lib/supabase/server";
import { FaqAdminClient } from "./faq-client";

export default async function FaqAdminPage() {
  const supabase = await createAdminClient();

  const [{ data: categories }, { data: faqs }] = await Promise.all([
    supabase.from("faq_categories").select("*").order("position"),
    supabase.from("faqs").select("*").order("position"),
  ]);

  return (
    <FaqAdminClient
      initialCategories={categories ?? []}
      initialFaqs={faqs ?? []}
    />
  );
}
