"use client";

import { useState, useTransition, useEffect } from "react";
import { AdminHeader } from "@/components/admin/header";
import { getContratosAction, createContratoAction, deleteContratoAction, updateAndResendContratoAction, type ContratoRow } from "./actions";
import { Copy, Check, Plus, ExternalLink, X, Loader2, FileSignature, Trash2, Pencil, Send } from "lucide-react";
import { CONTRATOS_REGISTRY } from "@/lib/contratos/content";

const CONTRACT_TYPE_OPTIONS = Object.values(CONTRATOS_REGISTRY).map((c) => ({
  slug: c.slug,
  label: `${c.subtitulo} — ${c.valor}`,
}));

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pendente: { label: "Aguardando", className: "bg-amber-50 text-amber-700 border-amber-200" },
    assinado: { label: "Assinado", className: "bg-green-50 text-green-700 border-green-200" },
    expirado: { label: "Expirado", className: "bg-red-50 text-red-600 border-red-200" },
  };
  const s = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      {s.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} title="Copiar" className="text-slate-400 hover:text-slate-700 transition-colors">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function EvidenceDialog({ contrato, onClose }: { contrato: ContratoRow; onClose: () => void }) {
  const ev = contrato.evidence_json;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-slate-800">Evidência da assinatura</p>
            <p className="text-xs text-slate-400">{contrato.client_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {ev ? (
            <pre className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(ev, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Contrato ainda não assinado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditEmailDialog({
  contrato,
  onClose,
  onSaved,
}: {
  contrato: ContratoRow;
  onClose: () => void;
  onSaved: (newEmail: string) => void;
}) {
  const [email, setEmail] = useState(contrato.client_email);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setError("");
    startTransition(async () => {
      const res = await updateAndResendContratoAction(contrato.id, email);
      if (res.error) { setError(res.error); return; }
      setSent(true);
      onSaved(email);
      setTimeout(onClose, 1800);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-slate-800">Editar e reenviar link</p>
            <p className="text-xs text-slate-400">{contrato.client_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">E-mail do cliente</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {sent ? (
            <div className="flex items-center gap-2 justify-center py-2 text-green-600 text-sm font-medium">
              <Check className="h-4 w-4" />
              E-mail atualizado e reenviado!
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={!email.trim() || isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#0f172a] text-white hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPending ? "Enviando…" : "Salvar e reenviar link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewContratoDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (url: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contractSlug, setContractSlug] = useState(CONTRACT_TYPE_OPTIONS[0]?.slug ?? "editora-jocum-v1");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError("");
    startTransition(async () => {
      const res = await createContratoAction(name, email, contractSlug);
      if (res.error) { setError(res.error); return; }
      const url = `${SITE}/contrato/${res.token}`;
      onCreated(url);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-slate-800">Gerar link de assinatura</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tipo de contrato</label>
            <select
              value={contractSlug}
              onChange={(e) => setContractSlug(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 bg-white"
            >
              {CONTRACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.slug} value={opt.slug}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome do cliente</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marcos de Souza Borges"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">E-mail do cliente</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="editorajocum@gmail.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !email.trim() || isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#0f172a] text-white hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Gerar link
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessLinkDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-slate-800">Link gerado com sucesso</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Copie o link abaixo e envie para o cliente via WhatsApp ou e-mail.
          </p>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <span className="text-xs text-slate-600 break-all flex-1">{url}</span>
            <button
              onClick={copy}
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir link
          </a>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#0f172a] text-white hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<ContratoRow | null>(null);
  const [editingContrato, setEditingContrato] = useState<ContratoRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getContratosAction().then((data) => {
      setContratos(data);
      setLoading(false);
    });
  }, []);

  function handleCreated(url: string) {
    setShowNew(false);
    setGeneratedUrl(url);
    // Refresh list
    getContratosAction().then(setContratos);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Contratos" subtitle="Assinaturas digitais" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Cabeçalho da seção */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Contratos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gere um link e envie via WhatsApp para o cliente assinar
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0f172a] text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Gerar link
          </button>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : contratos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                <FileSignature className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Nenhum contrato ainda</p>
              <button
                onClick={() => setShowNew(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Gerar o primeiro link →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden sm:table-cell">Criado em</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Assinado em</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contratos.map((c) => {
                    const signingUrl = `${SITE}/contrato/${c.token}`;
                    const isExpired =
                      c.status !== "assinado" && new Date(c.expires_at) < new Date();
                    const displayStatus = isExpired ? "expirado" : c.status;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-foreground text-sm">{c.client_name}</p>
                          <p className="text-xs text-muted-foreground">{c.client_email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={displayStatus} />
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                          {c.signed_at
                            ? new Date(c.signed_at).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 justify-end">
                            {c.status === "assinado" && (
                              <button
                                onClick={() => setSelectedEvidence(c)}
                                className="text-xs text-blue-600 hover:underline font-medium"
                              >
                                Ver evidência
                              </button>
                            )}
                            {c.status === "pendente" && !isExpired && (
                              <>
                                <CopyButton text={signingUrl} />
                                <a
                                  href={signingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-slate-700"
                                  title="Abrir link"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </>
                            )}
                            {c.status !== "assinado" && (
                              <button
                                onClick={() => setEditingContrato(c)}
                                className="text-slate-300 hover:text-blue-500 transition-colors"
                                title="Editar e-mail / reenviar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {c.status !== "assinado" && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Excluir contrato de ${c.client_name}?`)) return;
                                  setDeletingId(c.id);
                                  await deleteContratoAction(c.id);
                                  setContratos((prev) => prev.filter((x) => x.id !== c.id));
                                  setDeletingId(null);
                                }}
                                disabled={deletingId === c.id}
                                className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                                title="Excluir"
                              >
                                {deletingId === c.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingContrato && (
        <EditEmailDialog
          contrato={editingContrato}
          onClose={() => setEditingContrato(null)}
          onSaved={(newEmail) => {
            setContratos((prev) =>
              prev.map((c) => c.id === editingContrato.id ? { ...c, client_email: newEmail } : c)
            );
          }}
        />
      )}
      {showNew && (
        <NewContratoDialog
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
      {generatedUrl && (
        <SuccessLinkDialog
          url={generatedUrl}
          onClose={() => setGeneratedUrl(null)}
        />
      )}
      {selectedEvidence && (
        <EvidenceDialog
          contrato={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
}
