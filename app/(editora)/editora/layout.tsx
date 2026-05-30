import type { Metadata } from "next";
import { EditoraHeader } from "@/components/editora/header";
import { EditoraFooter } from "@/components/editora/footer";
import { PromoOverlay } from "@/components/editora/promo-overlay";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { CookieBanner } from "@/components/shared/cookie-banner";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    default: "Editora Jocum",
    template: "%s | Editora Jocum",
  },
  description: "Livros que transformam vidas. Conheça o catálogo completo da Editora Jocum.",
};

type AdminArea = { href: string; label: string };

function roleToAdminArea(role: string): AdminArea | null {
  if (role === "super_admin" || role === "admin_editora") return { href: "/admin/editora", label: "Painel Admin" };
  if (role === "admin_ead") return { href: "/admin/ead", label: "Painel EAD" };
  if (role === "admin_eifol") return { href: "/admin/eifol", label: "Painel EIFOL" };
  if (role === "afiliado_jocum" || role === "afiliado_diretor" || role === "lider_jocum") return { href: "/editora/afiliados", label: "Área de Afiliado" };
  return null;
}

async function getActiveAnnouncement() {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

async function getUserAdminArea(): Promise<AdminArea | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1).single();
    if (!data) return null;
    return roleToAdminArea(data.role);
  } catch {
    return null;
  }
}

export default async function EditoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [announcement, adminArea] = await Promise.all([getActiveAnnouncement(), getUserAdminArea()]);

  return (
    <>
      <EditoraHeader adminArea={adminArea} />
      <main className="flex-1">{children}</main>
      <EditoraFooter />
      <WhatsAppButton phone="5541991435610" enabled />
      <CookieBanner />
      <PromoOverlay announcement={announcement} />
    </>
  );
}
