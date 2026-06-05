"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, BookOpen, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export interface ComboBook {
  id: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  slug: string;
  price: number;
  pricePromotional?: number | null;
}

export interface ComboData {
  id: string;
  slug?: string;
  titulo: string;
  descricao: string;
  imageUrl?: string | null;
  temas?: string[];
  descontoReais: number;
  livros: ComboBook[];
}

// Exibe capa ou placeholder
function Cover({
  book,
  size = "md",
}: {
  book: ComboBook;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? 44 : 56;
  const h = size === "sm" ? 60 : 76;
  return (
    <div
      className="rounded-md overflow-hidden bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0"
      style={{ width: w, height: h }}
    >
      {book.coverUrl ? (
        <Image
          src={book.coverUrl}
          alt={book.title}
          width={w}
          height={h}
          className="w-full h-full object-cover"
        />
      ) : (
        <BookOpen className="text-brand/30" style={{ width: w * 0.4, height: w * 0.4 }} />
      )}
    </div>
  );
}

export function ComboCard({ combo, slug }: { combo: ComboData; slug?: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const setBuyNow = useCartStore((s) => s.setBuyNow);
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const livros = combo.livros;

  // Preço total individual e preço do combo com desconto
  const totalIndividual = livros.reduce(
    (sum, b) => sum + (b.pricePromotional ?? b.price),
    0
  );
  const comboPrice = Math.max(0, totalIndividual - combo.descontoReais);

  function buildCartItem() {
    return {
      id: `combo-${combo.id}`,
      type: "combo" as const,
      title: combo.titulo,
      slug: `combos/${combo.id}`,
      coverUrl: livros[0]?.coverUrl ?? null,
      price: comboPrice > 0 ? comboPrice : totalIndividual,
    };
  }

  function handleAddToCart() {
    setAdding(true);
    addItem(buildCartItem());
    toast.success("Combo adicionado ao carrinho", {
      description: combo.titulo,
      action: {
        label: "Ver carrinho",
        onClick: () => router.push("/editora/carrinho"),
      },
    });
    setTimeout(() => setAdding(false), 600);
  }

  function handleBuyNow() {
    setBuyNow(buildCartItem());
    router.push("/checkout");
  }

  const inner = (
    <>
      {/* ── Cabeçalho ─── */}
      <div className="relative bg-foreground px-5 pt-5 pb-4 text-white min-h-[112px] flex flex-col justify-between overflow-hidden">
        {combo.imageUrl && (
          <Image src={combo.imageUrl} alt="" fill className="object-cover object-center opacity-30" sizes="600px" />
        )}
        <div className="relative flex items-start gap-3 mb-3">
          <div className="bg-brand rounded-lg p-2 shrink-0 mt-0.5">
            <Gift className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold leading-snug line-clamp-2">{combo.titulo}</h2>
            <p className="text-white/60 text-xs leading-relaxed mt-0.5 line-clamp-3">{combo.descricao}</p>
          </div>
        </div>
        {combo.temas && combo.temas.length > 0 && (
          <div className="relative flex flex-wrap gap-1.5">
            {combo.temas.map((t) => (
              <Badge key={t} className="bg-brand-800/60 text-brand-100 hover:bg-brand-700/60 border-0 text-xs">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* ── Corpo: capas + lista ─── */}
      <div className="p-4 flex gap-4 flex-1">
        <div className="shrink-0 flex items-center justify-center" style={{ width: 88 }}>
          {livros.length > 0 ? (
            <div className="relative" style={{ width: 80, height: 92 }}>
              {livros[2] && (
                <div className="absolute shadow-sm" style={{ top: 10, left: 18, zIndex: 1, transform: "rotate(8deg)", opacity: 0.75 }}>
                  <Cover book={livros[2]} />
                </div>
              )}
              {livros[1] && (
                <div className="absolute shadow-sm" style={{ top: 5, left: 9, zIndex: 2, transform: "rotate(4deg)", opacity: 0.88 }}>
                  <Cover book={livros[1]} />
                </div>
              )}
              {livros[0] && (
                <div className="absolute shadow-md" style={{ top: 0, left: 0, zIndex: 3 }}>
                  <Cover book={livros[0]} />
                </div>
              )}
            </div>
          ) : (
            <div className="w-14 h-[76px] rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-brand/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {livros.length > 0 ? (
            livros.map((b, i) => (
              <div key={b.id} className="flex items-start gap-2 min-w-0">
                <span className="text-xs text-muted-foreground/50 shrink-0 mt-0.5 w-3 text-right">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{b.title}</p>
                  {b.author && <p className="text-xs text-muted-foreground truncate">{b.author}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic">Livros em breve</p>
          )}
        </div>
      </div>

      {/* ── Preço ─── */}
      <div className="px-4 pt-3 pb-4 border-t border-border">
        {totalIndividual > 0 ? (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">
              R$ {comboPrice.toFixed(2).replace(".", ",")}
            </span>
            {combo.descontoReais > 0 && (
              <>
                <span className="text-xs text-muted-foreground line-through">
                  R$ {totalIndividual.toFixed(2).replace(".", ",")}
                </span>
                <Badge className="bg-brand text-white border-0 text-xs">
                  -{formatCurrency(combo.descontoReais)}
                </Badge>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Preço sob consulta</p>
        )}
      </div>
    </>
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col bg-card h-full">
      {/* Área clicável — tudo exceto os botões */}
      {slug ? (
        <Link href={`/editora/combos/${slug}`} className="flex flex-col flex-1">
          {inner}
        </Link>
      ) : (
        <div className="flex flex-col flex-1">{inner}</div>
      )}

      {/* Botões de ação — fora do link */}
      <div className="px-4 pb-4 flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-brand hover:bg-brand-700 text-white text-xs h-9"
          onClick={handleBuyNow}
          disabled={livros.length === 0}
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Comprar agora
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-9"
          onClick={handleAddToCart}
          disabled={adding || livros.length === 0}
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          {adding ? "Adicionado!" : "Carrinho"}
        </Button>
      </div>
    </div>
  );
}
