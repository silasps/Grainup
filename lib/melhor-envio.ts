const BASE = process.env.MELHOR_ENVIO_SANDBOX === "true"
  ? "https://sandbox.melhorenvio.com.br"
  : "https://melhorenvio.com.br";

const USER_AGENT = "GrainUp/1.0 (grainupp@gmail.com)";

function getToken(): string {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) throw new Error("MELHOR_ENVIO_TOKEN não configurado");
  return token;
}

export interface ShippingPackage {
  weight: number; // kg
  height: number; // cm
  width: number;  // cm
  length: number; // cm
}

export interface ShippingOption {
  id: string;
  label: string;
  price: number;
  minDays: number;
  maxDays: number;
}

export async function calculateShipping(
  fromCep: string,
  toCep: string,
  pkg: ShippingPackage
): Promise<ShippingOption[]> {
  const token = getToken();

  const res = await fetch(`${BASE}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      from: { postal_code: fromCep },
      to: { postal_code: toCep },
      package: pkg,
      options: {
        insurance_value: 0,
        receipt: false,
        own_hand: false,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Melhor Envio calculate failed: ${res.status}`);
  }

  const data = await res.json();

  console.log("[ME raw]", JSON.stringify(data));

  return (data as Record<string, unknown>[])
    .filter((opt) => !opt.error && opt.price)
    .map((opt) => ({
      id: String(opt.id),
      label: `${opt.name} — ${(opt.company as Record<string, unknown>).name}`,
      price: parseFloat(opt.price as string),
      minDays: (opt.delivery_range as Record<string, number>)?.min ?? (opt.delivery_time as number),
      maxDays: (opt.delivery_range as Record<string, number>)?.max ?? (opt.delivery_time as number),
    }))
    .sort((a, b) => a.price - b.price);
}
