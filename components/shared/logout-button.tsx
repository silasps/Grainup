"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  variant?: "sidebar" | "menu-item";
}

export function LogoutButton({ className, variant = "sidebar" }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.push("/auth/login");
    router.refresh();
  }

  if (variant === "menu-item") {
    return (
      <button
        onClick={handleLogout}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-md w-full transition-colors",
          className
        )}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "flex items-center justify-between px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors w-full",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        Sair
      </div>
    </button>
  );
}
