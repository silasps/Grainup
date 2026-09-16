import { createAdminClient } from "@/lib/supabase/server";

export type BlingLogAction =
  | "push_attempt"
  | "push_skipped"
  | "push_success"
  | "push_nfe_failed"
  | "push_failed"
  | "reset_blocked"
  | "reset_ok"
  | "sync_fallback_create";

export type BlingLogSource = "cron_auto_send" | "manual_admin";

/**
 * Registra uma ação de envio/desvínculo ao Bling em bling_action_log — ver
 * supabase/migrations/046_bling_action_log.sql pro porquê. Nunca deve derrubar o fluxo
 * principal: falha ao logar é só um console.error, não propaga.
 */
export async function logBlingAction(params: {
  orderId: string | null;
  action: BlingLogAction;
  source: BlingLogSource;
  actor?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    const supabase = await createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("bling_action_log").insert({
      order_id: params.orderId,
      action: params.action,
      source: params.source,
      actor: params.actor ?? null,
      detail: params.detail ?? null,
    });
  } catch (err) {
    console.error("[bling_action_log] falha ao registrar:", err);
  }
}
