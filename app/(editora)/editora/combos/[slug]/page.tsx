import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Gift, BookOpen, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { ComboDetailActions } from "./combo-detail-actions";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("combos")
    .select("name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) return { title: "Combo não encontrado" };
  return {
    title: data.name,
    description: data.description ?? `Kit especial: ${data.name}`,
  };
}

export const revalidate = 60;

export default async function ComboDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: combo } = await supabase
    .from("combos")
    .select(`
      id, name, slug, description, image_url,
      price_original, price_promotional,
      combo_items (
        book_id,
        quantity,
        books (
          id, title, slug, cover_url, price, price_promotional,
          authors ( name )
        )
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!combo) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comboData = combo as any;
  const livros = ((comboData.combo_items as unknown[]) ?? [])
    .map((item: unknown) => {
      const row = item as { books: unknown; book_id: unknown; quantity: unknown };
      const b = row.books as {
        id: string; title: string; slug: string;
        cover_url: string | null; price: number; price_promotional: number | null;
        authors: { name: string } | null;
      } | null;
      if (!b) return null;
      return {
        id: b.id,
        title: b.title,
        slug: b.slug,
        coverUrl: b.cover_url,
        price: b.price,
        pricePromotional: b.price_promotional,
        author: (b.authors as { name: string } | null)?.name ?? null,
        quantity: row.quantity as number,
      };
    })
    .filter(Boolean) as {
      id: string; title: string; slug: string;
      coverUrl: string | null; price: number; pricePromotional: number | null;
      author: string | null; quantity: number;
    }[];

  const totalIndividual = livros.reduce(
    (sum, b) => sum + (b.pricePromotional ?? b.price),
    0
  );
  const pricePromo = comboData.price_promotional as number | null;
  const discount = Math.max(0, totalIndividual - (pricePromo ?? 0));
  const discountPct = totalIndividual > 0 ? Math.round((discount / totalIndividual) * 100) : 0;

  const cartItem = {
    id: `combo-${comboData.id}`,
    type: "combo" as const,
    title: comboData.name,
    slug: `combos/${comboData.slug}`,
    coverUrl: livros[0]?.coverUrl ?? null,
    price: (pricePromo ?? 0) > 0 ? pricePromo! : totalIndividual,
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/editora/combos" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Combos
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium line-clamp-1">{comboData.name}</span>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="grid md:grid-cols-2 gap-10">

          {/* Coluna esquerda — capa / imagem */}
          <div className="flex flex-col gap-6">
            {/* Imagem ou pilha de capas */}
            <div className="bg-foreground rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
              {comboData.image_url ? (
                <div className="relative w-full min-h-[300px]">
                  <Image src={comboData.image_url} alt={comboData.name} fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 500px" />
                </div>
              ) : livros.length > 0 ? (
                <div className="p-8">
                  <div className="relative" style={{ width: 160, height: 200 }}>
                    {livros[2] && (
                      <div className="absolute shadow-md" style={{ top: 20, left: 36, zIndex: 1, transform: "rotate(8deg)", opacity: 0.7 }}>
                        <BookCover book={livros[2]} size="lg" />
                      </div>
                    )}
                    {livros[1] && (
                      <div className="absolute shadow-md" style={{ top: 10, left: 18, zIndex: 2, transform: "rotate(4deg)", opacity: 0.85 }}>
                        <BookCover book={livros[1]} size="lg" />
                      </div>
                    )}
                    {livros[0] && (
                      <div className="absolute shadow-xl" style={{ top: 0, left: 0, zIndex: 3 }}>
                        <BookCover book={livros[0]} size="lg" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Gift className="h-24 w-24 text-white/20" />
              )}
            </div>

            {/* Lista de livros incluídos */}
            <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {livros.length} livro{livros.length !== 1 ? "s" : ""} incluídos
              </p>
              {livros.map((b, i) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground/50 w-4 text-right shrink-0">{i + 1}.</span>
                  {b.coverUrl && (
                    <Image
                      src={b.coverUrl}
                      alt={b.title}
                      width={32}
                      height={44}
                      className="rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/editora/livros/${b.slug}`}
                      className="text-sm font-medium text-foreground hover:text-brand transition-colors line-clamp-1"
                    >
                      {b.title}
                    </Link>
                    {b.author && (
                      <p className="text-xs text-muted-foreground truncate">{b.author}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatCurrency(b.pricePromotional ?? b.price)}
                  </span>
                </div>
              ))}
              {totalIndividual > 0 && (
                <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Valor individual</span>
                  <span className="font-semibold line-through text-muted-foreground">
                    {formatCurrency(totalIndividual)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita — info + compra */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-brand rounded-md p-1.5">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-brand uppercase tracking-wide">Kit especial</span>
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-3 leading-tight">
                {comboData.name}
              </h1>
              {comboData.description && (
                <p className="text-muted-foreground leading-relaxed">{comboData.description}</p>
              )}
            </div>

            {/* Benefícios */}
            <div className="flex flex-col gap-2">
              {[
                "Frete grátis para todo o Brasil",
                "Embalagem especial para presente",
                `Economia de ${formatCurrency(discount)} em relação à compra individual`,
              ].map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-brand shrink-0" />
                  {b}
                </div>
              ))}
            </div>

            {/* Bloco de preço */}
            <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-foreground">
                  {formatCurrency((pricePromo ?? 0) > 0 ? pricePromo! : totalIndividual)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-base text-muted-foreground line-through pb-0.5">
                      {formatCurrency(totalIndividual)}
                    </span>
                    <span className="text-sm font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full pb-0.5">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>
              {discount > 0 && (
                <p className="text-sm text-muted-foreground -mt-2">
                  Você economiza {formatCurrency(discount)} neste kit
                </p>
              )}

              <ComboDetailActions cartItem={cartItem} comboName={comboData.name} />
            </div>

            {/* Aviso */}
            <p className="text-xs text-muted-foreground text-center">
              Todos os livros serão enviados juntos em uma única entrega.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookCover({
  book,
  size = "md",
}: {
  book: { coverUrl: string | null; title: string };
  size?: "md" | "lg";
}) {
  const w = size === "lg" ? 96 : 56;
  const h = size === "lg" ? 130 : 76;
  return (
    <div
      className="rounded-lg overflow-hidden bg-brand-50 border border-brand-100 flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      {book.coverUrl ? (
        <Image src={book.coverUrl} alt={book.title} width={w} height={h} className="w-full h-full object-cover" />
      ) : (
        <BookOpen className="text-brand/30" style={{ width: w * 0.4, height: w * 0.4 }} />
      )}
    </div>
  );
}
