"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Países + DDI + máscara  (0 = dígito obrigatório)
// ---------------------------------------------------------------------------
const COUNTRIES = [
  { code: "BR", ddi: "+55",  flag: "🇧🇷", name: "Brasil",          mask: "(00) 00000-0000"  },
  { code: "US", ddi: "+1",   flag: "🇺🇸", name: "EUA",             mask: "(000) 000-0000"   },
  { code: "CA", ddi: "+1",   flag: "🇨🇦", name: "Canadá",          mask: "(000) 000-0000"   },
  { code: "PT", ddi: "+351", flag: "🇵🇹", name: "Portugal",        mask: "000 000 000"      },
  { code: "GB", ddi: "+44",  flag: "🇬🇧", name: "Reino Unido",     mask: "00000 000000"     },
  { code: "ES", ddi: "+34",  flag: "🇪🇸", name: "Espanha",         mask: "000 000 000"      },
  { code: "DE", ddi: "+49",  flag: "🇩🇪", name: "Alemanha",        mask: "000 00000000"     },
  { code: "FR", ddi: "+33",  flag: "🇫🇷", name: "França",          mask: "00 00 00 00 00"   },
  { code: "IT", ddi: "+39",  flag: "🇮🇹", name: "Itália",          mask: "000 000 0000"     },
  { code: "NL", ddi: "+31",  flag: "🇳🇱", name: "Holanda",         mask: "00 0000 0000"     },
  { code: "AR", ddi: "+54",  flag: "🇦🇷", name: "Argentina",       mask: "(000) 000-0000"   },
  { code: "MX", ddi: "+52",  flag: "🇲🇽", name: "México",          mask: "000 0000 0000"    },
  { code: "CO", ddi: "+57",  flag: "🇨🇴", name: "Colômbia",        mask: "000 000 0000"     },
  { code: "CL", ddi: "+56",  flag: "🇨🇱", name: "Chile",           mask: "0 0000 0000"      },
  { code: "PE", ddi: "+51",  flag: "🇵🇪", name: "Peru",            mask: "000 000 000"      },
  { code: "UY", ddi: "+598", flag: "🇺🇾", name: "Uruguai",         mask: "0000 0000"        },
  { code: "AU", ddi: "+61",  flag: "🇦🇺", name: "Austrália",       mask: "0000 000 000"     },
  { code: "NZ", ddi: "+64",  flag: "🇳🇿", name: "Nova Zelândia",   mask: "00 000 0000"      },
  { code: "ZA", ddi: "+27",  flag: "🇿🇦", name: "África do Sul",   mask: "000 000 0000"     },
  { code: "JP", ddi: "+81",  flag: "🇯🇵", name: "Japão",           mask: "000-0000-0000"    },
  { code: "KR", ddi: "+82",  flag: "🇰🇷", name: "Coreia do Sul",   mask: "000-0000-0000"    },
] as const;

type CountryCode = (typeof COUNTRIES)[number]["code"];

function applyMask(digits: string, mask: string): string {
  let result = "";
  let di = 0;
  for (let i = 0; i < mask.length; i++) {
    if (di >= digits.length) break;
    result += mask[i] === "0" ? digits[di++] : mask[i];
  }
  return result;
}

function maskMaxDigits(mask: string): number {
  return [...mask].filter((c) => c === "0").length;
}
// ---------------------------------------------------------------------------

const schema = z
  .object({
    name: z.string().min(2, "Nome muito curto"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/editora";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>("BR");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const supabase = createClient();

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCountryCode(e.target.value as CountryCode);
    setPhoneDisplay("");
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, maskMaxDigits(country.mask));
    setPhoneDisplay(applyMask(raw, country.mask));
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const digits = phoneDisplay.replace(/\D/g, "");
    const whatsapp = digits ? `${country.ddi}${digits}` : undefined;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.name, whatsapp },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    });

    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }

    if (signUpData.session) {
      toast.success("Conta criada com sucesso!");
      router.push(redirectTo);
      router.refresh();
    } else {
      toast.success("Conta criada!", {
        description: "Verifique seu e-mail para confirmar o cadastro e depois faça login.",
      });
      router.push(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}` },
    });
    if (error) toast.error("Erro ao entrar com Google");
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <Logo href="/editora" imageClassName="h-16" />
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 flex flex-col gap-6 w-full">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-muted-foreground text-sm">Junte-se a nós.</p>
          <h1 className="font-heading text-2xl font-bold text-foreground">Criar conta</h1>
        </div>

        <Button type="button" variant="outline" className="w-full gap-2" onClick={signInWithGoogle}>
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar com Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Seu nome" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="whatsapp">
              WhatsApp{" "}
              <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </Label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={handleCountryChange}
                aria-label="DDI do país"
                className="h-8 shrink-0 rounded-l-lg rounded-r-none border border-r-0 border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer"
                style={{ minWidth: "86px" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.ddi}
                  </option>
                ))}
              </select>
              <Input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                placeholder={country.mask}
                value={phoneDisplay}
                onChange={handlePhoneChange}
                autoComplete="tel-national"
                className="rounded-l-none rounded-r-lg flex-1"
              />
            </div>
            {phoneDisplay && (
              <p className="text-xs text-muted-foreground">
                Número completo: {country.ddi} {phoneDisplay}
              </p>
            )}
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                className="pr-10"
                autoComplete="new-password"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {/* Confirmar senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a senha"
                className="pr-10"
                autoComplete="new-password"
                {...register("confirm")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>

          <Button
            type="submit"
            className="bg-brand hover:bg-brand-700 text-white w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar conta
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-brand hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96 bg-white rounded-2xl border animate-pulse" />}>
      <CadastroForm />
    </Suspense>
  );
}
