"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, XCircle, CheckCircle2, X, Info, Store, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { createClient } from "@/lib/supabase/client";
import { getMyRole } from "@/lib/actions/get-my-role";
import type { UserRole } from "@/types/database";

function roleToAdminArea(role: UserRole | string): { href: string; label: string } | null {
  if (role === "super_admin" || role === "admin_editora") return { href: "/admin/editora", label: "Painel Admin" };
  if (role === "admin_ead") return { href: "/admin/ead", label: "Painel EAD" };
  if (role === "admin_eifol") return { href: "/admin/eifol", label: "Painel EIFOL" };
  if (role === "afiliado_jocum" || role === "afiliado_diretor" || role === "afiliado_geral" || role === "lider_jocum") return { href: "/afiliados/painel", label: "Área de Afiliado" };
  return null;
}

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/editora";
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [areaCard, setAreaCard] = useState<{ href: string; label: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setAlert(null);
    setIsPending(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setIsPending(false);
      setAlert({ type: "error", message: "E-mail ou senha incorretos. Verifique seus dados e tente novamente." });
      return;
    }

    const userId = authData.user?.id;
    if (userId) {
      const role = await getMyRole(userId);
      if (role) {
        const area = roleToAdminArea(role);
        if (area && (redirectTo === "/editora" || redirectTo.includes("afiliados"))) {
          setIsPending(false);
          setAreaCard(area);
          return;
        }
      }
    }

    window.location.href = redirectTo;
  }

  function signInWithGoogle() {
    setAlert({ type: "info", message: "Login com Google não está disponível ainda." });
  }

  if (areaCard) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <Logo href="/editora" imageClassName="h-16" />
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 flex flex-col gap-6 w-full">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-muted-foreground text-sm">Login realizado com sucesso!</p>
            <h1 className="font-heading text-2xl font-bold text-foreground">Para onde ir?</h1>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { window.location.href = "/editora"; }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-brand hover:bg-brand/5 transition-colors text-left group"
            >
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary group-hover:bg-brand/10 transition-colors">
                <Store className="h-5 w-5 text-muted-foreground group-hover:text-brand transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">Acessar a Loja</p>
                <p className="text-xs text-muted-foreground">Navegue pelo catálogo de livros</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            <button
              onClick={() => { window.location.href = areaCard.href; }}
              className="flex items-center gap-4 p-4 rounded-xl border border-brand-100 bg-brand-50 hover:bg-brand-100 transition-colors text-left group"
            >
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 group-hover:bg-brand-200 transition-colors">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-800 text-sm">{areaCard.label}</p>
                <p className="text-xs text-brand-600">Sua área de acesso especial</p>
              </div>
              <ChevronRight className="h-4 w-4 text-brand-500 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <Logo href="/editora" imageClassName="h-16" />
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 flex flex-col gap-6 w-full">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-muted-foreground text-sm">Bem-vindo de volta.</p>
          <h1 className="font-heading text-2xl font-bold text-foreground">Entrar</h1>
        </div>

        {alert && (
          <div
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              alert.type === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : alert.type === "success"
                ? "border-green-500/40 bg-green-50 text-green-700"
                : "border-blue-400/40 bg-blue-50 text-blue-700"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {alert.type === "error" && <XCircle className="h-4 w-4" />}
              {alert.type === "success" && <CheckCircle2 className="h-4 w-4" />}
              {alert.type === "info" && <Info className="h-4 w-4" />}
            </span>
            <span className="flex-1">{alert.message}</span>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={signInWithGoogle}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuar com Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link
                href="/auth/recuperar-senha"
                className="text-xs text-brand hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="bg-brand hover:bg-brand-700 text-white w-full"
            disabled={isSubmitting || isPending}
          >
            {(isSubmitting || isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPending && !isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link
            href={`/auth/cadastro?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="text-brand hover:underline font-medium"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96 bg-white rounded-2xl border animate-pulse" />}>
      <LoginForm />
    </Suspense>
  );
}
