"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

type Payload = Omit<AnnouncementRow, "id" | "created_at" | "updated_at" | "ticket_number">;

export async function saveAnnouncement(payload: Partial<Payload>, id?: string) {
  const supabase = getAdminClient();

  if (id) {
    const { error } = await supabase.from("announcements").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("announcements").insert(payload as Payload);
    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function deleteAnnouncement(id: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function toggleAnnouncement(id: string, isActive: boolean) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("announcements").update({ is_active: isActive }).eq("id", id);
  return { error: error?.message ?? null };
}
