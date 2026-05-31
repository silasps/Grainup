import { formatCurrency } from "./format";

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

interface KpiTotals {
  gross: number;
  net: number;
  fees: number;
  shipping: number;
  commissions: number;
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

function fmtDateLong(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(
    new Date(iso)
  );
}

const BRAND = [16, 124, 63] as [number, number, number]; // green brand
const GRAY_DARK = [30, 30, 30] as [number, number, number];
const GRAY_MID = [100, 100, 100] as [number, number, number];
const GRAY_LIGHT = [240, 242, 240] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];

function drawHeader(doc: import("jspdf").jsPDF, title: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Editora Jocum", 14, 9);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 15.5);
  const now = fmtDateLong(new Date().toISOString());
  doc.setFontSize(7);
  doc.text(`Gerado em ${now}`, pageW - 14, 15.5, { align: "right" });
  doc.setTextColor(...GRAY_DARK);
}

function drawFooter(doc: import("jspdf").jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 220);
  doc.line(14, pageH - 10, pageW - 14, pageH - 10);
  doc.setTextColor(...GRAY_MID);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Editora Jocum — Relatório Confidencial", 14, pageH - 5);
  doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 14, pageH - 5, { align: "right" });
  doc.setTextColor(...GRAY_DARK);
}

export async function exportMovimentacoesPDF(
  movements: Movement[],
  filterLabel: string,
  title = "Relatório de Movimentações"
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawHeader(doc, title);

  let y = 30;

  // Filter info
  if (filterLabel) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MID);
    doc.text(`Filtros aplicados: ${filterLabel}`, 14, y);
    y += 7;
  }

  // Totals for filtered movements
  const paid = movements.filter((m) => m.status === "pago");
  const totals: KpiTotals = {
    gross: paid.reduce((s, m) => s + m.gross_amount, 0),
    net: paid.reduce((s, m) => s + m.net_amount, 0),
    fees: paid.reduce((s, m) => s + m.gateway_fee, 0),
    shipping: paid.reduce((s, m) => s + m.shipping, 0),
    commissions: paid.reduce((s, m) => s + m.affiliate_commission, 0),
  };

  // KPI summary boxes (5 boxes in one row)
  const kpis = [
    { label: "Receita Bruta", value: formatCurrency(totals.gross) },
    { label: "Receita Líquida", value: formatCurrency(totals.net) },
    { label: "Frete Cobrado", value: formatCurrency(totals.shipping) },
    { label: "Taxas Gateway", value: formatCurrency(totals.fees) },
    { label: "Comissões Afil.", value: formatCurrency(totals.commissions) },
  ];

  const kpiW = (pageW - 28 - 12) / 5;
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiW + 3);
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, kpiW, 16, 2, 2, "F");
    doc.setFillColor(...BRAND);
    doc.roundedRect(x, y, kpiW, 3.5, 2, 2, "F");
    doc.rect(x, y + 1.5, kpiW, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + kpiW / 2, y + 7.5, { align: "center" });
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, x + kpiW / 2, y + 13, { align: "center" });
  });

  y += 22;

  // Summary counts
  const byStatus: Record<string, number> = {};
  movements.forEach((m) => {
    byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
  });
  const summaryParts = Object.entries(byStatus).map(
    ([s, c]) => `${STATUS_LABEL[s] ?? s}: ${c}`
  );

  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_MID);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Total de registros: ${movements.length}   |   ${summaryParts.join("   |   ")}`,
    14,
    y
  );
  y += 5;

  // Movements table
  autoTable(doc, {
    startY: y,
    head: [["Data", "Forma de Pag.", "Bruto (R$)", "Desconto (R$)", "Frete (R$)", "Taxa Gateway (R$)", "Comissão Afil. (R$)", "Líquido (R$)", "Status"]],
    body: movements.map((m) => [
      fmtDate(m.paid_at ?? m.created_at),
      PAY_LABEL[m.payment_method] ?? m.payment_method ?? "—",
      formatCurrency(m.gross_amount),
      formatCurrency(m.discount),
      formatCurrency(m.shipping),
      formatCurrency(m.gateway_fee),
      formatCurrency(m.affiliate_commission),
      formatCurrency(m.net_amount),
      STATUS_LABEL[m.status] ?? m.status,
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: GRAY_DARK,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: BRAND,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      0: { halign: "center", cellWidth: 22 },
      1: { halign: "center", cellWidth: 22 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold", textColor: BRAND },
      8: { halign: "center", cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      drawHeader(doc, title);
      drawFooter(doc, data.pageNumber, pageCount);
    },
  });

  // Final footer on last page
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`movimentacoes-${date}.pdf`);
}

export async function exportFinanceiroDashboardPDF(
  movements: Movement[],
  monthlyData: { name: string; receita: number; bruto: number }[]
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const title = "Relatório Financeiro — Resumo Gerencial";

  drawHeader(doc, title);

  let y = 30;

  // KPIs
  const paid = movements.filter((m) => m.status === "pago");
  const totals: KpiTotals = {
    gross: paid.reduce((s, m) => s + m.gross_amount, 0),
    net: paid.reduce((s, m) => s + m.net_amount, 0),
    fees: paid.reduce((s, m) => s + m.gateway_fee, 0),
    shipping: paid.reduce((s, m) => s + m.shipping, 0),
    commissions: paid.reduce((s, m) => s + m.affiliate_commission, 0),
  };

  // Section: KPIs
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY_DARK);
  doc.text("Resumo Financeiro (transações pagas)", 14, y);
  y += 5;

  const kpis = [
    { label: "Receita Bruta", value: formatCurrency(totals.gross), sub: "Total faturado" },
    { label: "Receita Líquida", value: formatCurrency(totals.net), sub: "Após deduções" },
    { label: "Frete Cobrado", value: formatCurrency(totals.shipping), sub: "Enviado ao cliente" },
    { label: "Taxas Gateway", value: formatCurrency(totals.fees), sub: "Custo de gateway" },
    { label: "Comissões Afil.", value: formatCurrency(totals.commissions), sub: "Pago a afiliados" },
  ];

  const colW = (pageW - 28) / kpis.length - 2;
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (colW + 2);
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, colW, 20, 2, 2, "F");
    doc.setFillColor(...BRAND);
    doc.roundedRect(x, y, colW, 3.5, 2, 2, "F");
    doc.rect(x, y + 1.5, colW, 2, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + colW / 2, y + 8, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, x + colW / 2, y + 14, { align: "center" });
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.sub, x + colW / 2, y + 18, { align: "center" });
  });

  y += 26;

  // Section: Monthly revenue
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY_DARK);
  doc.text("Receita Mensal — Últimos 6 Meses", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Mês", "Receita Bruta (R$)", "Receita Líquida (R$)", "Variação Líquida"]],
    body: monthlyData.map((row, i) => {
      const prev = i > 0 ? monthlyData[i - 1].receita : null;
      const variation =
        prev !== null && prev > 0
          ? `${((row.receita - prev) / prev) * 100 > 0 ? "+" : ""}${(((row.receita - prev) / prev) * 100).toFixed(1)}%`
          : "—";
      return [row.name, formatCurrency(row.bruto), formatCurrency(row.receita), variation];
    }),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      textColor: GRAY_DARK,
    },
    headStyles: { fillColor: BRAND, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      0: { halign: "center", cellWidth: 28 },
      1: { halign: "right" },
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "center", cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      drawHeader(doc, title);
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      drawFooter(doc, data.pageNumber, pageCount);
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Section: Payment method breakdown
  const payBreakdown = ["pix", "credito", "debito", "boleto"].map((method) => {
    const filtered = paid.filter((m) => m.payment_method === method);
    return {
      method: PAY_LABEL[method] ?? method,
      count: filtered.length,
      gross: filtered.reduce((s, m) => s + m.gross_amount, 0),
      net: filtered.reduce((s, m) => s + m.net_amount, 0),
    };
  }).filter((r) => r.count > 0);

  if (y > 230) {
    doc.addPage();
    drawHeader(doc, title);
    y = 30;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY_DARK);
  doc.text("Distribuição por Forma de Pagamento", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Forma de Pagamento", "Qtd. Transações", "Receita Bruta (R$)", "Receita Líquida (R$)", "% da Receita Líquida"]],
    body: payBreakdown.map((r) => [
      r.method,
      r.count.toString(),
      formatCurrency(r.gross),
      formatCurrency(r.net),
      totals.net > 0 ? `${((r.net / totals.net) * 100).toFixed(1)}%` : "—",
    ]),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      textColor: GRAY_DARK,
    },
    headStyles: { fillColor: BRAND, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      0: { halign: "left", cellWidth: 50 },
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      drawHeader(doc, title);
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      drawFooter(doc, data.pageNumber, pageCount);
    },
  });

  // Section: Recent movements (last 20)
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const recentMoves = [...movements].sort((a, b) => {
    return new Date(b.paid_at ?? b.created_at).getTime() - new Date(a.paid_at ?? a.created_at).getTime();
  }).slice(0, 20);

  if (y > 220) {
    doc.addPage();
    drawHeader(doc, title);
    y = 30;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY_DARK);
  doc.text("Movimentações Recentes (últimas 20)", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Data", "Forma de Pag.", "Bruto (R$)", "Taxa (R$)", "Líquido (R$)", "Status"]],
    body: recentMoves.map((m) => [
      fmtDate(m.paid_at ?? m.created_at),
      PAY_LABEL[m.payment_method] ?? m.payment_method ?? "—",
      formatCurrency(m.gross_amount),
      formatCurrency(m.gateway_fee),
      formatCurrency(m.net_amount),
      STATUS_LABEL[m.status] ?? m.status,
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
      textColor: GRAY_DARK,
    },
    headStyles: { fillColor: BRAND, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      0: { halign: "center", cellWidth: 26 },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "center", cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      drawHeader(doc, title);
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      drawFooter(doc, data.pageNumber, pageCount);
    },
  });

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`financeiro-gerencial-${date}.pdf`);
}
