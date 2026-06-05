import { AdminSidebar } from "@/components/admin/sidebar";
import { MobileMenuProvider } from "@/components/admin/mobile-menu-context";
import { MobileOverlay } from "@/components/admin/mobile-overlay";
import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/actions/get-my-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getMyRole(user.id) : null;

  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-secondary">
        <AdminSidebar superAdmin={role === "super_admin"} />
        <MobileOverlay />
        <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
          {children}
        </div>
      </div>
    </MobileMenuProvider>
  );
}
