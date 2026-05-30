"use client";

import { Bell, ExternalLink, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMobileMenu } from "@/components/admin/mobile-menu-context";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toggle } = useMobileMenu();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between px-4 md:px-6 border-b border-border bg-white">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggle} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading font-semibold text-foreground text-base leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/editora"
          target="_blank"
          rel="noopener noreferrer"
          suppressHydrationWarning
          className="hidden sm:inline-flex items-center gap-1.5 text-xs h-7 px-2.5 rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted hover:text-foreground transition-all font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver loja
        </a>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-secondary transition-colors">
                <User className="h-4 w-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Admin GrainUp</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/admin/editora/configuracoes")}>
                Configurações
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
