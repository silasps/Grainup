import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateShipping as calculateCorreiosShipping } from "@/lib/correios/client";
import { calculateShipping as calculateMEShipping } from "@/lib/melhor-envio";

// Aceita CORREIOS_CEP_ORIGEM (preferido) ou MELHOR_ENVIO_FROM_CEP (legado)
const FROM_CEP = (process.env.CORREIOS_CEP_ORIGEM ?? process.env.MELHOR_ENVIO_FROM_CEP ?? "").replace(/\D/g, "");

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

    // Tenta Correios direto (requer CORREIOS_CONTRATO ou CORREIOS_CARTAO_POSTAGEM)
    type ShippingResult = { id: string; label: string; price: number; minDays: number; maxDays: number; serviceCode?: string };
    let options: ShippingResult[] = await calculateCorreiosShipping(FROM_CEP, cleanCep, pkg);
    let source = "correios";

    // Fallback: Melhor Envio filtrado só para serviços Correios
    // Ativo enquanto contrato/cartão dos Correios não estiver configurado ou a API falhar
    if (options.length === 0) {
      source = "melhor-envio-fallback";
      const serviceCodeByName: Record<string, string> = {
        "PAC": "03298",
        "SEDEX": "03220",
        "SEDEX 10": "03158",
      };
      // Prazo mínimo real por serviço — usado quando o ME retorna delivery_range nulo
      const mePrazoFallback: Record<string, { min: number; max: number }> = {
        "03298": { min: 5, max: 8 },
        "03220": { min: 1, max: 3 },
        "03158": { min: 1, max: 1 },
      };
      const meOptions = await calculateMEShipping(FROM_CEP, cleanCep, pkg);
      options = meOptions
        .filter((o) => {
          const name = o.label.split(" — ")[0].trim();
          return name in serviceCodeByName;
        })
        .map((o) => {
          const name = o.label.split(" — ")[0].trim();
          const serviceCode = serviceCodeByName[name];
          const fb = mePrazoFallback[serviceCode] ?? { min: 5, max: 8 };
          return {
            ...o,
            label: `${name} — Correios`,
            id: serviceCode,
            serviceCode,
            // Garante que min e max nunca sejam iguais ao valor genérico do ME quando delivery_range é nulo
            minDays: o.minDays > 0 ? o.minDays : fb.min,
            maxDays: o.maxDays > 0 ? o.maxDays : fb.max,
          };
        });
    }

    console.log(`[shipping] source=${source} options=${options.length}`);
    return NextResponse.json({ options, _source: source });
  } catch (err) {
    console.error("[shipping/calculate]", err);
    return NextResponse.json({ error: "Erro ao calcular frete. Tente novamente." }, { status: 500 });
  }
}
