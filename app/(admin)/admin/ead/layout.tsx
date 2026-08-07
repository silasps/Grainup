import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/actions/get-my-role";

export default async function AdminEadLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getMyRole(user.id);
  if (role !== "super_admin") redirect("/admin/editora");

  return children;
}
