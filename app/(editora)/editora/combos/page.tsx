import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComboCard, type ComboData } from "@/components/editora/combo-card";
import { HeroEyebrow } from "@/components/editora/hero-highlight";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Combos",
  description: "Kits e combos de livros da Editora Jocum com preço especial. Monte sua coleção.",
};

export const revalidate = 3600;

export default async function CombosPage() {
  const supabase = await createClient();

  type ComboRow = {
    id: string;
    name: string;
    description: string | null;
    price_original: number;
    price_promotional: number;
    combo_items: Array<{
      book_id: string;
      books: {
        id: string;
        title: string;
        slug: string;
        cover_url: string | null;
        price: number;
        price_promotional: number | null;
        authors: { name: string } | null;
      } | null;
    }>;
  };

  const { data } = await supabase
    .from("combos")
    .select(`
      id,
      name,
      description,
      price_original,
      price_promotional,
      combo_items (
        book_id,
        books (
          id,
          title,
          slug,
          cover_url,
          price,
          price_promotional,
          authors ( name )
        )
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const combos: ComboData[] = ((data ?? []) as unknown as ComboRow[]).map((c) => ({
    id: c.id,
    titulo: c.name,
    descricao: c.description ?? "",
    descontoReais: Math.max(0, c.price_original - c.price_promotional),
    livros: c.combo_items
      .map((item) => {
        const b = item.books;
        if (!b) return null;
        return {
          id: b.id,
          title: b.title,
          slug: b.slug,
          coverUrl: b.cover_url,
          price: b.price,
          pricePromotional: b.price_promotional,
          author: b.authors?.name ?? null,
        };
      })
      .filter(Boolean) as ComboData["livros"],
  }));

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-14">
        <div className="container mx-auto max-w-7xl px-4">
          <HeroEyebrow icon={Gift}>Kits e Combos</HeroEyebrow>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            Combos especiais
          </h1>
          <p className="text-white/65 max-w-xl leading-relaxed">
            Kits temáticos com preço especial para você montar sua coleção e economizar.
          </p>
        </div>
      </section>

      {/* Barra de benefício */}
      <section className="bg-brand text-white py-3">
        <div className="container mx-auto max-w-7xl px-4 flex items-center justify-center gap-2 text-sm">
          <Gift className="h-4 w-4 shrink-0" />
          <span>Monte seu combo e economize comprando em kit.</span>
        </div>
      </section>

      {/* Cards */}
      <section className="py-14">
        <div className="container mx-auto max-w-7xl px-4">
          {combos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Gift className="h-10 w-10 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-foreground mb-1">Nenhum combo disponível no momento</p>
              <p className="text-sm">Em breve teremos kits temáticos com preço especial.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {combos.map((combo) => (
                <ComboCard key={combo.id} combo={combo} />
              ))}
            </div>
          )}

          <div className="mt-14 text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              Prefere montar sua própria seleção?
            </p>
            <Button asChild className="bg-brand hover:bg-brand-700 text-white">
              <Link href="/editora/livros">
                Ver catálogo completo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
