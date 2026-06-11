import { createAdminClient } from "@/lib/supabase/server";
import { Mail, Users, Truck, Package, CreditCard, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

// ─── limits ────────────────────────────────────────────────────────────────────

const RESEND_MONTHLY_LIMIT = 3_000;
const RESEND_DAILY_LIMIT = 100;
const SUPABASE_MAU_LIMIT = 50_000;

// ─── data fetching ─────────────────────────────────────────────────────────────

async function getServiceLimitsData() {
  const supabase = await createAdminClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { count: emailsMonth },
    { count: emailsToday },
    { count: totalUsers },
    blingResult,
  ] = await Promise.all([
    supabase.from("email_logs").select("id", { count: "exact", head: true }).gte("sent_at", startOfMonth),
    supabase.from("email_logs").select("id", { count: "exact", head: true }).gte("sent_at", startOfDay),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("bling_tokens").select("expires_at, updated_at").eq("id", 1).maybeSingle(),
  ]);

  const meTokenExpiry = parseMeTokenExpiry();
  const blingExpiry = blingResult.data?.expires_at ? new Date(blingResult.data.expires_at) : null;

  return {
    resend: { month: emailsMonth ?? 0, today: emailsToday ?? 0 },
    supabase: { mau: totalUsers ?? 0 },
    melhorEnvio: { expiresAt: meTokenExpiry, sandbox: process.env.MELHOR_ENVIO_SANDBOX === "true" },
    bling: { expiresAt: blingExpiry, configured: !!process.env.BLING_CLIENT_ID },
    mercadopago: { configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN },
  };
}

function parseMeTokenExpiry(): Date | null {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return decoded.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function pct(used: number, limit: number) {
  return Math.min(Math.round((used / limit) * 100), 100);
}

function barColor(p: number) {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
      {label}
    </span>
  );
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const p = pct(used, limit);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{used.toLocaleString("pt-BR")} / {limit.toLocaleString("pt-BR")}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor(p)}`} style={{ width: `${p}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-right">{p}% utilizado</p>
    </div>
  );
}

function TokenExpiry({ expiresAt }: { expiresAt: Date | null }) {
  const days = daysUntil(expiresAt);
  if (days === null) return <p className="text-xs text-muted-foreground">Token não configurado</p>;
  const isExpired = days <= 0;
  const isWarning = days <= 14;
  return (
    <div className={`flex items-center gap-2 text-sm ${isExpired ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"}`}>
      <Clock className="size-3.5 shrink-0" />
      {isExpired
        ? `Expirado há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`
        : `Expira em ${days} dia${days !== 1 ? "s" : ""}`}
      {expiresAt && (
        <span className="text-muted-foreground text-xs">({expiresAt.toLocaleDateString("pt-BR")})</span>
      )}
    </div>
  );
}

// ─── cards ─────────────────────────────────────────────────────────────────────

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-muted rounded-lg text-muted-foreground">{icon}</div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── component ─────────────────────────────────────────────────────────────────

export async function ServiceLimits() {
  const data = await getServiceLimitsData();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Limites de Serviços Gratuitos</h2>
        <p className="text-xs text-muted-foreground">Plano gratuito · atualizado agora</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Resend */}
        <Card icon={<Mail className="size-4" />} title="Resend — Email">
          <div className="space-y-4">
            <UsageBar used={data.resend.month} limit={RESEND_MONTHLY_LIMIT} label="Este mês" />
            <UsageBar used={data.resend.today} limit={RESEND_DAILY_LIMIT} label="Hoje" />
            <p className="text-xs text-muted-foreground">Plano Free: 3.000/mês · 100/dia</p>
          </div>
        </Card>

        {/* Supabase Auth */}
        <Card icon={<Users className="size-4" />} title="Supabase — Usuários (MAU)">
          <div className="space-y-4">
            <UsageBar used={data.supabase.mau} limit={SUPABASE_MAU_LIMIT} label="Usuários cadastrados" />
            <p className="text-xs text-muted-foreground">Plano Free: 50.000 MAU · inclui Google OAuth</p>
          </div>
        </Card>

        {/* Melhor Envio */}
        <Card icon={<Truck className="size-4" />} title="Melhor Envio — Token">
          <div className="space-y-2">
            {data.melhorEnvio.sandbox && (
              <StatusBadge ok={false} label="Modo Sandbox ativo" />
            )}
            <TokenExpiry expiresAt={data.melhorEnvio.expiresAt} />
            <p className="text-xs text-muted-foreground mt-1">
              Token API · renove em{" "}
              <a href="https://melhorenvio.com.br/painel/gerenciar/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                melhorenvio.com.br
              </a>
            </p>
          </div>
        </Card>

        {/* Bling */}
        <Card icon={<Package className="size-4" />} title="Bling — OAuth Token">
          <div className="space-y-2">
            <StatusBadge ok={data.bling.configured} label={data.bling.configured ? "Credenciais configuradas" : "Não configurado"} />
            <TokenExpiry expiresAt={data.bling.expiresAt} />
            <p className="text-xs text-muted-foreground mt-1">
              Token expira em 1h · renovado automaticamente pelo webhook
            </p>
          </div>
        </Card>

        {/* MercadoPago */}
        <Card icon={<CreditCard className="size-4" />} title="MercadoPago">
          <div className="space-y-2">
            <StatusBadge ok={data.mercadopago.configured} label={data.mercadopago.configured ? "Token configurado" : "Não configurado"} />
            <p className="text-xs text-muted-foreground">
              Sem limites de plano — cobranças por transação · sem cota mensal
            </p>
          </div>
        </Card>

      </div>
    </section>
  );
}
