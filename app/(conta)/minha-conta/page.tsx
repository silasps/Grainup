import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, MapPin, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function MinhaConta() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirectTo=/minha-conta");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();
  const profile = profileData as { full_name: string; phone: string | null } | null;

  const { count: ordersCount } = await supabase
    .from("orders")
    .select("id", { count: "exact" })
    .eq("user_id", user.id);

  const name = profile?.full_name ?? user.email?.split("@")[0] ?? "Visitante";

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="font-heading font-bold text-xl text-foreground mb-1">
          Olá, {name}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: ShoppingBag,
            label: "Meus pedidos",
            value: ordersCount ?? 0,
            unit: "pedidos",
            href: "/minha-conta/pedidos",
          },
          {
            icon: MapPin,
            label: "Endereços",
            value: 0,
            unit: "salvos",
            href: "/minha-conta/enderecos",
          },
          {
            icon: Star,
            label: "Avaliações",
            value: 0,
            unit: "feitas",
            href: "#",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">
                  {item.label}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-brand mt-auto">
                Ver todos <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* CTA */}
      <div className="bg-brand-50 border border-brand/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground text-sm">Explore nosso catálogo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mais de 200 títulos sobre missões, liderança, família e mais.
          </p>
        </div>
        <Button className="bg-brand hover:bg-brand-700 text-white flex-shrink-0" size="sm" asChild>
          <Link href="/editora/livros">Ver livros</Link>
        </Button>
      </div>
    </div>
  );
}
