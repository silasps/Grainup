import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "Editar Livro — Admin" };

interface Author { id: string; name: string; bio: string | null; photo_url: string | null }
interface Category { id: string; name: string }
interface BookData {
  id: string;
  title: string;
  slug: string;
  author_id: string | null;
  category_id: string | null;
  cover_url: string | null;
  description_short: string | null;
  description_full: string | null;
  price: number;
  price_promotional: number | null;
  stock: number;
  weight_grams: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  pages: number | null;
  isbn: string | null;
  sku: string | null;
  publisher: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
}

async function getData(id: string) {
  const supabase = await createClient();
  const [bookResult, authorsResult, catsResult] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).single(),
    supabase.from("authors").select("id, name, bio, photo_url").order("name").limit(200),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  return {
    book: bookResult.data as unknown as BookData | null,
    authors: (authorsResult.data ?? []) as unknown as Author[],
    categories: (catsResult.data ?? []) as unknown as Category[],
  };
}

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { book, authors, categories } = await getData(id);
  if (!book) notFound();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Editar livro" subtitle={book.title} />
      <BookForm book={book} authors={authors} categories={categories} />
    </div>
  );
}
