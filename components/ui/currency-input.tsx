"use client";

import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Se true, apagar até zerar chama onChange(null). Use para campos opcionais. */
  nullable?: boolean;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = "0,00",
  required,
  className,
  nullable = false,
}: CurrencyInputProps) {
  const cents = value != null ? Math.round(value * 100) : 0;

  function centsToDisplay(c: number): string {
    const str = String(c).padStart(3, "0");
    return `${str.slice(0, -2)},${str.slice(-2)}`;
  }

  const displayValue = value !== null ? centsToDisplay(cents) : "";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newCents = Math.floor(cents / 10);
      if (newCents === 0 && nullable) {
        onChange(null);
      } else {
        onChange(newCents / 100);
      }
    } else if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const newCents = cents * 10 + parseInt(e.key);
      if (newCents <= 9_999_999) {
        onChange(newCents / 100);
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    let c = cents;
    for (const d of digits) {
      c = c * 10 + parseInt(d);
      if (c > 9_999_999) { c = 9_999_999; break; }
    }
    onChange(c > 0 ? c / 100 : nullable ? null : 0);
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        required={required}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    </div>
  );
}
