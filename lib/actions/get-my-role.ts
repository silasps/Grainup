"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function getMyRole(userId: string): Promise<UserRole | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.role ?? null;
}
