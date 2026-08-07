import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { getMyRole } from "@/lib/actions/get-my-role";
import { EadHeader } from "@/components/ead/ead-header";

export const dynamic = "force-dynamic";

async function getPageContext() {
  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "localhost";

  const tenant = await getTenantFromHostname(hostname);
  const [settings, supabase] = await Promise.all([
    tenant ? getTenantSettings(tenant.id) : Promise.resolve(null),
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getMyRole(user.id) : null;

  return { tenant, settings, isLoggedIn: !!user, role };
}

export default async function EadLayout({ children }: { children: React.ReactNode }) {
  const { tenant, settings, isLoggedIn, role } = await getPageContext();

  // EAD ainda em testes: acesso restrito ao super_admin por enquanto.
  if (role !== "super_admin") redirect("/");
  const primaryColor = settings?.primary_color ?? "#1B4332";

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      style={{ "--ead-primary": primaryColor, "--ead-primary-light": `${primaryColor}18` } as React.CSSProperties}
    >
      <EadHeader tenant={tenant} settings={settings} isLoggedIn={isLoggedIn} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 mt-auto">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            &copy; {new Date().getFullYear()} {tenant?.name ?? "Plataforma EAD"}.
            {" "}Todos os direitos reservados.
          </span>
          <div className="flex gap-4">
            <a href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="/termos-de-uso" className="hover:text-foreground transition-colors">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
