import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookDetail } from "@/components/editora/book-detail";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface BookFull {
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
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  stock: number;
  rating_avg: number;
  rating_count: number;
  is_bestseller: boolean;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  authors: { id: string; name: string; slug: string; bio: string | null; photo_url: string | null } | null;
  book_images: Array<{ id: string; url: string; alt: string | null; position: number }>;
  reviews: Array<{ id: string; rating: number; title: string | null; body: string | null; created_at: string; status: string }>;
}

async function getBook(slug: string): Promise<BookFull | null> {
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select(`
      id, title, slug, description_full, description_short,
      cover_url, price, price_promotional, isbn, sku,
      pages, weight_grams, height_cm, width_cm, length_cm, stock,
      rating_avg, rating_count, is_bestseller, is_new, is_featured, is_active,
      authors(id, name, slug, bio, photo_url),
      book_images(id, url, alt, position),
      reviews(id, rating, title, body, created_at, status)
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  return book as unknown as BookFull | null;
}

async function getRelatedBooks(bookId: string, authorId?: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_new, is_bestseller, authors(name)")
    .eq("is_active", true)
    .neq("id", bookId)
    .limit(4);

  return data ?? [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);

  if (!book) {
    return { title: "Livro não encontrado" };
  }

  return {
    title: `${book.title} — Editora Jocum`,
    description: book.description_short ?? book.description_full?.slice(0, 160),
    openGraph: {
      title: book.title,
      description: book.description_short ?? undefined,
      images: book.cover_url ? [{ url: book.cover_url }] : [],
    },
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const book = await getBook(slug);

  if (!book) notFound();

  const authorId = Array.isArray(book.authors)
    ? book.authors[0]?.id
    : (book.authors as { id: string } | null)?.id;

  const relatedBooks = await getRelatedBooks(book.id, authorId);

  const approvedReviews = (book.reviews ?? []).filter(
    (r: { status: string }) => r.status === "aprovada"
  );

  return (
    <BookDetail
      book={book}
      relatedBooks={relatedBooks}
      reviews={approvedReviews}
    />
  );
}
