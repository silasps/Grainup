"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AfiliadoForm } from "./afiliado-form";

interface Props {
  label?: string;
  variant?: "brand" | "white";
}

export function AfiliadoCTA({ label = "Quero participar", variant = "brand" }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const btnClass = variant === "white"
    ? "bg-white text-brand hover:bg-white/90 font-semibold px-8 h-12"
    : "bg-brand hover:bg-brand-700 text-white font-semibold px-8 h-12";

  return (
    <>
      <Button size="lg" className={btnClass} onClick={() => setOpen(true)}>
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              {user ? "Inscrição no programa de afiliados" : "Crie sua conta para participar"}
            </DialogTitle>
          </DialogHeader>

          {/* Não logado */}
          {user === null && (
            <div className="flex flex-col items-center text-center gap-6 py-6">
              <div className="bg-brand-50 rounded-full p-5">
                <UserPlus className="h-10 w-10 text-brand" />
              </div>
              <div>
                <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                  Para participar do programa de afiliados você precisa de uma conta na plataforma.
                  É rápido e gratuito — depois é só voltar aqui e preencher a inscrição.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Button
                  className="flex-1 bg-brand hover:bg-brand-700 text-white"
                  onClick={() => {
                    window.location.href = "/auth/cadastro?redirectTo=/editora/afiliados";
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar conta
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.location.href = "/auth/login?redirectTo=/editora/afiliados";
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Já tenho conta
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Após o login, o formulário abrirá automaticamente.
              </p>
            </div>
          )}

          {/* Logado → formulário direto */}
          {user && <AfiliadoForm />}
        </DialogContent>
      </Dialog>
    </>
  );
}
