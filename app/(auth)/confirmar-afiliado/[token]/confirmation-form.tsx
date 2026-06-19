"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { submitLeaderConfirmationAction } from "./actions";

interface Props {
  token: string;
  affiliateName: string;
  servingLocation: string | null;
}

export function ConfirmationForm({ token, affiliateName, servingLocation }: Props) {
  const [choice, setChoice] = useState<"confirmed" | "denied" | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!choice) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitLeaderConfirmationAction(token, choice, notes);
      setDone(true);
    } catch (err) {
      setError((err as Error).message ?? "Ocorreu um erro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-6">
        <div className={`rounded-full p-4 ${choice === "confirmed" ? "bg-green-50" : "bg-red-50"}`}>
          {choice === "confirmed"
            ? <CheckCircle2 className="h-10 w-10 text-green-500" />
            : <XCircle className="h-10 w-10 text-red-500" />}
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            {choice === "confirmed" ? "Confirmação enviada!" : "Resposta registrada"}
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            {choice === "confirmed"
              ? `Obrigado! Nossa equipe revisará a inscrição de ${affiliateName} e dará um retorno em breve.`
              : `Recebemos sua resposta. Nossa equipe entrará em contato com ${affiliateName} para informá-lo.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Candidato */}
      <div className="bg-secondary/60 rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Candidato</p>
        <p className="font-semibold text-foreground text-base">{affiliateName}</p>
        {servingLocation && (
          <p className="text-sm text-muted-foreground mt-0.5">{servingLocation}</p>
        )}
      </div>

      {/* Pergunta */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">
          Você confirma que <strong>{affiliateName}</strong> é um membro ativo da JOCUM
          e autoriza a participação no Programa de Afiliados?
        </p>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            type="button"
            onClick={() => setChoice("confirmed")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-4 font-semibold text-sm transition-all ${
              choice === "confirmed"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-border hover:border-green-300 text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
            Sim, confirmo
          </button>
          <button
            type="button"
            onClick={() => setChoice("denied")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-4 font-semibold text-sm transition-all ${
              choice === "denied"
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-border hover:border-red-300 text-muted-foreground"
            }`}
          >
            <XCircle className="h-5 w-5" />
            Não confirmo
          </button>
        </div>
      </div>

      {/* Observações */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted-foreground">
          Observações <span className="text-xs">(opcional)</span>
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: está em missão de curto prazo, serve na área de comunicação..."
          rows={3}
          className="resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!choice || submitting}
        className="bg-brand hover:bg-brand-700 text-white w-full"
      >
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Enviar resposta
      </Button>
    </div>
  );
}
