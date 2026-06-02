import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag, MapPin, UserCircle, ShieldCheck,
  ArrowRight, Package,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-100 text-yellow-700",
  pago: "bg-blue-100 text-blue-700",
  separando: "bg-purple-100 text-purple-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregue: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

type LastOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  order_items: Array<{ id: string; quantity: number; books: { title: string } | null }>;
};

export default async function MinhaConta() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirectTo=/minha-conta");

  const [
    { data: profileData },
    { count: ordersCount },
    { data: roleData },
    { data: lastOrderData },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, cpf").eq("user_id", user.id).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, order_items(id, quantity, books(title))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileData as { full_name: string; phone: string | null; cpf: string | null } | null;
  const lastOrder = lastOrderData as unknown as LastOrder | null;
  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataName =
    typeof metadata.full_name === "string" ? metadata.full_name :
    typeof metadata.name === "string" ? metadata.name :
    null;
  const metadataPhone = typeof metadata.whatsapp === "string" ? metadata.whatsapp : null;
  const metadataCpf = typeof metadata.cpf === "string" ? metadata.cpf : null;

  const adminArea = (() => {
    const role = roleData?.role;
    if (!role) return null;
    if (role === "super_admin" || role === "admin_editora") return { href: "/admin/editora", label: "Painel Admin", desc: "Gerencie livros, pedidos e muito mais." };
    if (role === "admin_ead") return { href: "/admin/ead", label: "Painel EAD", desc: "Acesse o painel do EAD." };
    if (role === "admin_eifol") return { href: "/admin/eifol", label: "Painel EIFOL", desc: "Acesse o painel EIFOL." };
    if (role === "afiliado_jocum" || role === "afiliado_diretor" || role === "lider_jocum") return { href: "/editora/afiliados", label: "Área de Afiliado", desc: "Veja seus links e comissões." };
    return null;
  })();

  const name = profile?.full_name ?? metadataName ?? user.email?.split("@")[0] ?? "Visitante";
  const firstName = name.split(" ")[0];
  const initials = name.split(" ").filter(Boolean).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const profileIncomplete = !(profile?.full_name ?? metadataName) || !(profile?.phone ?? metadataPhone) || !(profile?.cpf ?? metadataCpf);

  const cards = [
    {
      icon: ShoppingBag,
      iconClass: "bg-blue-50 text-blue-600",
      label: "Meus pedidos",
      desc: "Acompanhar entregas e ver histórico de compras",
      href: "/minha-conta/pedidos",
      badge: ordersCount ? `${ordersCount} pedido${ordersCount === 1 ? "" : "s"}` : null,
      warn: false,
    },
    {
      icon: MapPin,
      iconClass: "bg-emerald-50 text-emerald-600",
      label: "Endereços",
      desc: "Gerenciar endereços de entrega e cobrança",
      href: "/minha-conta/enderecos",
      badge: null,
      warn: false,
    },
    {
      icon: UserCircle,
      iconClass: "bg-violet-50 text-violet-600",
      label: "Meus dados",
      desc: "Atualizar nome, e-mail e telefone",
      href: "/minha-conta/dados",
      badge: profileIncomplete ? "Incompleto" : null,
      warn: profileIncomplete,
    },
    {
      icon: ShieldCheck,
      iconClass: "bg-amber-50 text-amber-600",
      label: "Acesso e segurança",
      desc: "Alterar sua senha de acesso",
      href: "/minha-conta/seguranca",
      badge: null,
      warn: false,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome */}
      <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-brand-700 text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm select-none">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-bold text-lg leading-tight">Olá, {firstName}!</h1>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
        <Link
          href="/minha-conta/dados"
          className="text-xs text-brand hover:text-brand-700 font-medium shrink-0 transition-colors"
        >
          Editar perfil
        </Link>
      </div>

      {/* Last order quick access */}
      {lastOrder && (
        <Link
          href={`/minha-conta/pedidos/${lastOrder.id}`}
          className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 hover:shadow-sm hover:border-brand/20 transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-xs text-muted-foreground">Último pedido</p>
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0 h-4", STATUS_COLORS[lastOrder.status])}
              >
                {STATUS_LABELS[lastOrder.status] ?? lastOrder.status}
              </Badge>
            </div>
            <p className="text-sm font-medium truncate">
              {lastOrder.order_items?.[0]?.books?.title ?? `Pedido #${lastOrder.order_number}`}
              {(lastOrder.order_items?.length ?? 0) > 1 && (
                <span className="text-muted-foreground font-normal">
                  {" "}+ {lastOrder.order_items.length - 1} item{lastOrder.order_items.length > 2 ? "s" : ""}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(lastOrder.created_at)} · {formatCurrency(lastOrder.total)}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
        </Link>
      )}

      {/* Account sections */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
          Sua conta
        </p>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-white rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-sm hover:border-brand/25 transition-all"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", card.iconClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {card.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap",
                        card.warn
                          ? "bg-orange-100 text-orange-700"
                          : "bg-brand-50 text-brand-700"
                      )}
                    >
                      {card.badge}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{card.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{card.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin / afiliado highlight */}
      {adminArea && (
        <Link
          href={adminArea.href}
          className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-4 hover:bg-brand-100 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-brand-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-800 text-sm">{adminArea.label}</p>
            <p className="text-xs text-brand-700 mt-0.5">{adminArea.desc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-brand-600 shrink-0" />
        </Link>
      )}
    </div>
  );
}
