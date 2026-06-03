const BASE = process.env.MELHOR_ENVIO_SANDBOX === "true"
  ? "https://sandbox.melhorenvio.com.br"
  : "https://melhorenvio.com.br";

const USER_AGENT = "GrainUp/1.0 (grainupp@gmail.com)";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.MELHOR_ENVIO_CLIENT_ID,
      client_secret: process.env.MELHOR_ENVIO_CLIENT_SECRET,
      scope: "shipping-calculate",
    }),
  });

  if (!res.ok) {
    throw new Error(`Melhor Envio auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
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
  const token = await getToken();

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
