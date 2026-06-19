"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DecimalInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  suffix?: string;
}

export function DecimalInput({ id, value, onChange, placeholder, className, suffix }: DecimalInputProps) {
  const [local, setLocal] = useState(value != null ? String(value) : "");
  const prevValue = useRef(value);

  // Sincroniza quando o valor muda externamente (ex: preenchimento automático via Bling)
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setLocal(value != null ? String(value) : "");
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Permite apenas dígitos e um ponto decimal
    if (!/^(\d*\.?\d*)?$/.test(raw)) return;
    setLocal(raw);
    const parsed = parseFloat(raw);
    const next = isNaN(parsed) ? null : parsed;
    prevValue.current = next;
    onChange(next);
  }

  function handleBlur() {
    // Na saída do campo, limpa o display (remove "1." sobrando)
    setLocal(value != null ? String(value) : "");
    prevValue.current = value;
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          suffix && "pr-8",
          className,
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
