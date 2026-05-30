import { AdminSidebar } from "@/components/admin/sidebar";
import { MobileMenuProvider } from "@/components/admin/mobile-menu-context";
import { MobileOverlay } from "@/components/admin/mobile-overlay";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-secondary">
        <AdminSidebar />
        <MobileOverlay />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </div>
      </div>
    </MobileMenuProvider>
  );
}
