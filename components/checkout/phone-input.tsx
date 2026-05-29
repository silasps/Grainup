"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Country {
  code: string;
  flag: string;
  ddi: string;
  name: string;
  mask: string;
  regex: RegExp;
}

export const COUNTRIES: Country[] = [
  { code: "BR", flag: "🇧🇷", ddi: "+55",  name: "Brasil",        mask: "(00) 00000-0000",  regex: /^\(\d{2}\) \d{5}-\d{4}$/ },
  { code: "US", flag: "🇺🇸", ddi: "+1",   name: "EUA / Canadá",  mask: "(000) 000-0000",   regex: /^\(\d{3}\) \d{3}-\d{4}$/ },
  { code: "AR", flag: "🇦🇷", ddi: "+54",  name: "Argentina",     mask: "(00) 0000-0000",   regex: /^\(\d{2}\) \d{4}-\d{4}$/ },
  { code: "PT", flag: "🇵🇹", ddi: "+351", name: "Portugal",      mask: "000 000 000",      regex: /^\d{3} \d{3} \d{3}$/ },
  { code: "ES", flag: "🇪🇸", ddi: "+34",  name: "Espanha",       mask: "000 000 000",      regex: /^\d{3} \d{3} \d{3}$/ },
  { code: "MX", flag: "🇲🇽", ddi: "+52",  name: "México",        mask: "00 0000 0000",     regex: /^\d{2} \d{4} \d{4}$/ },
  { code: "CO", flag: "🇨🇴", ddi: "+57",  name: "Colômbia",      mask: "000 0000000",      regex: /^\d{3} \d{7}$/ },
  { code: "CL", flag: "🇨🇱", ddi: "+56",  name: "Chile",         mask: "0 0000 0000",      regex: /^\d \d{4} \d{4}$/ },
  { code: "GB", flag: "🇬🇧", ddi: "+44",  name: "Reino Unido",   mask: "00000 000000",     regex: /^\d{5} \d{6}$/ },
  { code: "DE", flag: "🇩🇪", ddi: "+49",  name: "Alemanha",      mask: "0000 0000000",     regex: /^\d{4} \d{7}$/ },
  { code: "FR", flag: "🇫🇷", ddi: "+33",  name: "França",        mask: "00 00 00 00 00",   regex: /^\d{2} \d{2} \d{2} \d{2} \d{2}$/ },
  { code: "IT", flag: "🇮🇹", ddi: "+39",  name: "Itália",        mask: "000 0000000",      regex: /^\d{3} \d{7}$/ },
];

function applyMask(digits: string, mask: string): string {
  let i = 0;
  let result = "";
  for (const ch of mask) {
    if (i >= digits.length) break;
    result += ch === "0" ? digits[i++] : ch;
  }
  return result;
}

function maskToPlaceholder(mask: string): string {
  return mask.replace(/0/g, "_");
}

function countDigits(mask: string): number {
  return mask.split("").filter((c) => c === "0").length;
}

interface PhoneInputProps {
  value: string;
  countryCode: string;
  onChange: (value: string) => void;
  onCountryChange: (code: string) => void;
  className?: string;
}

export function PhoneInput({
  value,
  countryCode,
  onChange,
  onCountryChange,
  className,
}: PhoneInputProps) {
  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, countDigits(country.mask));
    onChange(applyMask(digits, country.mask));
  }

  function handleCountrySelect(code: string) {
    onCountryChange(code);
    onChange("");
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm shadow-xs",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="hidden text-xs text-muted-foreground sm:block">{country.ddi}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-52 max-h-64 overflow-y-auto">
          {COUNTRIES.map((c) => (
            <DropdownMenuItem
              key={c.code}
              className={cn(
                "flex cursor-pointer items-center gap-2",
                c.code === country.code && "bg-accent"
              )}
              onClick={() => handleCountrySelect(c.code)}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="flex-1 text-sm">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.ddi}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        type="tel"
        inputMode="numeric"
        placeholder={maskToPlaceholder(country.mask)}
        value={value}
        onChange={handleInput}
        className="flex-1"
      />
    </div>
  );
}
