"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { captureLeadAction } from "@/lib/actions/capture-lead";

const STORAGE_KEY = "newsletter_modal_dismissed_until";
const DISMISS_DAYS = 7;

export function NewsletterModal() {
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const until = localStorage.getItem(STORAGE_KEY);
    if (until && Date.now() < Number(until)) return;
    setVisible(true);
  }, []);

  function dismiss() {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(until));
    setVisible(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Você precisa aceitar para continuar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await captureLeadAction({
        name,
        email,
        phone,
        origin: "newsletter_modal",
        marketingConsent: true,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
        setTimeout(dismiss, 2500);
      }
    });
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 bg-white rounded-full p-1.5 shadow text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Banner superior */}
        <div className="relative bg-brand px-6 pt-8 pb-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
            Editora Jocum
          </p>
          <h2 className="font-heading text-2xl font-bold leading-snug">
            Fique por dentro dos{" "}
            <span className="text-yellow-300">lançamentos</span> e promoções exclusivas
          </h2>
          <p className="text-sm text-white/80 mt-2">
            Cadastre-se e receba em primeira mão as novidades da Editora Jocum.
          </p>
        </div>

        {/* Formulário */}
        <div className="px-6 py-5">
          {done ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <div className="p-3 rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="font-semibold text-foreground">Você está na lista!</p>
              <p className="text-sm text-muted-foreground">
                Em breve você receberá nossas novidades no e-mail.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome"
                required
                disabled={pending}
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                required
                disabled={pending}
              />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp (opcional)"
                disabled={pending}
              />

              <div className="flex items-start gap-2.5 mt-1">
                <Checkbox
                  id="newsletter-consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(!!v)}
                  disabled={pending}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor="newsletter-consent"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                >
                  Ao se inscrever, você concorda em receber promoções e novidades da Editora Jocum.
                </label>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={pending}
                className="w-full bg-brand hover:bg-brand/90 text-white font-semibold"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero receber novidades"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Sem spam. Você pode cancelar a qualquer momento.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
