import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HelpCircle, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "Perguntas Frequentes",
  description: "Tire suas dúvidas sobre pedidos, pagamento, entrega e muito mais.",
};

export const revalidate = 300;

export default async function FaqPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: faqs }] = await Promise.all([
    supabase.from("faq_categories").select("id, name, position").order("position"),
    supabase.from("faqs").select("id, category_id, question, answer, position, is_featured").eq("is_active", true).order("position"),
  ]);

  const cats = categories ?? [];
  const allFaqs = faqs ?? [];

  // Build sections: categories with their FAQs, then uncategorized
  type Section = { id: string; name: string; faqs: typeof allFaqs };
  const sections: Section[] = cats
    .map((cat) => ({ id: cat.id, name: cat.name, faqs: allFaqs.filter((f) => f.category_id === cat.id) }))
    .filter((s) => s.faqs.length > 0);

  const uncategorized = allFaqs.filter((f) => !f.category_id);
  if (uncategorized.length > 0) {
    sections.push({ id: "other", name: "Outros", faqs: uncategorized });
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center text-center mb-10 gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h1>
        <p className="text-muted-foreground max-w-md">
          Tire suas dúvidas sobre pedidos, pagamento, entrega e muito mais.
        </p>
      </div>

      {sections.length === 0 && (
        <p className="text-center text-muted-foreground py-16">Nenhuma FAQ disponível no momento.</p>
      )}

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div key={section.id}>
            {sections.length > 1 && (
              <h2 className="text-lg font-semibold mb-3 text-foreground/80">{section.name}</h2>
            )}
            <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
              {section.faqs.map((faq) => (
                <details key={faq.id} className="group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium list-none gap-3 hover:bg-muted/40 transition-colors">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-4 text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
