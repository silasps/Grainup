"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, X, ChevronDown } from "lucide-react";

// Tracks which toasts have been expanded so state survives Sonner re-renders
const expandedToasts = new Set<string | number>();

interface Props {
  toastId: string | number;
  title: string;
  description?: string;
}

function ErrorToastContent({ toastId, title, description }: Props) {
  const [expanded, setExpanded] = useState(() => expandedToasts.has(toastId));

  function handleExpand() {
    if (expanded || !description) return;
    expandedToasts.add(toastId);
    setExpanded(true);
    // Re-register with Infinity so it won't auto-dismiss while expanded
    toast.custom(
      (t) => <ErrorToastContent toastId={t} title={title} description={description} />,
      { id: toastId, duration: Infinity }
    );
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    expandedToasts.delete(toastId);
    toast.dismiss(toastId);
  }

  const isClickable = !expanded && !!description;

  return (
    <div
      onClick={handleExpand}
      className={[
        "flex items-start gap-3 w-full bg-white border border-red-200 rounded-xl shadow-md px-4 py-3",
        isClickable ? "cursor-pointer hover:bg-red-50 transition-colors" : "",
      ].join(" ")}
    >
      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>

        {description && (
          <p className={`text-xs text-muted-foreground mt-0.5 leading-relaxed ${expanded ? "whitespace-normal" : "truncate"}`}>
            {description}
          </p>
        )}

        {isClickable && (
          <p className="flex items-center gap-0.5 text-[11px] text-red-500 mt-1 select-none">
            <ChevronDown className="h-3 w-3" />
            Toque para ver detalhes
          </p>
        )}
      </div>

      {expanded && (
        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors -mr-1 -mt-0.5 p-0.5 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Drop-in replacement for toast.error() that supports expand-on-click. */
export function toastError(title: string, description?: string): string | number {
  return toast.custom(
    (t) => <ErrorToastContent toastId={t} title={title} description={description} />,
    { duration: 10000 }
  );
}

/** Same as toastError but updates an existing loading toast by ID. */
export function toastErrorId(id: string | number, title: string, description?: string) {
  expandedToasts.delete(id);
  toast.custom(
    (t) => <ErrorToastContent toastId={t} title={title} description={description} />,
    { id, duration: 10000 }
  );
}
