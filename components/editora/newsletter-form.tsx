"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { captureLeadAction } from "@/lib/actions/capture-lead";

interface NewsletterFormProps {
  origin?: string;
  bookId?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function NewsletterForm({
  origin = "newsletter",
  bookId,
  title = "Receba novidades e promoções",
  description = "Cadastre-se e fique por dentro dos lançamentos e ofertas exclusivas da Editora Jocum.",
  className = "",
}: NewsletterFormProps) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await captureLeadAction({
        name,
        email,
        origin,
        bookId,
        marketingConsent: true,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className={`flex flex-col items-center gap-3 text-center py-6 ${className}`}>
        <div className="p-3 rounded-full bg-emerald-100">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Você está na lista!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Em breve você receberá nossas novidades no e-mail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          required
          disabled={pending}
        />
        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            required
            disabled={pending}
            className="flex-1"
          />
          <Button type="submit" disabled={pending} className="shrink-0 gap-2">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Quero receber
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Ao se cadastrar, você concorda em receber e-mails da Editora Jocum. Sem spam, prometemos.
        </p>
      </form>
    </div>
  );
}
