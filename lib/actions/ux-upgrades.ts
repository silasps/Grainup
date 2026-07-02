"use server";

import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";

export type UxUpgradeStatus = "none" | "trialing" | "expired" | "purchased";

export interface UxUpgradeInfo {
  key: string;
  title: string;
  description: string | null;
  price: number;
  trialDays: number;
  status: UxUpgradeStatus;
  trialEndsAt: string | null;
}

function getMpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
}

function isPublicUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.startsWith("https://") || (url.startsWith("http://") && !url.includes("localhost"));
}

function computeStatus(
  trialEndsAt: string | null,
  purchasedAt: string | null
): UxUpgradeStatus {
  if (purchasedAt) return "purchased";
  if (!trialEndsAt) return "none";
  return new Date(trialEndsAt) > new Date() ? "trialing" : "expired";
}

export async function getUxUpgradeStatus(key: string): Promise<UxUpgradeInfo | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upgrade } = await (supabase as any)
    .from("ux_upgrades")
    .select("key, title, description, price, trial_days")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (!upgrade) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activation } = await (supabase as any)
    .from("ux_upgrade_activations")
    .select("trial_ends_at, purchased_at")
    .eq("upgrade_key", key)
    .maybeSingle();

  return {
    key: upgrade.key,
    title: upgrade.title,
    description: upgrade.description,
    price: upgrade.price,
    trialDays: upgrade.trial_days,
    status: computeStatus(activation?.trial_ends_at ?? null, activation?.purchased_at ?? null),
    trialEndsAt: activation?.trial_ends_at ?? null,
  };
}

export async function startUxTrialAction(key: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upgrade } = await (supabase as any)
    .from("ux_upgrades")
    .select("trial_days")
    .eq("key", key)
    .maybeSingle();
  if (!upgrade) return { error: "Upgrade não encontrado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("ux_upgrade_activations")
    .select("id, trial_started_at, purchased_at")
    .eq("upgrade_key", key)
    .maybeSingle();

  if (existing?.purchased_at) return { error: null };
  if (existing?.trial_started_at) return { error: "Trial já foi usado para esse upgrade." };

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + upgrade.trial_days * 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("ux_upgrade_activations").upsert(
    {
      upgrade_key: key,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      frozen_at: null,
      updated_at: now.toISOString(),
    },
    { onConflict: "upgrade_key" }
  );

  return { error: error?.message ?? null };
}

export async function createUxUpgradePaymentAction(
  key: string
): Promise<{ error: string | null; checkoutUrl: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upgrade } = await (supabase as any)
    .from("ux_upgrades")
    .select("key, title, price")
    .eq("key", key)
    .maybeSingle();
  if (!upgrade) return { error: "Upgrade não encontrado.", checkoutUrl: null };

  const preference = new Preference(getMpClient());
  const result = await preference.create({
    body: {
      items: [
        {
          id: upgrade.key,
          title: `GrainUp — ${upgrade.title}`,
          quantity: 1,
          unit_price: upgrade.price,
          currency_id: "BRL",
        },
      ],
      external_reference: `ux:${upgrade.key}`,
      back_urls: isPublicUrl()
        ? {
            success: `${process.env.NEXT_PUBLIC_APP_URL}/admin/editora/leads`,
            failure: `${process.env.NEXT_PUBLIC_APP_URL}/admin/editora/leads`,
          }
        : undefined,
      ...(isPublicUrl() && {
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/ux-upgrade-webhook`,
      }),
    },
  });

  return { error: null, checkoutUrl: result.init_point ?? null };
}
