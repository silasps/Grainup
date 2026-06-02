"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@/types/database";

export async function updateTicketStatusAction(ticketId: string, status: TicketStatus) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/editora/sac/${ticketId}`);
  revalidatePath("/admin/editora/sac");
  return { error: null };
}

export async function sendAdminReplyAction(
  ticketId: string,
  subject: string,
  body: string,
  newStatus: TicketStatus | null
) {
  const supabase = await createAdminClient();

  const { error: msgError } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_name: "Editora Jocum",
    sender_id: null,
    body,
    is_admin: true,
  });
  if (msgError) return { error: msgError.message };

  if (newStatus) {
    await supabase
      .from("support_tickets")
      .update({ status: newStatus })
      .eq("id", ticketId);
  }

  // TODO: send email via Resend
  // await sendEmail({ to: customerEmail, subject, html: body });

  revalidatePath(`/admin/editora/sac/${ticketId}`);
  revalidatePath("/admin/editora/sac");
  return { error: null };
}
