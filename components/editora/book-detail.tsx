"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Zap,
  Star,
  Truck,
  ShieldCheck,
  ChevronLeft,
  Minus,
  Plus,
  BookOpen,
  Award,
  Package,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCard, type BookCardData } from "./book-card";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
}

interface BookImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
}

interface BookDetailProps {
  book: {
    id: string;
    title: string;
    slug: string;
    description_full: string | null;
    description_short: string | null;
    cover_url: string | null;
    price: number;
    price_promotional: number | null;
    isbn: string | null;
    sku: string | null;
    pages: number | null;
    weight_grams: number | null;
    stock: number;
    rating_avg: number;
    rating_count: number;
    is_bestseller: boolean;
    is_new: boolean;
    is_featured: boolean;
    authors: Author | Author[] | null;
    book_images: BookImage[];
  };
  relatedBooks: Array<{
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    price: number;
    price_promotional: number | null;
    rating_avg: number;
    rating_count: number;
    is_new: boolean;
    is_bestseller: boolean;
    authors: { name: string } | null;
  }>;
  reviews: Review[];
}

function StarRating({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              "h-4 w-4",
              s <= Math.round(avg)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{avg.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({count} avaliações)</span>
    </div>
  );
}

function normalizeRelated(b: BookDetailProps["relatedBooks"][number]): BookCardData {
  return {
    id: b.id,
    title: b.title,
    slug: b.slug,
    author: b.authors?.name ?? null,
    coverUrl: b.cover_url,
    price: b.price,
    pricePromotional: b.price_promotional,
    ratingAvg: b.rating_avg,
    ratingCount: b.rating_count,
    isNew: b.is_new,
    isBestseller: b.is_bestseller,
  };
}

export function BookDetail({ book, relatedBooks, reviews }: BookDetailProps) {
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  const hasDiscount = book.price_promotional && book.price_promotional < book.price;
  const discountPct = hasDiscount
    ? Math.round((1 - book.price_promotional! / book.price) * 100)
    : 0;

  const author = Array.isArray(book.authors)
    ? book.authors[0]
    : (book.authors as Author | null);

  const images = [
    ...(book.cover_url ? [{ id: "cover", url: book.cover_url, alt: book.title, position: 0 }] : []),
    ...(book.book_images ?? []).sort((a, b) => a.position - b.position),
  ];

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: book.id,
        type: "book",
        title: book.title,
        slug: book.slug,
        coverUrl: book.cover_url,
        price: book.price_promotional ?? book.price,
      });
    }
    toast.success(`${book.title} adicionado ao carrinho`, {
      description: `${qty} ${qty === 1 ? "unidade" : "unidades"}`,
      action: { label: "Ver carrinho", onClick: () => {} },
    });
  }

  function handleBuyNow() {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: book.id,
        type: "book",
        title: book.title,
        slug: book.slug,
        coverUrl: book.cover_url,
        price: book.price_promotional ?? book.price,
      });
    }
    router.push("/checkout");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/editora" className="hover:text-foreground transition-colors">
            Editora
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          <Link href="/editora/livros" className="hover:text-foreground transition-colors">
            Livros
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          <span className="text-foreground truncate max-w-[200px]">{book.title}</span>
        </nav>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 mb-16">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="relative aspect-[3/4] bg-secondary rounded-2xl overflow-hidden max-w-md mx-auto w-full">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImage]?.url ?? ""}
                  alt={images[selectedImage]?.alt ?? book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
                  <span className="text-6xl text-brand/30">📖</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {hasDiscount && (
                  <Badge className="bg-red-500 hover:bg-red-500 text-white font-bold">
                    -{discountPct}%
                  </Badge>
                )}
                {book.is_new && (
                  <Badge className="bg-brand hover:bg-brand text-white">Lançamento</Badge>
                )}
                {book.is_bestseller && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    + Vendido
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors",
                      selectedImage === i
                        ? "border-brand"
                        : "border-border hover:border-brand/50"
                    )}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? book.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            {/* Author */}
            {author && (
              <Link
                href={`/editora/autores/${author.slug}`}
                className="text-sm text-brand hover:underline font-medium"
              >
                {author.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground leading-tight">
              {book.title}
            </h1>

            {/* Rating */}
            {book.rating_count > 0 && (
              <StarRating avg={book.rating_avg} count={book.rating_count} />
            )}

            <Separator />

            {/* Price */}
            <div className="flex flex-col gap-1">
              {hasDiscount ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-brand">
                      {formatCurrency(book.price_promotional!)}
                    </span>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatCurrency(book.price)}
                    </span>
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                      {discountPct}% off
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Você economiza {formatCurrency(book.price - book.price_promotional!)}
                  </p>
                </>
              ) : (
                <span className="text-3xl font-bold text-foreground">
                  {formatCurrency(book.price)}
                </span>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Em até 3x no cartão sem juros · PIX com 5% de desconto
              </p>
            </div>

            {/* Stock */}
            {book.stock <= 5 && book.stock > 0 && (
              <p className="text-sm text-amber-600 font-medium">
                ⚠️ Apenas {book.stock} {book.stock === 1 ? "unidade" : "unidades"} em estoque
              </p>
            )}

            {/* Quantity + CTA */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-2 hover:bg-secondary transition-colors"
                    disabled={qty <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium min-w-[40px] text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(Math.min(book.stock, qty + 1))}
                    className="px-3 py-2 hover:bg-secondary transition-colors"
                    disabled={qty >= book.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {book.stock} disponíveis
                </span>
              </div>

              <Button
                size="lg"
                className="bg-brand hover:bg-brand-700 text-white font-semibold w-full"
                onClick={handleAddToCart}
                disabled={book.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {book.stock === 0 ? "Sem estoque" : "Adicionar ao carrinho"}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full font-semibold border-brand text-brand hover:bg-brand hover:text-white transition-colors"
                onClick={handleBuyNow}
                disabled={book.stock === 0}
              >
                <Zap className="h-5 w-5 mr-2" />
                Comprar agora
              </Button>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-brand flex-shrink-0" />
                <span>Frete grátis acima de R$200</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-brand flex-shrink-0" />
                <span>Compra 100% segura</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-4 w-4 text-brand flex-shrink-0" />
                <span>Entrega para todo o Brasil</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Award className="h-4 w-4 text-brand flex-shrink-0" />
                <span>Editora certificada Jocum</span>
              </div>
            </div>

            {/* Short description */}
            {book.description_short && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {book.description_short}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Tabs: Description / Details / Reviews */}
        <Tabs defaultValue="descricao" className="mb-16">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto">
            <TabsTrigger
              value="descricao"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent pb-3 px-4"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Descrição
            </TabsTrigger>
            <TabsTrigger
              value="detalhes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent pb-3 px-4"
            >
              <Package className="h-4 w-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger
              value="avaliacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent pb-3 px-4"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Avaliações ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="descricao" className="mt-6">
            {book.description_full ? (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: book.description_full }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">Descrição não disponível.</p>
            )}

            {author?.bio && (
              <div className="mt-8 p-5 bg-secondary rounded-xl flex gap-4">
                {author.photo_url && (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={author.photo_url}
                      alt={author.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm mb-1">Sobre o autor</h3>
                  <p className="text-xs font-medium text-brand mb-2">{author.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{author.bio}</p>
                  <Link
                    href={`/editora/autores/${author.slug}`}
                    className="text-xs text-brand hover:underline mt-2 inline-block"
                  >
                    Ver todos os livros do autor →
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="detalhes" className="mt-6">
            <div className="max-w-sm">
              <dl className="divide-y divide-border">
                {book.isbn && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-muted-foreground">ISBN</dt>
                    <dd className="font-medium">{book.isbn}</dd>
                  </div>
                )}
                {book.pages && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-muted-foreground">Páginas</dt>
                    <dd className="font-medium">{book.pages}</dd>
                  </div>
                )}
                {book.weight_grams && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-muted-foreground">Peso</dt>
                    <dd className="font-medium">{book.weight_grams}g</dd>
                  </div>
                )}
                {author && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-muted-foreground">Autor</dt>
                    <dd className="font-medium">
                      <Link
                        href={`/editora/autores/${author.slug}`}
                        className="text-brand hover:underline"
                      >
                        {author.name}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-muted-foreground">Editora</dt>
                  <dd className="font-medium">Editora Jocum / Jocum Brasil</dd>
                </div>
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="avaliacoes" className="mt-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Ainda não há avaliações para este livro.
                </p>
              </div>
            ) : (
              <>
                {/* Summary */}
                {book.rating_count > 0 && (
                  <div className="flex items-center gap-6 p-5 bg-secondary rounded-xl mb-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{book.rating_avg.toFixed(1)}</p>
                      <StarRating avg={book.rating_avg} count={0} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {book.rating_count} avaliações
                      </p>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r) => r.rating === star).length;
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 mb-1">
                            <span className="text-xs w-3">{star}</span>
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-6">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reviews list */}
                <div className="flex flex-col gap-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-5 border border-border rounded-xl flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "h-3.5 w-3.5",
                              s <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-muted text-muted-foreground/20"
                            )}
                          />
                        ))}
                      </div>
                      {review.title && (
                        <p className="font-semibold text-sm">{review.title}</p>
                      )}
                      {review.body && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {review.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Related books */}
        {relatedBooks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Você também pode gostar
              </h2>
              <Link href="/editora/livros" className="text-sm text-brand hover:underline">
                Ver catálogo completo →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedBooks.map((b) => (
                <BookCard key={b.id} book={normalizeRelated(b)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
