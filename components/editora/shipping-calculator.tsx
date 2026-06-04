"use client";

import { useState } from "react";
import { Truck, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";

type ShippingOption = {
  id: string;
  label: string;
  price: number;
  minDays: number;
  maxDays: number;
};

const WEEKDAYS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function formatDelivery(minDays: number, maxDays: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = addBusinessDays(today, minDays);
  const maxDate = addBusinessDays(today, maxDays);
  const diffMin = Math.round((minDate.getTime() - today.getTime()) / 86400000);
  const diffMax = Math.round((maxDate.getTime() - today.getTime()) / 86400000);
  const fmtMin = diffMin <= 6 ? WEEKDAYS_PT[minDate.getDay()] : `${minDate.getDate()} de ${MONTHS_PT[minDate.getMonth()]}`;
  const fmtMax = diffMax <= 6 ? WEEKDAYS_PT[maxDate.getDay()] : `${maxDate.getDate()} de ${MONTHS_PT[maxDate.getMonth()]}`;
  if (diffMin > 6 && diffMax > 6 && minDate.getMonth() === maxDate.getMonth()) {
    return `Entre ${minDate.getDate()} e ${maxDate.getDate()} de ${MONTHS_PT[minDate.getMonth()]}`;
  }
  return `Entre ${fmtMin} e ${fmtMax}`;
}

export function ShippingCalculator({ bookId }: { bookId: string }) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCepChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);
  }

  async function calculate() {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) {
      setError("Digite um CEP válido com 8 dígitos.");
      return;
    }
    setError(null);
    setOptions(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: raw, items: [{ id: bookId, type: "book", quantity: 1 }] }),
      });
      const json = await res.json();
      if (!res.ok || !json.options) {
        setError("Não foi possível calcular o frete. Verifique o CEP e tente novamente.");
      } else {
        setOptions(json.options);
      }
    } catch {
      setError("Erro ao calcular o frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Truck className="h-4 w-4 text-brand" />
        <span>Calcular frete</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={cep}
          onChange={(e) => handleCepChange(e.target.value)}
          placeholder="00000-000"
          className="max-w-[140px] font-mono"
          onKeyDown={(e) => e.key === "Enter" && calculate()}
          disabled={loading}
        />
        <Button
          variant="outline"
          onClick={calculate}
          disabled={loading || cep.replace(/\D/g, "").length !== 8}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Calcular
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {options && options.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma opção de frete disponível para este CEP.</p>
      )}

      {options && options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm bg-muted/30">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{formatDelivery(opt.minDays, opt.maxDays)}</span>
              </div>
              <span className="font-semibold text-foreground">
                {opt.price === 0 ? (
                  <span className="text-emerald-600">Grátis</span>
                ) : (
                  formatCurrency(opt.price)
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
