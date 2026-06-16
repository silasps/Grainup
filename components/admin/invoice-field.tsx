"use client";

import { useState, useRef } from "react";
import { FileText, Pencil, Check, X, Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateInvoiceNumberAction } from "@/app/(admin)/admin/editora/pedidos/actions";
import { toast } from "sonner";

export function InvoiceField({
  orderId,
  initialValue,
  invoiceUrl: initialInvoiceUrl,
}: {
  orderId: string;
  initialValue: string | null;
  invoiceUrl?: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [invoiceUrl, setInvoiceUrl] = useState(initialInvoiceUrl ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function save() {
    if (draft.trim() === value) { setEditing(false); return; }
    setLoading(true);
    const { error, invoiceUrl: newUrl } = await updateInvoiceNumberAction(orderId, draft.trim());
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar NF");
    } else {
      setValue(draft.trim());
      if (newUrl) setInvoiceUrl(newUrl);
      setEditing(false);
      toast.success("Nota fiscal salva");
    }
  }

  function cancel() {
    setEditing(false);
    setDraft("");
  }

  const [fetchingDanfe, setFetchingDanfe] = useState(false);

  async function fetchDanfeUrl() {
    setFetchingDanfe(true);
    const { invoiceUrl: newUrl } = await updateInvoiceNumberAction(orderId, value);
    if (newUrl) { setInvoiceUrl(newUrl); toast.success("Link do DANFE encontrado"); }
    else toast.error("DANFE não encontrado no Bling");
    setFetchingDanfe(false);
  }

  const chave = value.replace(/\D/g, "");
  const sefazUrl = chave.length === 44
    ? `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=&nfe=${chave}`
    : null;
  const danfeUrl = invoiceUrl || null;

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Nota Fiscal</h3>
      </div>

      {editing ? (
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\s/g, ""))}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text").replace(/\s/g, "");
              setDraft(text);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            placeholder="Número ou chave NF-e (44 dígitos)"
            className="font-mono text-sm h-9 flex-1"
            maxLength={60}
          />
          <button
            onClick={save}
            disabled={loading}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shrink-0"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={cancel}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-secondary hover:bg-muted text-muted-foreground border border-border transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : value ? (
        <div className="flex items-center gap-2 group">
          <span className="font-mono text-sm text-foreground flex-1 truncate">{value}</span>
          <button
            onClick={startEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full text-left"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium group-hover:bg-amber-100 transition-colors">
            <FileText className="h-3 w-3" />
            Aguardando NF
          </span>
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para inserir
          </span>
        </button>
      )}

      {/* Links de acesso à NF-e — Bling tem prioridade, SEFAZ como fallback */}
      {danfeUrl ? (
        <a
          href={danfeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Baixar DANFE (PDF)
        </a>
      ) : chave.length === 44 ? (
        <div className="flex items-center gap-3">
          {sefazUrl && (
            <a
              href={sefazUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Consultar NF-e na SEFAZ
            </a>
          )}
          <button
            onClick={fetchDanfeUrl}
            disabled={fetchingDanfe}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Buscar link do DANFE no Bling"
          >
            {fetchingDanfe ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            {fetchingDanfe ? "Buscando..." : "Buscar DANFE no Bling"}
          </button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {value
          ? "NF vinculada ao pedido."
          : "Insira o número ou chave de acesso (44 dígitos) da NF-e."}
      </p>
    </div>
  );
}
