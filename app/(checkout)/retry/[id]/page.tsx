import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RetryPaymentFlow } from "@/components/checkout/retry-payment-flow";

export default async function RetryPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?redirectTo=/checkout/retry/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, customer_email, customer_name, customer_cpf")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!order) notFound();

  if (order.status !== "aguardando_pagamento" || order.payment_status !== "recusado") {
    redirect(`/minha-conta/pedidos/${id}`);
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h1 className="font-heading font-bold text-lg">Nova tentativa de pagamento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pedido #{order.order_number}</p>
        </div>
        <RetryPaymentFlow
          orderId={order.id}
          orderNumber={order.order_number}
          amount={order.total}
          customerEmail={order.customer_email ?? user.email ?? ""}
          customerCpf={(order.customer_cpf ?? "").replace(/\D/g, "")}
          customerName={order.customer_name ?? ""}
        />
      </div>
    </div>
  );
}
