import { Logo } from "@/components/shared/logo";
import { ShieldCheck } from "lucide-react";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <header className="flex h-14 items-center justify-between px-6 border-b border-border bg-white flex-shrink-0">
        <Logo />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          <span>Compra 100% segura</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}
