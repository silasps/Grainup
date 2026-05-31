"use client";

import { useState, useRef, useEffect } from "react";
import { FileDown, Loader2, ChevronDown, FileText, FileSpreadsheet, Table2 } from "lucide-react";

interface Movement {
  id: string;
  gross_amount: number;
  discount: number;
  shipping: number;
  gateway_fee: number;
  affiliate_commission: number;
  net_amount: number;
  payment_method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface MonthlyRow {
  name: string;
  receita: number;
  bruto: number;
}

type ExportMode = "movements" | "dashboard";

interface Props {
  movements: Movement[];
  filterLabel?: string;
  mode: ExportMode;
  monthlyData?: MonthlyRow[];
}

const OPTIONS = [
  { id: "pdf", label: "PDF — Relatório gerencial", icon: FileText, ext: ".pdf" },
  { id: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet, ext: ".xlsx" },
  { id: "csv", label: "CSV (separado por ponto e vírgula)", icon: Table2, ext: ".csv" },
  { id: "ofx", label: "OFX — Contabilidade / bancos", icon: FileDown, ext: ".ofx" },
] as const;

type OptionId = typeof OPTIONS[number]["id"];

export function ExportMenu({ movements, filterLabel = "", mode, monthlyData = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<OptionId | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleSelect(id: OptionId) {
    setOpen(false);
    setLoading(id);
    try {
      if (id === "pdf") {
        if (mode === "dashboard") {
          const { exportFinanceiroDashboardPDF } = await import("@/lib/utils/export-pdf");
          await exportFinanceiroDashboardPDF(movements, monthlyData);
        } else {
          const { exportMovimentacoesPDF } = await import("@/lib/utils/export-pdf");
          await exportMovimentacoesPDF(movements, filterLabel);
        }
      } else if (id === "excel") {
        const { exportExcel } = await import("@/lib/utils/export-formats");
        await exportExcel(movements, filterLabel);
      } else if (id === "csv") {
        const { exportCSV } = await import("@/lib/utils/export-formats");
        exportCSV(movements, filterLabel);
      } else if (id === "ofx") {
        const { exportOFX } = await import("@/lib/utils/export-formats");
        exportOFX(movements);
      }
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-white text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
      >
        {busy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <FileDown className="h-3.5 w-3.5" />
        }
        Exportar
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Exportar relatório</p>
            <p className="text-xs text-muted-foreground mt-0.5">{movements.length} registro{movements.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="py-1">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isLoading = loading === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 text-brand animate-spin flex-shrink-0" />
                    : <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  }
                  <div>
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-muted-foreground text-[11px]">{opt.ext}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
