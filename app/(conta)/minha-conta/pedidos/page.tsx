import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ShoppingBag, ChevronLeft } from "lucide-react";

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

export default async function MeusOrdensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirectTo=/minha-conta/pedidos");

  const { data: rawOrders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, order_items(id, quantity, books(title, cover_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  type OrderWithItems = {
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
    order_items: Array<{
      id: string;
      quantity: number;
      books: { title: string; cover_url: string | null } | null;
    }>;
  };
  const orders = (rawOrders ?? []) as unknown as OrderWithItems[];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-border p-5">
        <Link
          href="/minha-conta"
          className="md:hidden inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Minha conta
        </Link>
        <h1 className="font-heading font-bold text-lg">Meus pedidos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {orders?.length ?? 0} pedidos realizados
        </p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center flex flex-col items-center gap-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-semibold text-foreground">Nenhum pedido ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Explore nosso catálogo e faça seu primeiro pedido!
            </p>
          </div>
          <Button className="bg-brand hover:bg-brand-700 text-white" asChild>
            <Link href="/editora/livros">Ver livros</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const items = order.order_items ?? [];
            const firstBook = items[0]?.books;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-border p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">Pedido #{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", STATUS_COLORS[order.status])}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground mb-3">
                  {firstBook && (
                    <p className="line-clamp-1">{firstBook.title}</p>
                  )}
                  {items.length > 1 && (
                    <p className="text-xs">+ {items.length - 1} item(ns)</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{formatCurrency(order.total)}</p>
                  <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                    <Link href={`/minha-conta/pedidos/${order.id}`}>
                      Ver detalhes
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
