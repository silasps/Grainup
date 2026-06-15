"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface Props {
  expiresAt: string;
  courseTitle: string;
  renewHref?: string;
  primaryColor: string;
}

export function ExpiryBanner({ expiresAt, courseTitle, renewHref, primaryColor }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const daysLeft = Math.ceil((exp - now) / 86_400_000);

  if (dismissed || daysLeft > 7 || daysLeft <= 0) return null;

  const label =
    daysLeft === 1
      ? "Seu acesso expira amanhã!"
      : `Seu acesso expira em ${daysLeft} dias!`;

  return (
    <div
      className="w-full py-2.5 px-4 flex items-center justify-between gap-3 text-white text-sm"
      style={{ background: daysLeft <= 2 ? "#b91c1c" : primaryColor }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          <span className="font-semibold">{label}</span>{" "}
          <span className="opacity-90">{courseTitle}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {renewHref && (
          <a
            href={renewHref}
            className="underline underline-offset-2 font-medium whitespace-nowrap hover:opacity-90"
          >
            Renovar acesso
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
