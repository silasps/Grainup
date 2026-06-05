import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createAdminClient();

  const { data: link } = await supabase
    .from("affiliate_links")
    .select("id, book_id, clicks")
    .eq("code", code)
    .single();

  if (!link) {
    return NextResponse.redirect(new URL("/editora", req.url));
  }

  // Increment clicks (atomic via rpc not needed — acceptable approximation for analytics)
  supabase.from("affiliate_links")
    .update({ clicks: link.clicks + 1 })
    .eq("id", link.id)
    .then(() => {});

  // Determine destination
  let destination = "/editora";
  if (link.book_id) {
    const { data: book } = await supabase
      .from("books")
      .select("slug")
      .eq("id", link.book_id)
      .single();
    if (book?.slug) destination = `/editora/livros/${book.slug}`;
  }

  const response = NextResponse.redirect(new URL(destination, req.url));
  response.cookies.set("aff", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}
