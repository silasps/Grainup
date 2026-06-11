import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/minha-conta";

  if (code) {
    const cookieStore = await cookies();
    // Create the redirect response first so session cookies are written directly onto it.
    // Using cookieStore.set() here would write to an internal buffer that doesn't carry
    // over to a new NextResponse object, causing the session to be lost after the redirect.
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata as Record<string, unknown>;
        const fullName =
          typeof metadata.full_name === "string" ? metadata.full_name :
          typeof metadata.name === "string" ? metadata.name :
          null;
        const phone = typeof metadata.whatsapp === "string" ? metadata.whatsapp : null;
        const cpf = typeof metadata.cpf === "string" ? metadata.cpf.replace(/\D/g, "") : null;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, phone, cpf, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        const isNewUser = !profile;
        if (isNewUser || (!profile?.full_name && fullName) || (!profile?.phone && phone) || (!profile?.cpf && cpf)) {
          await supabase.from("profiles").upsert(
            {
              id: profile?.id ?? crypto.randomUUID(),
              user_id: user.id,
              full_name: profile?.full_name ?? fullName,
              phone: profile?.phone ?? phone,
              cpf: profile?.cpf ?? cpf,
              avatar_url: profile?.avatar_url ?? null,
            },
            { onConflict: "user_id" }
          );
        }
        if (isNewUser && user.email) {
          const name = fullName ?? user.email.split("@")[0];
          sendWelcomeEmail(user.email, name).catch(console.error);
        }
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
