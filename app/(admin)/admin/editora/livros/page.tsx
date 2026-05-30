import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { Plus, Pencil, Eye } from "lucide-react";

export const metadata: Metadata = { title: "Livros — Admin Editora Jocum" };
export const revalidate = 60;

interface BookRow {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  stock: number;
  is_active: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  sales_count: number;
  rating_avg: number;
  rating_count: number;
  authors: { name: string } | null;
}

async function getBooks(): Promise<BookRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, stock, is_active, is_bestseller, is_new, sales_count, rating_avg, rating_count, authors(name)")
    .order("title")
    .limit(100);
  return (data ?? []) as unknown as BookRow[];
}

export default async function AdminLivrosPage() {
  const books = await getBooks();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Livros"
        subtitle={`${books.length} livros cadastrados`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{books.filter((b) => b.is_active).length}</span> ativos ·{" "}
              <span className="font-medium text-foreground">{books.filter((b) => b.is_bestseller).length}</span> bestsellers ·{" "}
              <span className="font-medium text-foreground">{books.filter((b) => b.is_new).length}</span> lançamentos
            </div>
          </div>
          <Button className="bg-brand hover:bg-brand-700 text-white gap-2" asChild>
            <Link href="/admin/editora/livros/novo">
              <Plus className="h-4 w-4" />
              Novo livro
            </Link>
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Livro</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Autor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Preço</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Estoque</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Vendas</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {books.map((book) => {
                  const author = book.authors as { name: string } | null;
                  const hasDiscount = book.price_promotional && book.price_promotional < book.price;
                  return (
                    <tr key={book.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                            {book.cover_url ? (
                              <Image
                                src={book.cover_url}
                                alt={book.title}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px]">📖</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground line-clamp-1 max-w-[200px]">
                              {book.title}
                            </p>
                            <div className="flex gap-1 mt-0.5">
                              {book.is_bestseller && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700">
                                  Top
                                </Badge>
                              )}
                              {book.is_new && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-brand-50 text-brand">
                                  Novo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                        {author?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          {hasDiscount ? (
                            <>
                              <p className="font-semibold text-brand text-xs">
                                {formatCurrency(book.price_promotional!)}
                              </p>
                              <p className="text-[10px] text-muted-foreground line-through">
                                {formatCurrency(book.price)}
                              </p>
                            </>
                          ) : (
                            <p className="font-semibold text-foreground text-xs">
                              {formatCurrency(book.price)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className={book.stock <= 5 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                          {book.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">
                        {book.sales_count ?? 0}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={book.is_active ? "default" : "secondary"}
                          className={book.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs" : "text-xs"}
                        >
                          {book.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/editora/livros/${book.slug}`} target="_blank">
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/admin/editora/livros/${book.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
