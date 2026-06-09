"use client";

import { useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X, Download, Upload, Mail, Phone, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { importLeadsAction } from "./actions";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  origin: string;
  book_id: string | null;
  marketing_consent: boolean;
  created_at: string;
  books: { title: string } | null;
}

const ORIGIN_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  livro: "Livro",
  home: "Home",
  checkout: "Checkout",
  cadastro: "Cadastro",
  novidades: "Novidades",
};

function originLabel(origin: string) {
  return ORIGIN_LABELS[origin] ?? origin;
}

type ParsedRow = {
  name: string;
  email: string;
  phone: string | null;
  origin: string;
  marketing_consent: boolean;
};

function parseCSVText(text: string): ParsedRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { fields.push(current); current = ""; }
        else { current += ch; }
      }
    }
    fields.push(current);
    return fields;
  }

  const raw = lines[0].replace(/^﻿/, "");
  const headers = parseLine(raw).map((h) => h.trim().toLowerCase());

  const col = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const nameCol = col(["nome", "name"]);
  const emailCol = col(["email"]);
  const phoneCol = col(["telefone", "phone", "fone"]);
  const originCol = col(["origem", "origin"]);
  const consentCol = col(["aceita_marketing", "aceita marketing", "marketing_consent", "marketing"]);

  if (nameCol === -1 || emailCol === -1) return [];

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const f = parseLine(line);
      const consentRaw = consentCol >= 0 ? (f[consentCol] ?? "").trim().toLowerCase() : "";
      return {
        name: (f[nameCol] ?? "").trim(),
        email: (f[emailCol] ?? "").trim().toLowerCase(),
        phone: phoneCol >= 0 ? (f[phoneCol] ?? "").trim() || null : null,
        origin: originCol >= 0 ? (f[originCol] ?? "").trim() || "importação" : "importação",
        marketing_consent: ["sim", "yes", "true", "1"].includes(consentRaw),
      };
    })
    .filter((r) => r.name && r.email && r.email.includes("@"));
}

function downloadTemplate() {
  const csv = "nome,email,telefone,origem,aceita_marketing\nJoão Silva,joao@email.com,(11) 99999-9999,importação,sim";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type ImportState = "idle" | "preview" | "importing" | "done";

function ImportLeadsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [parseError, setParseError] = useState("");

  function reset() {
    setState("idle");
    setRows([]);
    setResult(null);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVText(text);
      if (parsed.length === 0) {
        setParseError("Nenhum lead válido encontrado. Verifique se o arquivo tem as colunas nome e email.");
        return;
      }
      setRows(parsed);
      setState("preview");
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    setState("importing");
    const res = await importLeadsAction(rows);
    if (res.error) {
      toast.error(res.error);
      setState("preview");
      return;
    }
    setResult({ imported: res.imported ?? 0, skipped: res.skipped ?? 0 });
    setState("done");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
        </DialogHeader>

        {state === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça upload de um arquivo CSV com as colunas: <strong>nome</strong>, <strong>email</strong> (obrigatórias) e opcionalmente <strong>telefone</strong>, <strong>origem</strong>, <strong>aceita_marketing</strong> (sim/não).
            </p>
            <p className="text-sm text-muted-foreground">
              Leads com e-mail já cadastrado na plataforma serão ignorados.
            </p>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 text-sm text-brand hover:underline"
            >
              <FileText className="h-4 w-4" />
              Baixar template CSV
            </button>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-white file:cursor-pointer hover:file:bg-secondary/50"
            />
          </div>
        )}

        {(state === "preview" || state === "importing") && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{rows.length} leads</strong> encontrados no arquivo. Prévia:
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nome</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">E-mail</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Telefone</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Marketing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 truncate max-w-[120px]">{r.name}</td>
                      <td className="px-3 py-2 truncate max-w-[160px] text-muted-foreground">{r.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "—"}</td>
                      <td className="px-3 py-2">
                        {r.marketing_consent
                          ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border bg-secondary/20">
                  …e mais {rows.length - 5} leads
                </p>
              )}
            </div>
          </div>
        )}

        {state === "done" && result && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-1 rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                <p className="text-xs text-muted-foreground mt-1">importados</p>
              </div>
              <div className="flex-1 rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">ignorados (já existiam)</p>
              </div>
            </div>
            {result.imported > 0 && (
              <p className="text-sm text-muted-foreground">A lista de leads foi atualizada.</p>
            )}
          </div>
        )}

        <DialogFooter>
          {state === "idle" && (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          )}
          {state === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport}>Importar {rows.length} leads</Button>
            </>
          )}
          {state === "importing" && (
            <Button disabled>Importando…</Button>
          )}
          {state === "done" && (
            <Button onClick={() => handleClose(false)}>Concluir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportCSV(leads: Lead[]) {
  const header = ["Nome", "E-mail", "Telefone", "Origem", "Livro", "Aceita marketing", "Data"];
  const rows = leads.map((l) => [
    l.name,
    l.email,
    l.phone ?? "",
    originLabel(l.origin),
    (l.books as { title: string } | null)?.title ?? "",
    l.marketing_consent ? "Sim" : "Não",
    new Intl.DateTimeFormat("pt-BR").format(new Date(l.created_at)),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsTable({ leads, origins }: { leads: Lead[]; origins: string[] }) {
  const [query, setQuery] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterConsent, setFilterConsent] = useState<"all" | "yes" | "no">("all");
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterOrigin !== "all" && l.origin !== filterOrigin) return false;
      if (filterConsent === "yes" && !l.marketing_consent) return false;
      if (filterConsent === "no" && l.marketing_consent) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, query, filterOrigin, filterConsent]);

  const withConsent = filtered.filter((l) => l.marketing_consent).length;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de leads", value: leads.length },
          { label: "Aceitam marketing", value: leads.filter((l) => l.marketing_consent).length },
          { label: "Origens distintas", value: origins.length },
          { label: "Filtro atual", value: filtered.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {origins.length > 0 && (
          <div className={`flex items-center h-10 rounded-md border text-sm focus-within:ring-1 focus-within:ring-brand ${filterOrigin !== "all" ? "border-brand bg-brand-50" : "border-border bg-white"}`}>
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="h-full bg-transparent pl-3 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as origens</option>
              {origins.map((o) => (
                <option key={o} value={o}>{originLabel(o)}</option>
              ))}
            </select>
            {filterOrigin !== "all" && (
              <button onClick={() => setFilterOrigin("all")} className="mr-2 text-brand hover:text-brand-700">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex gap-1">
          {(["all", "yes", "no"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterConsent(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                filterConsent === v
                  ? "bg-brand border-brand text-white"
                  : "bg-white border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "all" ? "Marketing: todos" : v === "yes" ? "Aceitaram" : "Não aceitaram"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <ImportLeadsDialog open={importOpen} onOpenChange={setImportOpen} />

      {(query || filterOrigin !== "all" || filterConsent !== "all") && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} de {leads.length} leads · {withConsent} aceitam marketing
        </p>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Contato</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Origem</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Livro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Marketing</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    {query || filterOrigin !== "all" || filterConsent !== "all"
                      ? "Nenhum lead encontrado para os filtros aplicados."
                      : "Nenhum lead ainda."}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const book = lead.books as { title: string } | null;
                  return (
                    <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{lead.email}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {lead.email}
                          </a>
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              {lead.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {originLabel(lead.origin)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {book?.title ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {lead.marketing_consent ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(lead.created_at))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
