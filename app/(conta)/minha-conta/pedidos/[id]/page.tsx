import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ArrowLeft, MapPin, Package, CreditCard } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-100 text-yellow-700",
  pago: "bg-blue-100 text-blue-700",
  separando: "bg-purple-100 text-purple-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregue: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
  reembolsado: "bg-gray-100 text-gray-600",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  boleto: "Boleto",
};

export default async function PedidoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?redirectTo=/minha-conta/pedidos/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(id, title, quantity, unit_price, total_price, books(cover_url))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!order) notFound();

  type OrderItem = { id: string; title: string; quantity: number; unit_price: number; total_price: number; books: { cover_url: string | null } | null };
  type OrderDetail = {
    id: string; order_number: string; status: string; total: number; subtotal: number;
    shipping_cost: number; discount: number; payment_method: string | null;
    payment_status: string | null; tracking_code: string | null; created_at: string;
    shipping_address: Record<string, string> | null;
    order_items: OrderItem[];
  };
  const o = order as unknown as OrderDetail;
  const items = o.order_items ?? [];
  const addr = o.shipping_address;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link href="/minha-conta/pedidos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-lg leading-tight">
            Pedido #{o.order_number}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateTime(o.created_at)}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn("text-xs shrink-0", STATUS_COLORS[o.status])}
        >
          {STATUS_LABELS[o.status] ?? o.status}
        </Badge>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Itens do pedido</h2>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="relative h-14 w-10 rounded overflow-hidden border border-border bg-muted shrink-0">
                {item.books?.cover_url ? (
                  <Image
                    src={item.books.cover_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.quantity}× {formatCurrency(item.unit_price)}
                </p>
              </div>
              <p className="text-sm font-bold text-foreground shrink-0">
                {formatCurrency(item.total_price)}
              </p>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(o.subtotal)}</span>
          </div>
          {o.shipping_cost > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Frete</span>
              <span>{formatCurrency(o.shipping_cost)}</span>
            </div>
          )}
          {o.shipping_cost === 0 && (
            <div className="flex justify-between text-brand">
              <span>Frete</span>
              <span className="font-medium">Grátis</span>
            </div>
          )}
          {o.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Desconto</span>
              <span>-{formatCurrency(o.discount)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(o.total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {addr && (
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Endereço de entrega</h2>
          </div>
          <p className="text-sm text-foreground">
            {addr.street}, {addr.number}
            {addr.complement && ` — ${addr.complement}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {addr.neighborhood} · {addr.city}/{addr.state}
          </p>
          <p className="text-sm text-muted-foreground">CEP {addr.cep}</p>
        </div>
      )}

      {/* Payment */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Pagamento</h2>
        </div>
        <p className="text-sm text-foreground">
          {o.payment_method ? PAYMENT_LABELS[o.payment_method] ?? o.payment_method : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
          {o.payment_status}
        </p>
      </div>

      {o.tracking_code && (
        <div className="bg-brand-50 border border-brand/20 rounded-xl p-5">
          <p className="text-sm font-semibold text-brand mb-0.5">Código de rastreio</p>
          <p className="text-sm font-mono text-foreground">{o.tracking_code}</p>
        </div>
      )}
    </div>
  );
}
