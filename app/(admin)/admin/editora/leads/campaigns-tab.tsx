"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  MailOpen,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createCampaignAction, sendCampaignAction, deleteCampaignAction } from "./actions";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  body: string;
  segment: string;
  status: string;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  all: "Todos os leads",
  with_consent: "Somente com consentimento",
  "origin:newsletter": "Origem: Newsletter",
  "origin:livro": "Origem: Livro",
  "origin:home": "Origem: Home",
  "origin:checkout": "Origem: Checkout",
  "origin:cadastro": "Origem: Cadastro",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sending: { label: "Enviando…", variant: "default" },
  sent: { label: "Enviada", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

function NewCampaignForm({
  onClose,
  totalLeads,
  consentLeads,
}: {
  onClose: () => void;
  totalLeads: number;
  consentLeads: number;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    subject: "",
    body: "",
    segment: "with_consent",
  });

  const SEGMENT_COUNTS: Record<string, string> = {
    all: `${totalLeads} destinatários`,
    with_consent: `${consentLeads} destinatários`,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    startTransition(async () => {
      const result = await createCampaignAction(form);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Campanha criada como rascunho.");
        onClose();
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Nova campanha</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Título interno *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Promoção de Natal 2025"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Assunto do e-mail *
            </label>
            <Input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ex: 🎁 Até 40% off — só hoje!"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Segmento de envio
          </label>
          <select
            value={form.segment}
            onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.entries(SEGMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l} {SEGMENT_COUNTS[v] ? `— ${SEGMENT_COUNTS[v]}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Corpo do e-mail * <span className="text-muted-foreground/60">(texto simples, use quebras de linha)</span>
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder={"Temos novidades incríveis para você!\n\nConfira nossa promoção em: https://..."}
            rows={6}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar rascunho
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CampaignsTab({
  campaigns: initialCampaigns,
  totalLeads,
  consentLeads,
}: {
  campaigns: Campaign[];
  totalLeads: number;
  consentLeads: number;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function handleFormClose() {
    setShowForm(false);
    // revalidation happens server-side; reload to get fresh data
    window.location.reload();
  }

  async function handleSend(campaign: Campaign) {
    if (sending) return;
    const confirmed = window.confirm(
      `Enviar "${campaign.title}" para ${SEGMENT_LABELS[campaign.segment] ?? campaign.segment}?\n\nEssa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setSending(campaign.id);
    const result = await sendCampaignAction(campaign.id);
    setSending(null);

    if (result.error) {
      toast.error(result.error);
    } else if ("simulated" in result && result.simulated) {
      toast.success(
        `Simulação: ${result.sent} e-mails seriam enviados. Configure RESEND_API_KEY para envio real.`,
        { duration: 8000 }
      );
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? { ...c, status: "sent", sent_count: result.sent ?? 0, sent_at: new Date().toISOString() }
            : c
        )
      );
    } else {
      toast.success(`${result.sent} e-mails enviados com sucesso!`);
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? { ...c, status: "sent", sent_count: result.sent ?? 0, sent_at: new Date().toISOString() }
            : c
        )
      );
    }
  }

  async function handleDelete(campaign: Campaign) {
    if (deleting) return;
    setDeleting(campaign.id);
    const result = await deleteCampaignAction(campaign.id);
    setDeleting(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      toast.success("Rascunho removido.");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-foreground">Campanhas de e-mail</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalLeads} leads no total · {consentLeads} com consentimento de marketing
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova campanha
          </Button>
        )}
      </div>

      {showForm && (
        <NewCampaignForm
          onClose={handleFormClose}
          totalLeads={totalLeads}
          consentLeads={consentLeads}
        />
      )}

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          Nenhuma campanha criada ainda. Crie a primeira acima!
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const statusCfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
            const isDraft = campaign.status === "draft";
            const isSending = campaign.status === "sending" || sending === campaign.id;

            return (
              <div
                key={campaign.id}
                className="bg-white rounded-xl border border-border p-4 flex items-start gap-4"
              >
                <div className="p-2 rounded-lg bg-brand/10 mt-0.5">
                  <MailOpen className="h-4 w-4 text-brand" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-sm">{campaign.title}</p>
                    <Badge variant={statusCfg.variant} className="text-xs">
                      {isSending ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Enviando…
                        </span>
                      ) : (
                        statusCfg.label
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Assunto: {campaign.subject}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {SEGMENT_LABELS[campaign.segment] ?? campaign.segment}
                    </span>
                    {campaign.status === "sent" && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        {campaign.sent_count.toLocaleString("pt-BR")} enviados
                        {campaign.sent_at &&
                          ` · ${new Intl.DateTimeFormat("pt-BR").format(new Date(campaign.sent_at))}`}
                      </span>
                    )}
                    {campaign.status === "failed" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Falhou — tente novamente
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(isDraft || campaign.status === "failed") && (
                    <Button
                      size="sm"
                      onClick={() => handleSend(campaign)}
                      disabled={!!sending}
                      className="gap-1.5"
                    >
                      {sending === campaign.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Enviar
                    </Button>
                  )}
                  {isDraft && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(campaign)}
                      disabled={!!deleting}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deleting === campaign.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
