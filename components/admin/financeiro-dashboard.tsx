"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

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

interface Props {
  movements: Movement[];
}

const PAY_COLORS: Record<string, string> = {
  pix: "#10b981",
  credito: "#3b82f6",
  debito: "#8b5cf6",
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function FinanceiroDashboard({ movements }: Props) {
  const paid = movements.filter((m) => m.status === "pago");

  const totals = {
    gross: paid.reduce((s, m) => s + m.gross_amount, 0),
    net: paid.reduce((s, m) => s + m.net_amount, 0),
    fees: paid.reduce((s, m) => s + m.gateway_fee, 0),
    shipping: paid.reduce((s, m) => s + m.shipping, 0),
    commissions: paid.reduce((s, m) => s + m.affiliate_commission, 0),
  };

  // Monthly breakdown for last 6 months
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthMoves = paid.filter((m) => {
      const mDate = m.paid_at || m.created_at;
      return mDate.startsWith(key);
    });
    return {
      name: MONTH_NAMES[d.getMonth()],
      receita: Math.round(monthMoves.reduce((s, m) => s + m.net_amount, 0)),
      bruto: Math.round(monthMoves.reduce((s, m) => s + m.gross_amount, 0)),
    };
  });

  // Payment method breakdown
  const payBreakdown = ["pix", "credito", "debito"].map((method) => {
    const count = paid.filter((m) => m.payment_method === method).length;
    return { name: method.toUpperCase(), value: count };
  });

  // Recent 20 movements
  const recent = movements.slice(0, 20);

  const STATUS_LABEL: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    cancelado: "Cancelado",
    estornado: "Estornado",
  };
  const STATUS_COLOR: Record<string, string> = {
    pago: "text-emerald-600 bg-emerald-50",
    pendente: "text-yellow-600 bg-yellow-50",
    cancelado: "text-red-600 bg-red-50",
    estornado: "text-orange-600 bg-orange-50",
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Receita Bruta", value: formatCurrency(totals.gross) },
          { label: "Receita Líquida", value: formatCurrency(totals.net) },
          { label: "Frete Cobrado", value: formatCurrency(totals.shipping) },
          { label: "Taxas Gateway", value: formatCurrency(totals.fees) },
          { label: "Comissões Afiliados", value: formatCurrency(totals.commissions) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita por mês (líquida)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.54 0.135 152)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="oklch(0.54 0.135 152)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(v as number), "Líquido"]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="oklch(0.54 0.135 152)"
                strokeWidth={2}
                fill="url(#netGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Forma de pagamento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={payBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {payBreakdown.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PAY_COLORS[entry.name.toLowerCase()] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs text-foreground">{v}</span>}
              />
              <Tooltip formatter={(v) => [`${v} pedidos`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent movements table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Últimas movimentações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Data</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Pagamento</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Bruto</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Taxa</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Líquido</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {new Intl.DateTimeFormat("pt-BR").format(new Date(m.paid_at ?? m.created_at))}
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">
                    {m.payment_method?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatCurrency(m.gross_amount)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {formatCurrency(m.gateway_fee)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-brand">
                    {formatCurrency(m.net_amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLOR[m.status] ?? "text-muted-foreground bg-secondary"
                      }`}
                    >
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
