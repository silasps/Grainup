import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComboCard, type ComboData } from "@/components/editora/combo-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Combos",
  description: "Kits e combos de livros da Editora Jocum com preço especial. Monte sua coleção.",
};

export const revalidate = 3600;

const COMBOS_BASE: Omit<ComboData, "livros">[] = [
  {
    id: "missoes",
    titulo: "Kit Missões Mundiais",
    descricao: "3 livros essenciais para quem quer entender e viver a missão de Deus no mundo.",
    temas: ["Missões", "Evangelismo", "Chamado"],
    descontoReais: 30,
  },
  {
    id: "lideranca",
    titulo: "Kit Liderança Cristã",
    descricao: "Uma coleção cuidadosa para desenvolver líderes servidores e íntegros.",
    temas: ["Liderança", "Caráter", "Discipulado"],
    descontoReais: 25,
  },
  {
    id: "familia",
    titulo: "Kit Família",
    descricao: "Livros práticos que fortalecem o casamento, a parentalidade e a família cristã.",
    temas: ["Família", "Casamento", "Filhos"],
    descontoReais: 20,
  },
  {
    id: "oracao",
    titulo: "Kit Vida de Oração",
    descricao: "Para quem quer aprofundar sua intimidade com Deus e entender o poder da oração.",
    temas: ["Oração", "Intimidade com Deus", "Espiritualidade"],
    descontoReais: 22,
  },
];

export default async function CombosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, authors(name)")
    .eq("is_active", true)
    .order("rating_avg", { ascending: false })
    .limit(12);

  const rows = (data ?? []) as Record<string, unknown>[];
  const allBooks = rows.map((b) => ({
    id: b.id as string,
    title: b.title as string,
    slug: b.slug as string,
    author: (b.authors as { name: string } | null)?.name ?? null,
    coverUrl: b.cover_url as string | null,
    price: b.price as number,
    pricePromotional: b.price_promotional as number | null,
  }));

  // Distribui 3 livros por combo em rotação
  const combos: ComboData[] = COMBOS_BASE.map((c, i) => ({
    ...c,
    livros: allBooks.slice(i * 3, i * 3 + 3),
  }));

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-14">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="h-5 w-5 text-brand" />
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Kits e Combos</span>
          </div>
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
          <span>Monte seu combo e economize até <strong>R$30</strong> em relação à compra avulsa.</span>
        </div>
      </section>

      {/* Cards */}
      <section className="py-14">
        <div className="container mx-auto max-w-7xl px-4">

          {/* Aviso em breve */}
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-10 flex items-start gap-3">
            <Gift className="h-5 w-5 text-brand shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-700">Combos em composição</p>
              <p className="text-sm text-brand-700/80 mt-0.5">
                Os títulos exibidos são ilustrativos — estamos montando os kits definitivos.{" "}
                <Link href="/editora/contato" className="underline font-medium">
                  Fale conosco
                </Link>{" "}
                para montar um combo personalizado.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {combos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>

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
