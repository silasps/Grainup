"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createBlingProduct } from "@/lib/bling/client";

type ComboInsert = Database["public"]["Tables"]["combos"]["Insert"];
type ComboItemInsert = Database["public"]["Tables"]["combo_items"]["Insert"];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export async function saveCombo(
  data: ComboInsert,
  items: Pick<ComboItemInsert, "book_id" | "quantity">[],
  id?: string
) {
  const supabase = getAdminClient();

  let comboId = id;

  if (id) {
    const { error } = await supabase.from("combos").update(data).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data: inserted, error } = await supabase
      .from("combos")
      .insert(data)
      .select("id")
      .single();
    if (error) return { error: error.message };
    comboId = inserted.id;
  }

  await supabase.from("combo_items").delete().eq("combo_id", comboId!);
  if (items.length > 0) {
    const { error } = await supabase
      .from("combo_items")
      .insert(items.map((item) => ({ combo_id: comboId!, ...item })));
    if (error) return { error: error.message };
  }

  // Push para Bling se novo combo (sem bling_product_id)
  if (!id && comboId) {
    const { data: combo } = await supabase.from("combos").select("id, name, bling_product_id").eq("id", comboId).single();
    if (combo && !(combo as any).bling_product_id) {
      createBlingProduct({ nome: combo.name, tipo: "K", situacao: "A" })
        .then((result) => supabase.from("combos").update({ bling_product_id: result.id } as any).eq("id", comboId!))
        .catch((e) => console.error("[Bling combo]", e));
    }
  }

  return { error: null };
}

export async function deleteCombo(id: string) {
  const supabase = getAdminClient();
  await supabase.from("combo_items").delete().eq("combo_id", id);
  const { error } = await supabase.from("combos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function toggleComboActive(id: string, isActive: boolean) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("combos")
    .update({ is_active: isActive })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function toggleComboFeatured(id: string, isFeatured: boolean) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("combos")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  return { error: error?.message ?? null };
}

const COMBOS_SEED: ComboInsert[] = [
  {
    name: "Kit Missões Mundiais",
    slug: "kit-missoes-mundiais",
    description: "3 livros essenciais para quem quer entender e viver a missão de Deus no mundo.",
    image_url: null,
    price_original: 135.00,
    price_promotional: 105.00,
    is_active: true, discount_type: "fixed" as const,
    is_featured: true,
  },
  {
    name: "Kit Liderança Cristã",
    slug: "kit-lideranca-crista",
    description: "Uma coleção cuidadosa para desenvolver líderes servidores e íntegros.",
    image_url: null,
    price_original: 120.00,
    price_promotional: 95.00,
    is_active: true, discount_type: "fixed" as const,
    is_featured: false,
  },
  {
    name: "Kit Família",
    slug: "kit-familia",
    description: "Livros práticos que fortalecem o casamento, a parentalidade e a família cristã.",
    image_url: null,
    price_original: 105.00,
    price_promotional: 85.00,
    is_active: true, discount_type: "fixed" as const,
    is_featured: false,
  },
  {
    name: "Kit Vida de Oração",
    slug: "kit-vida-de-oracao",
    description: "Para quem quer aprofundar sua intimidade com Deus e entender o poder da oração.",
    image_url: null,
    price_original: 105.00,
    price_promotional: 83.00,
    is_active: true, discount_type: "fixed" as const,
    is_featured: false,
  },
];

export async function seedDefaultCombos() {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("combos")
    .upsert(COMBOS_SEED, { onConflict: "slug", ignoreDuplicates: true });
  return { error: error?.message ?? null };
}
