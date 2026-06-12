import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalPageLayout, type LegalPageConfig } from "./legal-page-layout";

interface Props {
  type: "privacy" | "terms" | "returns" | "shipping" | "cookies" | "cancellation";
  config: LegalPageConfig;
}

export async function LegalContent({ type, config }: Props) {
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("legal_pages")
    .select("title, content, updated_at")
    .eq("type", type)
    .maybeSingle();

  if (!page) notFound();

  return <LegalPageLayout config={config} page={page} />;
}
