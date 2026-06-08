import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { TrackingCodeForm } from "@/components/admin/tracking-code-form";

export const metadata: Metadata = { title: "Detalhe do Pedido — Admin" };

const STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pago: "bg-blue-100 text-blue-700 border-blue-200",
  separando: "bg-purple-100 text-purple-700 border-purple-200",
  enviado: "bg-indigo-100 text-indigo-700 border-indigo-200",
  entregue: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

interface ComboBookItem {
  quantity: number;
  books: {
    title: string;
    cover_url: string | null;
    sku: string | null;
  } | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  title: string;
  book_id: string | null;
  combo_id: string | null;
  books: {
    title: string;
    cover_url: string | null;
    sku: string | null;
  } | null;
  combos: {
    name: string;
    combo_items: ComboBookItem[];
  } | null;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  customer_name: string;
  customer_email: string;
  shipping_address: Record<string, string> | null;
  tracking_code: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

async function getOrder(id: string): Promise<OrderDetail | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, payment_status, payment_method,
       subtotal, discount, shipping_cost, total,
       customer_name, customer_email, shipping_address, tracking_code,
       created_at, updated_at,
       order_items(id, quantity, unit_price, total_price, title, book_id, combo_id, books(title, cover_url, sku), combos(name, combo_items(quantity, books(title, cover_url, sku))))`
    )
    .eq("id", id)
    .single();
  return data as unknown as OrderDetail | null;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const addr = order.shipping_address;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title={`Pedido #${order.order_number}`}
        subtitle={formatDateTime(order.created_at)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <Button variant="ghost" size="sm" asChild className="w-fit -mt-2">
          <Link href="/admin/editora/pedidos">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar aos pedidos
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: items + totals */}
          <div className="lg:col-span-2 space-y-5">
            {/* Items */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Itens do pedido</h3>
              </div>
              <div className="divide-y divide-border">
                {(order.order_items ?? []).length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">Sem itens registrados.</p>
                ) : (
                  (order.order_items ?? []).map((item) => {
                    const isCombo = !!item.combo_id;
                    const comboBooks = item.combos?.combo_items ?? [];
                    return (
                      <div key={item.id} className="px-5 py-4 space-y-3">
                        {/* Linha principal do item */}
                        <div className="flex items-center gap-4">
                          <div className="relative h-14 w-10 overflow-hidden rounded border border-border bg-secondary flex-shrink-0">
                            {item.books?.cover_url ? (
                              <Image
                                src={item.books.cover_url}
                                alt={item.books.title || item.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : isCombo ? (
                              <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground font-medium leading-tight text-center p-1">KIT</div>
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{item.title}</p>
                              {isCombo && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">Kit</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x {formatCurrency(item.unit_price)}
                              {item.books?.sku && <span className="ml-2 font-mono">SKU: {item.books.sku}</span>}
                            </p>
                          </div>
                          <p className="font-semibold text-sm">{formatCurrency(item.total_price)}</p>
                        </div>

                        {/* Componentes do kit */}
                        {isCombo && comboBooks.length > 0 && (
                          <div className="ml-14 border-l-2 border-violet-200 pl-3 space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Livros incluídos no kit</p>
                            {comboBooks.map((ci, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="relative h-10 w-7 overflow-hidden rounded border border-border bg-secondary flex-shrink-0">
                                  {ci.books?.cover_url && (
                                    <Image
                                      src={ci.books.cover_url}
                                      alt={ci.books.title ?? ""}
                                      fill
                                      sizes="28px"
                                      className="object-cover"
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{ci.books?.title ?? "—"}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Qtd: {ci.quantity * item.quantity}
                                    {ci.books?.sku && <span className="ml-2 font-mono">SKU: {ci.books.sku}</span>}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {/* Totals */}
              <div className="border-t border-border px-5 py-4 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto</span>
                    <span>−{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Frete</span>
                  <span>{order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : "Grátis"}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: customer + status */}
          <div className="space-y-5">
            {/* Status card */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Status</h3>
              <Badge
                variant="outline"
                className={cn("text-xs w-fit", STATUS_COLORS[order.status])}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
              <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <p className="font-medium capitalize">
                    {order.payment_method?.replace("_", " ") ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status pagto</p>
                  <p className="font-medium capitalize">{order.payment_status ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Customer card */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-2">
              <h3 className="text-sm font-semibold">Cliente</h3>
              <p className="text-sm font-medium">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.customer_email}</p>
            </div>

            {/* Address card */}
            {addr && (
              <div className="bg-white rounded-xl border border-border p-5 space-y-1">
                <h3 className="text-sm font-semibold">Endereço de entrega</h3>
                <p className="text-sm text-muted-foreground">{addr.full_name}</p>
                <p className="text-sm text-muted-foreground">{addr.street}</p>
                <p className="text-sm text-muted-foreground">
                  {addr.city} — {addr.state} · {addr.zip_code}
                </p>
              </div>
            )}

            {/* Tracking code */}
            <TrackingCodeForm orderId={order.id} initialCode={order.tracking_code} />
          </div>
        </div>
      </main>
    </div>
  );
}
