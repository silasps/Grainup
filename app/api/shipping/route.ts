import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateShipping } from "@/lib/melhor-envio";

const FROM_CEP = process.env.MELHOR_ENVIO_FROM_CEP!;

// Fallback dimensions for books without data in the database
const DEFAULT_WEIGHT_G = 300;
const DEFAULT_HEIGHT_CM = 2;
const DEFAULT_WIDTH_CM = 14;
const DEFAULT_LENGTH_CM = 21;

interface RequestItem {
  id: string;
  type: "book" | "combo";
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const { cep, items } = (await req.json()) as { cep: string; items: RequestItem[] };

    if (!cep || !items?.length) {
      return NextResponse.json({ error: "CEP e itens são obrigatórios" }, { status: 400 });
    }

    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const bookIds = items.filter((i) => i.type === "book").map((i) => i.id);

    type BookDimensions = {
      id: string;
      weight_grams: number | null;
      height_cm: number | null;
      width_cm: number | null;
      length_cm: number | null;
    };

    const booksMap: Record<string, BookDimensions> = {};

    if (bookIds.length > 0) {
      const { data } = await supabase
        .from("books")
        .select("id, weight_grams, height_cm, width_cm, length_cm")
        .in("id", bookIds);

      (data ?? []).forEach((b: BookDimensions) => { booksMap[b.id] = b; });
    }

    let totalWeightG = 0;
    let totalHeightCm = 0;
    let maxWidthCm = 0;
    let maxLengthCm = 0;

    for (const item of items) {
      const book = booksMap[item.id];
      const qty = Math.min(item.quantity ?? 1, 50); // cap de segurança de quantidade

      // Limita peso por item a 2kg para lidar com dados inconsistentes no banco
      const weightG = Math.min(book?.weight_grams ?? DEFAULT_WEIGHT_G, 2000);
      const heightCm = Math.min(book?.height_cm ?? DEFAULT_HEIGHT_CM, 30);

      totalWeightG += weightG * qty;
      totalHeightCm += heightCm * qty;
      maxWidthCm = Math.max(maxWidthCm, Math.min(book?.width_cm ?? DEFAULT_WIDTH_CM, 100));
      maxLengthCm = Math.max(maxLengthCm, Math.min(book?.length_cm ?? DEFAULT_LENGTH_CM, 100));
    }

    // Enforce carrier minimums and maximums (PAC: 30kg, SEDEX: 30kg)
    const pkg = {
      weight: Math.min(28, Math.max(0.1, totalWeightG / 1000)),
      height: Math.min(90, Math.max(2, totalHeightCm)),
      width: Math.max(11, maxWidthCm),
      length: Math.max(16, maxLengthCm),
    };

    console.log("[shipping] items:", JSON.stringify(items), "pkg:", JSON.stringify(pkg));

    const options = await calculateShipping(FROM_CEP, cleanCep, pkg);
    return NextResponse.json({ options });
  } catch (err) {
    console.error("[shipping/calculate]", err);
    return NextResponse.json({ error: "Erro ao calcular frete. Tente novamente." }, { status: 500 });
  }
}
