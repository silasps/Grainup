"use server";
import { sendWelcomeEmail } from "@/lib/email";

export async function sendWelcomeEmailAction(to: string, name: string) {
  await sendWelcomeEmail(to, name);
}
