import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="flex h-16 items-center px-6 border-b border-border bg-white">
        <Logo />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
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
