import crypto from "crypto";

// Gera URL de embed assinada do Bunny Stream para um vídeo.
// As credenciais vêm do tenant (cada tenant tem sua própria biblioteca).
export function signBunnyEmbedUrl({
  videoId,
  libraryId,
  tokenKey,
  expirySeconds = 7200, // 2 horas
}: {
  videoId: string;
  libraryId: string;
  tokenKey: string;
  expirySeconds?: number;
}): string {
  const expires = Math.floor(Date.now() / 1000) + expirySeconds;
  const hashableBase = tokenKey + videoId + expires;
  const token = crypto.createHash("sha256").update(hashableBase).digest("hex");
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}

// Cria um vídeo no Bunny e retorna o GUID para fazer o upload depois.
// O upload em si é feito direto do browser via TUS (ver admin editor).
export async function createBunnyVideo({
  title,
  libraryId,
  apiKey,
}: {
  title: string;
  libraryId: string;
  apiKey: string;
}): Promise<string> {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    }
  );

  if (!res.ok) {
    throw new Error(`Bunny API error: ${res.status}`);
  }

  const { guid } = await res.json();
  return guid as string;
}

// Busca metadados de um vídeo no Bunny (incluindo duration).
// Chamado após o upload para salvar duration_s na aula.
export async function getBunnyVideoInfo({
  videoId,
  libraryId,
  apiKey,
}: {
  videoId: string;
  libraryId: string;
  apiKey: string;
}): Promise<{ duration: number; status: number }> {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
    { headers: { AccessKey: apiKey } }
  );

  if (!res.ok) {
    throw new Error(`Bunny API error: ${res.status}`);
  }

  const data = await res.json();
  return { duration: data.length ?? 0, status: data.status ?? 0 };
}

// Deleta um vídeo do Bunny. Chamado quando uma aula é deletada.
export async function deleteBunnyVideo({
  videoId,
  libraryId,
  apiKey,
}: {
  videoId: string;
  libraryId: string;
  apiKey: string;
}): Promise<void> {
  await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
    { method: "DELETE", headers: { AccessKey: apiKey } }
  );
}

// Cria uma nova biblioteca Bunny para um tenant novo.
// Chamado no onboarding de tenants.
export async function createBunnyLibrary({
  name,
  apiKey,
}: {
  name: string;
  apiKey: string;
}): Promise<{ id: number; apiKey: string }> {
  const res = await fetch("https://api.bunny.net/videolibrary", {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Name: name }),
  });

  if (!res.ok) {
    throw new Error(`Bunny API error creating library: ${res.status}`);
  }

  const data = await res.json();
  return { id: data.Id, apiKey: data.ApiKey };
}
