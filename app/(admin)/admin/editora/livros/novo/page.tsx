import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "Novo Livro — Admin" };

interface Author { id: string; name: string; bio: string | null; photo_url: string | null }
interface Category { id: string; name: string }

async function getData() {
  const supabase = await createClient();
  const [authorsResult, catsResult] = await Promise.all([
    supabase.from("authors").select("id, name, bio, photo_url").order("name").limit(200),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  return {
    authors: (authorsResult.data ?? []) as unknown as Author[],
    categories: (catsResult.data ?? []) as unknown as Category[],
  };
}

export default async function NewBookPage() {
  const { authors, categories } = await getData();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Novo livro" subtitle="Preencha os dados abaixo" />
      <BookForm book={null} authors={authors} categories={categories} />
    </div>
  );
}
