import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign, Clock, MousePointerClick, ShoppingBag,
  AlertCircle, CheckCircle2, XCircle, PauseCircle, BookOpen, TrendingUp,
} from "lucide-react";
import { CopyLinkButton } from "./copy-link-button";
import { ReviewCard } from "./review-card";
import { CouponManager } from "./coupon-manager";
import { WithdrawalPanel } from "./withdrawal-panel";

const TIERS = [
  { min: 0,   max: 9,   label: "Explorador",       margin: 30, next: 10 },
  { min: 10,  max: 24,  label: "Colaborador",       margin: 35, next: 25 },
  { min: 25,  max: 49,  label: "Parceiro",          margin: 40, next: 50 },
  { min: 50,  max: 99,  label: "Embaixador",        margin: 45, next: 100 },
  { min: 100, max: Infinity, label: "Embaixador Elite", margin: 50, next: null },
];
function getTier(sales: number) { return TIERS.find((t) => sales >= t.min && (t.max === Infinity || sales <= t.max)) ?? TIERS[0]; }

export const metadata: Metadata = {
  title: "Painel do Afiliado — Editora Jocum",
};

const STATUS_CONFIG = {
  pendente: {
    icon: Clock,
    label: "Aguardando aprovação",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    badge: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    desc: "Sua inscrição está sendo avaliada. Em até 3 dias úteis você receberá um e-mail com a resposta.",
  },
  ativo: {
    icon: CheckCircle2,
    label: "Afiliado ativo",
    color: "bg-green-50 border-green-200 text-green-800",
    badge: "bg-green-100 text-green-800 hover:bg-green-100",
    desc: null,
  },
  suspenso: {
    icon: PauseCircle,
    label: "Conta suspensa",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    badge: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    desc: "Sua conta está temporariamente suspensa. Entre em contato com a editora para mais informações.",
  },
  rejeitado: {
    icon: XCircle,
    label: "Inscrição rejeitada",
    color: "bg-red-50 border-red-200 text-red-800",
    badge: "bg-red-100 text-red-800 hover:bg-red-100",
    desc: "Sua inscrição não foi aprovada. Entre em contato com a editora se tiver dúvidas.",
  },
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PainelAfiliadoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: affiliate }, { data: roleData }, { data: contactData }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("affiliates")
      .select("id, name, email, status, commission_rate, balance, balance_pending, type, total_confirmed_sales, created_at, requires_review, next_review_at, leader_name, leader_email, leader_phone")
      .eq("user_id", user.id)
      .single() as Promise<{ data: { id: string; name: string; email: string; status: string; commission_rate: number; balance: number; balance_pending: number; type: string; total_confirmed_sales: number; created_at: string; requires_review: boolean | null; next_review_at: string | null; leader_name: string | null; leader_email: string | null; leader_phone: string | null } | null }>,
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .in("role", ["afiliado_jocum", "afiliado_diretor", "afiliado_geral", "lider_jocum"] as any)
      .single(),
    supabase.from("contact_settings").select("email").single(),
  ]);
  const contactEmail = contactData?.email ?? "";

  const hasAffiliateRole = !!roleData;

  if (!affiliate) {
    if (hasAffiliateRole) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
          <h2 className="font-heading text-xl font-bold text-foreground">Conta em configuração</h2>
          <p className="text-muted-foreground max-w-sm">
            Seu acesso de afiliado foi aprovado, mas seu perfil ainda está sendo configurado.
            Entre em contato com a editora para concluir a ativação.
          </p>
          <a
            href={contactEmail ? `mailto:${contactEmail}` : undefined}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Falar com a editora
          </a>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="font-heading text-xl font-bold text-foreground">Você ainda não é afiliado</h2>
        <p className="text-muted-foreground max-w-sm">
          Inscreva-se no programa de afiliados da Editora Jocum gratuitamente.
          Nossa equipe avalia em até 3 dias úteis.
        </p>
        <a
          href="/editora/afiliados#cadastro"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          Quero me inscrever
        </a>
      </div>
    );
  }

  const [{ data: links }, { data: sales }, { data: coupons }, { data: withdrawals }] = await Promise.all([
    supabase
      .from("affiliate_links")
      .select("id, code, clicks, book_id, created_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("affiliate_sales")
      .select("id, commission_amount, commission_rate, status, created_at, order_id")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(10),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("affiliate_coupons")
      .select("id, code, discount_percent, max_uses, uses_count, active, created_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false }) as Promise<{ data: Array<{ id: string; code: string; discount_percent: number; max_uses: number | null; uses_count: number; active: boolean; created_at: string }> | null }>,
    supabase
      .from("affiliate_withdrawals")
      .select("id, amount, status, pix_key, pix_key_type, notes, requested_at, paid_at, created_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false }),
  ]);

  const status = STATUS_CONFIG[affiliate.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = status.icon;
  const totalClicks = links?.reduce((acc, l) => acc + l.clicks, 0) ?? 0;
  const totalSales = sales?.length ?? 0;
  const isActive = affiliate.status === "ativo";

  const confirmedSales = (affiliate as { total_confirmed_sales?: number }).total_confirmed_sales ?? 0;
  const isGeral = (affiliate as { type: string }).type === "geral";
  const tier = isGeral ? getTier(confirmedSales) : null;
  const margin = tier ? tier.margin : 50;

  const reviewDays = affiliate.requires_review && affiliate.next_review_at
    ? Math.ceil((new Date(affiliate.next_review_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const reviewUrgent = reviewDays !== null && reviewDays <= 30;
  const reviewExpired = reviewDays !== null && reviewDays < 0;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";

  const KPIS = [
    {
      label: "Saldo disponível",
      value: formatBRL(affiliate.balance ?? 0),
      icon: DollarSign,
      sub: "Disponível para saque via Pix",
      highlight: isActive,
    },
    {
      label: "Saldo pendente",
      value: formatBRL(affiliate.balance_pending ?? 0),
      icon: Clock,
      sub: "Aguardando confirmação",
      highlight: false,
    },
    {
      label: "Total de cliques",
      value: totalClicks.toLocaleString("pt-BR"),
      icon: MousePointerClick,
      sub: "Em todos os seus links",
      highlight: false,
    },
    {
      label: "Vendas geradas",
      value: totalSales.toLocaleString("pt-BR"),
      icon: ShoppingBag,
      sub: "via cupons de desconto",
      highlight: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Status banner */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${status.color}`}>
        <StatusIcon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{status.label}</span>
            <Badge className={`text-xs px-2 py-0.5 ${status.badge}`}>
              {affiliate.type === "jocum" ? "JOCUM" : "Diretor / Parceiro"}
            </Badge>
          </div>
          {status.desc && <p className="text-sm mt-1 opacity-80">{status.desc}</p>}
        </div>
        <span className="text-xs opacity-60 shrink-0 hidden sm:block">
          Desde {new Date(affiliate.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {/* Barra de progresso de ganhos — JOCUM */}
      {affiliate.type === "jocum" && isActive && (() => {
        const META = 100;
        const ganho = affiliate.balance ?? 0;
        const pendente = affiliate.balance_pending ?? 0;
        const total = ganho + pendente;
        const pct = Math.min(100, Math.round((total / META) * 100));
        const pctConfirmado = Math.min(100, Math.round((ganho / META) * 100));
        const atingiu = ganho >= META;
        return (
          <Card className="bg-white border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {atingiu ? "🎉 Saque disponível!" : "Progresso para o próximo saque"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mínimo para saque via Pix: {formatBRL(META)}
                  </p>
                </div>
                <span className={`font-heading text-lg font-bold ${atingiu ? "text-brand" : "text-foreground"}`}>
                  {pct}%
                </span>
              </div>
              {/* Track */}
              <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                {/* Pendente (fundo) */}
                <div
                  className="absolute inset-y-0 left-0 bg-brand/20 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
                {/* Confirmado (frente) */}
                <div
                  className="absolute inset-y-0 left-0 bg-brand rounded-full transition-all duration-700"
                  style={{ width: `${pctConfirmado}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand inline-block" />
                    Confirmado {formatBRL(ganho)}
                  </span>
                  {pendente > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-brand/20 inline-block" />
                      Pendente {formatBRL(pendente)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {atingiu ? "Solicite o saque" : `Faltam ${formatBRL(Math.max(0, META - ganho))}`}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map(({ label, value, icon: Icon, sub, highlight }) => (
          <Card key={label} className={`border ${highlight && isActive ? "border-brand/30 bg-brand-50/30" : "border-border bg-white"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <div className={`p-1.5 rounded-md ${highlight && isActive ? "bg-brand-100" : "bg-secondary"}`}>
                  <Icon className={`h-4 w-4 ${highlight && isActive ? "text-brand" : "text-muted-foreground"}`} />
                </div>
              </div>
              <p className={`text-xl font-bold font-heading ${highlight && isActive ? "text-brand" : "text-foreground"}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Links */}
        <Card id="links" className="bg-white border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Meus links de afiliado</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {!isActive ? (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Seus links estarão disponíveis após a aprovação da conta.
                </p>
              </div>
            ) : links && links.length > 0 ? (
              <div className="flex flex-col gap-3">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/60 border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {link.book_id ? "Link de livro" : "Link geral"}
                      </p>
                      <p className="text-sm font-mono text-foreground truncate">
                        {baseUrl}/r/{link.code}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{link.clicks} cliques</p>
                    </div>
                    <CopyLinkButton url={`${baseUrl}/r/${link.code}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhum link gerado ainda. Entre em contato com a editora.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendas recentes */}
        <Card id="vendas" className="bg-white border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Vendas recentes</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {!isActive ? (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Suas vendas aparecerão aqui após a aprovação da conta.
                </p>
              </div>
            ) : sales && sales.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-sm text-foreground">Pedido #{sale.order_id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        +{formatBRL(sale.commission_amount)}
                      </p>
                      <Badge
                        className={`text-xs px-1.5 py-0 ${
                          sale.status === "paga"
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : sale.status === "confirmada"
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                            : sale.status === "cancelada"
                            ? "bg-red-100 text-red-700 hover:bg-red-100"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                        }`}
                      >
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma venda ainda. Compartilhe seu link e comece a ganhar!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tier card — afiliado geral */}
      {isActive && isGeral && tier && (
        <Card className="bg-white border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Seu nível atual</p>
                <p className="font-bold text-lg text-foreground">{tier.label}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-brand">{tier.margin}%</p>
                <p className="text-xs text-muted-foreground">de margem</p>
              </div>
            </div>
            {tier.next && (
              <>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-2">
                  <div className="absolute inset-y-0 left-0 bg-brand rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((confirmedSales / tier.next) * 100))}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {confirmedSales}/{tier.next} vendas para o próximo nível ({tier.margin + 5}% de margem)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saque */}
      {isActive && (
        <WithdrawalPanel
          balance={affiliate.balance ?? 0}
          initialWithdrawals={(withdrawals ?? []) as Parameters<typeof WithdrawalPanel>[0]["initialWithdrawals"]}
        />
      )}

      {/* Cupons */}
      {isActive && (
        <CouponManager
          initialCoupons={coupons ?? []}
          balance={affiliate.balance ?? 0}
        />
      )}

      {/* Card de avaliação periódica */}
      {affiliate.requires_review && affiliate.next_review_at && (
        <ReviewCard
          affiliateId={affiliate.id}
          nextReviewAt={affiliate.next_review_at}
          reviewDays={reviewDays!}
          reviewUrgent={reviewUrgent}
          reviewExpired={reviewExpired}
          leaderName={affiliate.leader_name}
          leaderEmail={affiliate.leader_email}
          leaderPhone={affiliate.leader_phone}
        />
      )}

      {/* Regras rápidas */}
      {isActive && (
        <Card className="bg-white border-border">
          <CardContent className="p-5">
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              {[
                { label: "Sua margem", value: `${margin}%`, sub: tier ? `${tier.label} · sobe conforme vendas` : "Margem fixa" },
                { label: "Desconto pessoal", value: "50%", sub: "na compra de qualquer livro" },
                { label: "Saque mínimo", value: "R$ 100", sub: "via Pix · até 3 dias úteis" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-heading text-lg font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
