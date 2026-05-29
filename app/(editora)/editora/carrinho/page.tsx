import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CartPageClient } from "@/components/editora/cart-page-client";
import { CartRecommendations } from "@/components/editora/cart-recommendations";

export const metadata: Metadata = {
  title: "Meu Carrinho",
};

type BookRec = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
};

async function getRecommendedBooks(): Promise<BookRec[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, is_bestseller, rating_avg")
    .eq("is_active", true)
    .order("is_bestseller", { ascending: false })
    .order("rating_avg", { ascending: false })
    .limit(8);
  return (data as BookRec[] | null) ?? [];
}

export default async function CarrinhoPage() {
  const recommended = await getRecommendedBooks();

  return (
    <div className="bg-secondary/40 min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-heading font-bold text-2xl mb-6">Meu Carrinho</h1>

        <CartPageClient />

        <CartRecommendations books={recommended} />
      </div>
    </div>
  );
}
