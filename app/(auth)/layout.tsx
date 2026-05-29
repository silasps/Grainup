import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <div className="px-4 pt-4">
        <Link
          href="/editora"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à loja
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border bg-white">
        <Link href="/editora/politica-de-privacidade" className="hover:underline">
          Política de Privacidade
        </Link>
        {" · "}
        <Link href="/editora/termos-de-uso" className="hover:underline">
          Termos de Uso
        </Link>
      </footer>
    </div>
  );
}
