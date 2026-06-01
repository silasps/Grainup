"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

interface CreateTicketInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderId: string | null;
  category: string;
  subject: string;
  message: string;
}

export async function createContactTicketAction(input: CreateTicketInput) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  const supabase = await createAdminClient();

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      order_id: input.orderId,
      category: input.category,
      subject: input.subject,
      status: "novo",
      user_id: user?.id ?? null,
    })
    .select("id, ticket_number")
    .single();

  if (ticketErr || !ticket) {
    return { error: ticketErr?.message ?? "Erro ao criar chamado." };
  }

  const { id: ticketId, ticket_number } = ticket as { id: string; ticket_number: string };

  await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_name: input.customerName,
    sender_id: user?.id ?? null,
    body: input.message,
    is_admin: false,
  });

  return { error: null, ticketNumber: ticket_number };
}
