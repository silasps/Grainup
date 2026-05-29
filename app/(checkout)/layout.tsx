import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ShieldCheck } from "lucide-react";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="flex h-14 items-center justify-between px-6 border-b border-border bg-white">
        <Logo />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          <span>Compra 100% segura</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border bg-white">
        <Link href="/editora" className="hover:underline">
          ← Voltar para a loja
        </Link>
      </footer>
    </div>
  );
}
