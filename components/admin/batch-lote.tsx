"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Upload, Search, CheckCircle2,
  AlertCircle, FileSpreadsheet, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils/format";
import {
  batchUpdatePriceByRuleAction,
  batchImportBooksAction,
  type BookImportRow,
} from "@/app/(admin)/admin/editora/livros/actions";
import type { BookFull } from "@/app/(admin)/admin/editora/livros/lote/page";

// ─── Export ────────────────────────────────────────────────────────────────

const BOOL = (v: boolean) => (v ? "SIM" : "NÃO");
const NUM = (v: number | null | undefined) => (v != null ? v : "");
const DEC = (v: number | null | undefined) =>
  v != null ? v.toFixed(2).replace(".", ",") : "";

function toXlsxRow(b: BookFull) {
  return {
    slug: b.slug,
    titulo: b.title,
    preco: DEC(b.price),
    preco_promocional: DEC(b.price_promotional),
    paginas: NUM(b.pages),
    relevancia: NUM(b.relevance),
    ativo: BOOL(b.is_active),
    destaque: BOOL(b.is_featured),
    lancamento: BOOL(b.is_new),
    mais_vendido: BOOL(b.is_bestseller),
    isbn: b.isbn ?? "",
    sku: b.sku ?? "",
    editora: b.publisher ?? "",
    peso_gramas: NUM(b.weight_grams),
    altura_cm: DEC(b.height_cm),
    largura_cm: DEC(b.width_cm),
    comprimento_cm: DEC(b.length_cm),
    descricao_curta: b.description_short ?? "",
  };
}

async function exportXlsx(books: BookFull[]) {
  const XLSX = await import("xlsx");
  const rows = books.map(toXlsxRow);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Largura das colunas
  ws["!cols"] = [
    { wch: 40 }, // slug
    { wch: 50 }, // titulo
    { wch: 10 }, // preco
    { wch: 16 }, // preco_promocional
    { wch: 10 }, // paginas
    { wch: 12 }, // relevancia
    { wch: 8 },  // ativo
    { wch: 10 }, // destaque
    { wch: 12 }, // lancamento
    { wch: 14 }, // mais_vendido
    { wch: 18 }, // isbn
    { wch: 14 }, // sku
    { wch: 22 }, // editora
    { wch: 12 }, // peso_gramas
    { wch: 10 }, // altura_cm
    { wch: 10 }, // largura_cm
    { wch: 14 }, // comprimento_cm
    { wch: 60 }, // descricao_curta
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Livros");

  // Aba de instruções
  const info = XLSX.utils.aoa_to_sheet([
    ["INSTRUÇÕES DE IMPORTAÇÃO"],
    [""],
    ["Campos editáveis (podem ser alterados):"],
    ["titulo, preco, preco_promocional, paginas, relevancia"],
    ["ativo, destaque, lancamento, mais_vendido"],
    ["isbn, sku, editora, peso_gramas, altura_cm, largura_cm, comprimento_cm, descricao_curta"],
    [""],
    ["Campos somente leitura (não altere):"],
    ["slug  ← identificador da linha; alterar impede o import de encontrar o livro"],
    [""],
    ["ATENÇÃO — estoque NÃO está nesta planilha:"],
    ["O estoque é gerenciado diretamente no Bling ERP e sincronizado automaticamente."],
    ["Para ajustar estoque, acesse o Bling."],
    [""],
    ["Formato dos campos:"],
    ["preco / preco_promocional → número decimal com vírgula (ex: 45,90). Deixe vazio para remover promoção."],
    ["ativo, destaque, lancamento, mais_vendido → SIM ou NÃO"],
    ["relevancia → número de 1 a 5, ou vazio para não definida"],
    ["peso_gramas → número inteiro em gramas (ex: 350)"],
    ["altura_cm / largura_cm / comprimento_cm → decimal com vírgula em centímetros (ex: 21,0)"],
    ["sku, peso_gramas, altura_cm, largura_cm, comprimento_cm → atualizados também no Bling ERP quando alterados"],
    ["preco → atualizado também no Bling ERP quando alterado"],
  ]);
  info["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, info, "Instruções");

  XLSX.writeFile(wb, `catalogo-livros-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Import parse ──────────────────────────────────────────────────────────

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v ?? "").toUpperCase().trim();
  return s === "SIM" || s === "TRUE" || s === "1" || s === "S";
}

function parseNum(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseIntOrNull(v: unknown): number | null {
  const n = parseNum(v);
  return n !== null ? Math.round(n) : null;
}

interface ParsedImport {
  rows: BookImportRow[];
  unknownIds: string[];
  warnings: string[];
}

function parseImportRows(raw: unknown[], books: BookFull[]): ParsedImport {
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const rows: BookImportRow[] = [];
  const unknownIds: string[] = [];
  const warnings: string[] = [];

  for (const r of raw as Record<string, unknown>[]) {
    const slug = String(r["slug"] ?? "").trim();
    if (!slug) continue;
    const book = bySlug.get(slug);
    if (!book) { unknownIds.push(slug); continue; }
    const id = book.id;

    const price = parseNum(r["preco"]) ?? 0;
    if (price <= 0) { warnings.push(`"${book.title}": preço inválido → ignorado`); continue; }

    rows.push({
      id,
      title: (String(r["titulo"] ?? "").trim() || book.title) ?? "",
      price,
      price_promotional: parseNum(r["preco_promocional"]),
      pages: parseIntOrNull(r["paginas"]),
      relevance: (() => {
        const v = parseIntOrNull(r["relevancia"]);
        return v && v >= 1 && v <= 5 ? v : null;
      })(),
      is_active: parseBool(r["ativo"]),
      is_featured: parseBool(r["destaque"]),
      is_new: parseBool(r["lancamento"]),
      is_bestseller: parseBool(r["mais_vendido"]),
      isbn: String(r["isbn"] ?? "").trim() || null,
      sku: String(r["sku"] ?? "").trim() || null,
      publisher: String(r["editora"] ?? "").trim() || null,
      weight_grams: parseIntOrNull(r["peso_gramas"]),
      height_cm: parseNum(r["altura_cm"]),
      width_cm: parseNum(r["largura_cm"]),
      length_cm: parseNum(r["comprimento_cm"]),
      description_short: String(r["descricao_curta"] ?? "").trim() || null,
    });
  }

  return { rows, unknownIds, warnings };
}

function diffCount(row: BookImportRow, current: BookFull): number {
  let n = 0;
  if (row.title !== current.title) n++;
  if (row.price !== current.price) n++;
  if ((row.price_promotional ?? null) !== (current.price_promotional ?? null)) n++;
  if ((row.pages ?? null) !== (current.pages ?? null)) n++;
  if ((row.relevance ?? null) !== (current.relevance ?? null)) n++;
  if (row.is_active !== current.is_active) n++;
  if (row.is_featured !== current.is_featured) n++;
  if (row.is_new !== current.is_new) n++;
  if (row.is_bestseller !== current.is_bestseller) n++;
  if ((row.isbn ?? null) !== (current.isbn ?? null)) n++;
  if ((row.sku ?? null) !== (current.sku ?? null)) n++;
  if ((row.publisher ?? null) !== (current.publisher ?? null)) n++;
  if ((row.weight_grams ?? null) !== (current.weight_grams ?? null)) n++;
  if ((row.height_cm ?? null) !== (current.height_cm ?? null)) n++;
  if ((row.width_cm ?? null) !== (current.width_cm ?? null)) n++;
  if ((row.length_cm ?? null) !== (current.length_cm ?? null)) n++;
  if ((row.description_short ?? null) !== (current.description_short ?? null)) n++;
  return n;
}

// ─── Component ─────────────────────────────────────────────────────────────

const RELEVANCE_LABELS: Record<number, string> = {
  1: "Baixa", 2: "Média-baixa", 3: "Média", 4: "Média-alta", 5: "Alta",
};

interface PriceRule {
  relevance: number | "";
  pagesMin: string;
  pagesMax: string;
  newPrice: number | null;
  newPricePromotional: number | null;
  clearPromo: boolean;
}

type ImportStep = "idle" | "preview" | "done";
type PriceStep = "form" | "preview" | "done";

export function BatchLote({ books }: { books: BookFull[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Export state ──
  const [exporting, setExporting] = useState(false);

  // ── Import state ──
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [importParsed, setImportParsed] = useState<ParsedImport | null>(null);
  const [importResult, setImportResult] = useState<{ updated: number; blingUpdated: number; errors: string[] } | null>(null);
  const [importPending, startImportTransition] = useTransition();

  // ── Price rule state ──
  const [priceStep, setPriceStep] = useState<PriceStep>("form");
  const [rule, setRule] = useState<PriceRule>({
    relevance: "", pagesMin: "", pagesMax: "",
    newPrice: null, newPricePromotional: null, clearPromo: false,
  });
  const [priceResult, setPriceResult] = useState<{ updated: number; blingUpdated: number; errors: string[] } | null>(null);
  const [pricePending, startPriceTransition] = useTransition();

  const bookMap = new Map(books.map((b) => [b.id, b]));

  // ── Export ──
  async function handleExport() {
    setExporting(true);
    try {
      await exportXlsx(books);
      toast.success("Planilha exportada!");
    } catch {
      toast.error("Erro ao gerar planilha");
    } finally {
      setExporting(false);
    }
  }

  // ── Import ──
  async function handleFileSelect(file: File) {
    try {
      const XLSX = await import("xlsx");
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed = parseImportRows(raw as unknown[], books);
      if (parsed.rows.length === 0) {
        toast.error("Nenhuma linha válida encontrada na planilha");
        return;
      }
      setImportParsed(parsed);
      setImportStep("preview");
    } catch {
      toast.error("Erro ao ler planilha — verifique se é um arquivo XLSX válido");
    }
  }

  function handleConfirmImport() {
    if (!importParsed) return;
    startImportTransition(async () => {
      const res = await batchImportBooksAction(importParsed.rows);
      setImportResult(res);
      setImportStep("done");
      if (res.errors.length === 0) {
        toast.success(`${res.updated} livros atualizados`);
      } else {
        toast.warning(`${res.updated} atualizados, ${res.errors.length} erros`);
      }
    });
  }

  function resetImport() {
    setImportStep("idle");
    setImportParsed(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Price rule ──
  function getPriceMatching() {
    if (!rule.relevance) return [];
    return books.filter((b) => {
      if (b.relevance !== rule.relevance) return false;
      const pMin = rule.pagesMin ? parseInt(rule.pagesMin) : null;
      const pMax = rule.pagesMax ? parseInt(rule.pagesMax) : null;
      if (pMin !== null && (b.pages ?? 0) < pMin) return false;
      if (pMax !== null && (b.pages ?? 0) > pMax) return false;
      return true;
    });
  }

  const priceMatching = priceStep !== "form" ? getPriceMatching() : [];

  function handlePricePreview() {
    if (!rule.relevance) { toast.error("Selecione uma relevância"); return; }
    if (!rule.newPrice || rule.newPrice <= 0) { toast.error("Informe o novo preço"); return; }
    if (getPriceMatching().length === 0) { toast.error("Nenhum livro encontrado com esses critérios"); return; }
    setPriceStep("preview");
  }

  function handlePriceConfirm() {
    if (!rule.newPrice) return;
    const bookIds = getPriceMatching().map((b) => b.id);
    const promoValue = rule.clearPromo ? null : rule.newPricePromotional;
    startPriceTransition(async () => {
      const res = await batchUpdatePriceByRuleAction({ bookIds, newPrice: rule.newPrice!, newPricePromotional: promoValue });
      setPriceResult(res);
      setPriceStep("done");
      res.errors.length === 0
        ? toast.success(`${res.updated} livros atualizados`)
        : toast.warning(`${res.updated} atualizados, ${res.errors.length} erros no Bling`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="-mb-2 gap-1.5" onClick={() => router.push("/admin/editora/livros")}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para livros
      </Button>

      <Tabs defaultValue="planilha" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="planilha">Exportar / Importar</TabsTrigger>
          <TabsTrigger value="regra">Atualização de preço</TabsTrigger>
        </TabsList>

        {/* ── ABA 1: EXPORT / IMPORT ─────────────────────────────────── */}
        <TabsContent value="planilha" className="space-y-4">

        {/* ── EXPORT ── */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">Exportar catálogo</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Baixe todos os {books.length} livros em XLSX. Edite no Excel ou Google Sheets e faça o import abaixo.
            </p>
          </div>
          <Button variant="outline" className="gap-2 flex-shrink-0" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar XLSX
          </Button>
        </div>
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Campos editáveis: título, preço, promoção, páginas, relevância, ativo, destaque, lançamento, mais vendido, ISBN, SKU, editora, peso, dimensões, descrição curta.
          Preço, SKU e dados físicos são <strong>sincronizados automaticamente no Bling</strong> quando alterados.
          O <span className="font-mono">slug</span> identifica cada linha — não altere. Estoque é gerenciado no Bling ERP.
        </p>
      </div>

      {/* ── IMPORT ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Importar planilha</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Envie a planilha editada para atualizar todos os campos em lote.
            </p>
          </div>
          {importStep !== "idle" && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetImport}>
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {importStep === "idle" && (
          <div className="p-5">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 text-muted-foreground hover:border-brand/50 hover:text-foreground transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-8 w-8 opacity-50" />
              <div className="text-center">
                <p className="text-sm font-medium">Clique para selecionar o arquivo XLSX</p>
                <p className="text-xs mt-0.5">Apenas arquivos exportados por esta página são aceitos</p>
              </div>
            </button>
          </div>
        )}

        {importStep === "preview" && importParsed && (() => {
          const changed = importParsed.rows.filter((r) => {
            const curr = bookMap.get(r.id);
            return curr ? diffCount(r, curr) > 0 : false;
          });

          return (
            <>
              <div className="px-5 py-3 bg-secondary/30 flex flex-wrap gap-4 text-xs text-muted-foreground border-b border-border">
                <span><strong className="text-foreground">{importParsed.rows.length}</strong> linhas válidas</span>
                <span><strong className="text-foreground">{changed.length}</strong> livros com alterações</span>
                {importParsed.unknownIds.length > 0 && (
                  <span className="text-orange-600"><strong>{importParsed.unknownIds.length}</strong> slugs não encontrados</span>
                )}
                {importParsed.warnings.length > 0 && (
                  <span className="text-orange-600"><strong>{importParsed.warnings.length}</strong> avisos</span>
                )}
              </div>

              {changed.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma alteração detectada em relação ao estado atual.
                </div>
              ) : (
                <div className="overflow-y-auto max-h-72">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Título</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Preço atual</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Novo preço</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Campos alterados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {changed.map((row) => {
                        const curr = bookMap.get(row.id)!;
                        const nDiff = diffCount(row, curr);
                        return (
                          <tr key={row.id}>
                            <td className="px-5 py-2.5 font-medium line-clamp-1 max-w-[220px]">{row.title}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                              {formatCurrency(curr.price)}
                            </td>
                            <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${row.price !== curr.price ? "text-brand" : "text-foreground"}`}>
                              {formatCurrency(row.price)}
                            </td>
                            <td className="px-5 py-2.5 text-right hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">{nDiff} campo{nDiff !== 1 ? "s" : ""}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {importParsed.warnings.length > 0 && (
                <div className="px-5 py-3 border-t border-border bg-orange-50 space-y-1">
                  {importParsed.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-orange-700">{w}</p>
                  ))}
                </div>
              )}

              <div className="px-5 py-4 border-t border-border flex gap-3 justify-end">
                <Button variant="outline" onClick={resetImport}>Cancelar</Button>
                <Button
                  className="bg-brand hover:bg-brand-700 text-white gap-2"
                  onClick={handleConfirmImport}
                  disabled={importPending || changed.length === 0}
                >
                  {importPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Importando...</>
                    : <><Upload className="h-4 w-4" />Confirmar — {importParsed.rows.length} livros</>}
                </Button>
              </div>
            </>
          );
        })()}

        {importStep === "done" && importResult && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {importResult.errors.length === 0
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                : <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />}
              <div>
                <p className="font-medium text-foreground">Importação concluída</p>
                <p className="text-sm text-muted-foreground">
                  {importResult.updated} livro{importResult.updated !== 1 ? "s" : ""} atualizados na plataforma
                  {importResult.blingUpdated > 0 && ` · ${importResult.blingUpdated} sincronizados no Bling`}
                </p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1">
                <p className="text-xs font-semibold text-orange-700">Erros ({importResult.errors.length})</p>
                {importResult.errors.map((e, i) => <p key={i} className="text-xs text-orange-700 font-mono">{e}</p>)}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={resetImport}>Nova importação</Button>
          </div>
        )}
      </div>

        </TabsContent>

        {/* ── ABA 2: PRICE RULE ──────────────────────────────────────── */}
        <TabsContent value="regra">

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Atualização de preço por regra</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aplique um preço único a todos os livros de uma relevância e faixa de páginas.
          </p>
        </div>

        {priceStep === "done" && priceResult ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {priceResult.errors.length === 0
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                : <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />}
              <div>
                <p className="font-medium">Atualização concluída</p>
                <p className="text-sm text-muted-foreground">
                  {priceResult.updated} livros atualizados · {priceResult.blingUpdated} no Bling
                </p>
              </div>
            </div>
            {priceResult.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1">
                <p className="text-xs font-semibold text-orange-700">Erros no Bling ({priceResult.errors.length})</p>
                {priceResult.errors.map((e, i) => <p key={i} className="text-xs text-orange-700 font-mono">{e}</p>)}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { setPriceStep("form"); setPriceResult(null); setRule({ relevance: "", pagesMin: "", pagesMax: "", newPrice: null, newPricePromotional: null, clearPromo: false }); }}>
              Nova regra
            </Button>
          </div>
        ) : priceStep === "preview" ? (
          <>
            <div className="px-5 py-3 bg-secondary/30 border-b border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Relevância: <strong className="text-foreground">{rule.relevance} — {RELEVANCE_LABELS[rule.relevance as number]}</strong></span>
              {rule.pagesMin && <span>Páginas ≥ <strong className="text-foreground">{rule.pagesMin}</strong></span>}
              {rule.pagesMax && <span>Páginas ≤ <strong className="text-foreground">{rule.pagesMax}</strong></span>}
              <span>Novo preço: <strong className="text-foreground">{formatCurrency(rule.newPrice!)}</strong></span>
              {rule.clearPromo ? <span>Promoção: <strong className="text-foreground">removida</strong></span>
                : rule.newPricePromotional ? <span>Promoção: <strong className="text-foreground">{formatCurrency(rule.newPricePromotional)}</strong></span>
                : null}
            </div>
            <div className="overflow-y-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Título</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Páginas</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Atual</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Novo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {priceMatching.map((book) => (
                    <tr key={book.id}>
                      <td className="px-5 py-2.5 font-medium line-clamp-1 max-w-[220px]">{book.title}</td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{book.pages ?? "—"}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(book.price)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-brand">{formatCurrency(rule.newPrice!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setPriceStep("form")}>Voltar</Button>
              <Button className="bg-brand hover:bg-brand-700 text-white gap-2" onClick={handlePriceConfirm} disabled={pricePending}>
                {pricePending ? <><Loader2 className="h-4 w-4 animate-spin" />Atualizando...</> : `Confirmar — ${priceMatching.length} livros`}
              </Button>
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="relevance-rule">Relevância *</Label>
              <select
                id="relevance-rule"
                value={rule.relevance}
                onChange={(e) => setRule((r) => ({ ...r, relevance: e.target.value ? Number(e.target.value) as 1|2|3|4|5 : "" }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecionar relevância</option>
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <option key={v} value={v}>{v} — {RELEVANCE_LABELS[v]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pages-min">Páginas mínimas (opcional)</Label>
                <Input id="pages-min" type="number" min={0} value={rule.pagesMin} onChange={(e) => setRule((r) => ({ ...r, pagesMin: e.target.value }))} placeholder="ex: 100" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pages-max">Páginas máximas (opcional)</Label>
                <Input id="pages-max" type="number" min={0} value={rule.pagesMax} onChange={(e) => setRule((r) => ({ ...r, pagesMax: e.target.value }))} placeholder="ex: 300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-price">Novo preço *</Label>
                <CurrencyInput id="new-price" value={rule.newPrice} onChange={(v) => setRule((r) => ({ ...r, newPrice: v }))} nullable />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-promo">Preço promocional (opcional)</Label>
                <CurrencyInput id="new-promo" value={rule.clearPromo ? null : rule.newPricePromotional} onChange={(v) => setRule((r) => ({ ...r, newPricePromotional: v, clearPromo: false }))} nullable />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rule.clearPromo} onChange={(e) => setRule((r) => ({ ...r, clearPromo: e.target.checked, newPricePromotional: null }))} className="rounded border-border" />
              <span className="text-xs text-muted-foreground">Remover promoção existente (definir como nulo)</span>
            </label>

            {rule.relevance !== "" && (
              <div className="flex items-center gap-2 py-2 px-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {(() => {
                    const count = getPriceMatching().length;
                    return count === 0 ? "Nenhum livro encontrado com esses critérios" : `${count} livro${count !== 1 ? "s" : ""} encontrado${count !== 1 ? "s" : ""}`;
                  })()}
                </span>
              </div>
            )}

            <Button type="button" className="w-full bg-brand hover:bg-brand-700 text-white" onClick={handlePricePreview}>
              Pré-visualizar alterações
            </Button>
          </div>
        )}
      </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}
