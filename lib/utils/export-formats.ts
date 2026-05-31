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

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
  estornado: "Estornado",
  aguardando_pagamento: "Aguardando",
};

const PAY_LABEL: Record<string, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  boleto: "Boleto",
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

function fmtOFXDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}120000`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(movements: Movement[], filterLabel: string) {
  const headers = [
    "Data",
    "Forma de Pagamento",
    "Valor Bruto",
    "Desconto",
    "Frete",
    "Taxa Gateway",
    "Comissão Afiliado",
    "Valor Líquido",
    "Status",
    "ID",
  ];

  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = movements.map((m) => [
    fmtDate(m.paid_at ?? m.created_at),
    PAY_LABEL[m.payment_method] ?? m.payment_method ?? "",
    m.gross_amount.toFixed(2).replace(".", ","),
    m.discount.toFixed(2).replace(".", ","),
    m.shipping.toFixed(2).replace(".", ","),
    m.gateway_fee.toFixed(2).replace(".", ","),
    m.affiliate_commission.toFixed(2).replace(".", ","),
    m.net_amount.toFixed(2).replace(".", ","),
    STATUS_LABEL[m.status] ?? m.status,
    m.id,
  ]);

  const meta = filterLabel ? `# Filtros: ${filterLabel}\n` : "";
  const csv =
    meta +
    [headers, ...rows].map((r) => r.map(escape).join(";")).join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `movimentacoes-${date}.csv`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export async function exportExcel(movements: Movement[], filterLabel: string) {
  const XLSX = await import("xlsx");

  const headers = [
    "Data",
    "Forma de Pagamento",
    "Valor Bruto (R$)",
    "Desconto (R$)",
    "Frete (R$)",
    "Taxa Gateway (R$)",
    "Comissão Afiliado (R$)",
    "Valor Líquido (R$)",
    "Status",
    "ID",
  ];

  const rows = movements.map((m) => [
    fmtDate(m.paid_at ?? m.created_at),
    PAY_LABEL[m.payment_method] ?? m.payment_method ?? "",
    m.gross_amount,
    m.discount,
    m.shipping,
    m.gateway_fee,
    m.affiliate_commission,
    m.net_amount,
    STATUS_LABEL[m.status] ?? m.status,
    m.id,
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Movimentações
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws["!cols"] = [
    { wch: 12 }, // Data
    { wch: 18 }, // Forma
    { wch: 16 }, // Bruto
    { wch: 14 }, // Desconto
    { wch: 12 }, // Frete
    { wch: 18 }, // Taxa
    { wch: 22 }, // Comissão
    { wch: 18 }, // Líquido
    { wch: 14 }, // Status
    { wch: 38 }, // ID
  ];

  // Style header row (bold + background) — works with xlsx-style or via XML
  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellAddr]) {
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "107C3F" } },
        alignment: { horizontal: "center" },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Movimentações");

  // Sheet 2 — Resumo por status
  const byStatus: Record<string, { count: number; gross: number; net: number }> = {};
  movements.forEach((m) => {
    const key = STATUS_LABEL[m.status] ?? m.status;
    if (!byStatus[key]) byStatus[key] = { count: 0, gross: 0, net: 0 };
    byStatus[key].count++;
    byStatus[key].gross += m.gross_amount;
    byStatus[key].net += m.net_amount;
  });

  const summaryHeaders = ["Status", "Qtd. Registros", "Valor Bruto (R$)", "Valor Líquido (R$)"];
  const summaryRows = Object.entries(byStatus).map(([s, v]) => [
    s,
    v.count,
    v.gross,
    v.net,
  ]);
  const totalRow = [
    "TOTAL",
    movements.length,
    movements.reduce((s, m) => s + m.gross_amount, 0),
    movements.reduce((s, m) => s + m.net_amount, 0),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows, totalRow]);
  ws2["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo");

  if (filterLabel) {
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["Relatório de Movimentações — Editora Jocum"],
      ["Gerado em", new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date())],
      ["Filtros aplicados", filterLabel],
      ["Total de registros", movements.length],
    ]);
    ws3["!cols"] = [{ wch: 24 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Info");
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `movimentacoes-${date}.xlsx`);
}

// ─── OFX ─────────────────────────────────────────────────────────────────────

export function exportOFX(movements: Movement[]) {
  const sorted = [...movements].sort(
    (a, b) =>
      new Date(a.paid_at ?? a.created_at).getTime() -
      new Date(b.paid_at ?? b.created_at).getTime()
  );

  const dtStart = sorted.length > 0 ? fmtOFXDate(sorted[0].paid_at ?? sorted[0].created_at) : fmtOFXDate(new Date().toISOString());
  const dtEnd = sorted.length > 0 ? fmtOFXDate(sorted[sorted.length - 1].paid_at ?? sorted[sorted.length - 1].created_at) : fmtOFXDate(new Date().toISOString());
  const dtNow = fmtOFXDate(new Date().toISOString());

  const balance = movements
    .filter((m) => m.status === "pago")
    .reduce((s, m) => s + m.net_amount, 0);

  const txnType = (m: Movement) => {
    if (m.status === "estornado" || m.status === "cancelado") return "DEBIT";
    return "CREDIT";
  };

  const memo = (m: Movement) => {
    const pay = PAY_LABEL[m.payment_method] ?? m.payment_method ?? "";
    const st = STATUS_LABEL[m.status] ?? m.status;
    return `${pay} - ${st}`.replace(/[<>&]/g, " ");
  };

  // OFX uses dots for decimals, no thousand separator
  const fmtAmt = (v: number, m: Movement) => {
    const sign = m.status === "estornado" || m.status === "cancelado" ? "-" : "";
    return `${sign}${v.toFixed(2)}`;
  };

  const transactions = sorted
    .map(
      (m) =>
        `<STMTTRN>
<TRNTYPE>${txnType(m)}
<DTPOSTED>${fmtOFXDate(m.paid_at ?? m.created_at)}
<TRNAMT>${fmtAmt(m.net_amount, m)}
<FITID>${m.id}
<MEMO>${memo(m)}
</STMTTRN>`
    )
    .join("\n");

  const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:UTF-8
CHARSET:NONE
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
<MESSAGE>OK
</STATUS>
<DTSERVER>${dtNow}
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>00000000
<ACCTID>EDITORA-JOCUM
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtStart}
<DTEND>${dtEnd}
${transactions}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>${balance.toFixed(2)}
<DTASOF>${dtNow}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const blob = new Blob([ofx], { type: "application/x-ofx" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `movimentacoes-${date}.ofx`);
}
