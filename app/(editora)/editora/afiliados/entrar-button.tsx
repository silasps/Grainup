import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function EntrarButton() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return (
    <Button
      size="lg"
      variant="outline"
      className="bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white hover:border-white"
      asChild
    >
      <Link href="/afiliados/painel">Já sou afiliado — entrar</Link>
    </Button>
  );
}
