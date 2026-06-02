"use server";

import { createClient } from "@/lib/supabase/server";

export type BookEventType = "view" | "add_to_cart" | "purchase";

export async function trackBookEvent(
  bookId: string,
  eventType: BookEventType,
  sessionId?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("book_events").insert({
      book_id: bookId,
      event_type: eventType,
      session_id: sessionId ?? null,
      user_id: user?.id ?? null,
    });
  } catch {
    // Tracking nunca deve quebrar o fluxo principal
  }
}
