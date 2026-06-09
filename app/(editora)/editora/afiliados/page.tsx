import type { Metadata } from "next";
import {
  Tag, Wallet, BarChart3, Gift,
  CheckCircle, Handshake, Zap, ShoppingBag, Star, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroHighlight } from "@/components/editora/hero-highlight";
import { AfiliadoCTA } from "./afiliado-cta";
import { EntrarButton } from "./entrar-button";

export const metadata: Metadata = {
  title: "Programa de Afiliados — Editora Jocum",
  description:
    "Crie cupons de desconto, ajude pessoas a comprarem livros com desconto real e receba parte do valor na sua carteira. Grátis para participar.",
};

/* ── simulação de ganhos ────────────────────────────────────────────────── */
const CENARIOS = [
  {
    label: "Divulgador",
    cupom: 50,
    livro: 60,
    desconto: 30,
    ganho: 0,
    cor: "border-muted-foreground/30 bg-secondary/50",
    destaque: false,
    desc: "O cliente paga R$ 30 e você divulga sem custo ou retorno.",
  },
  {
    label: "Indicador",
    cupom: 20,
    livro: 60,
    desconto: 12,
    ganho: 18,
    cor: "border-brand/40 bg-brand-50/40",
    destaque: true,
    desc: "O cliente paga R$ 48. Você recebe R$ 18 na carteira.",
  },
  {
    label: "Parceiro",
    cupom: 10,
    livro: 60,
    desconto: 6,
    ganho: 24,
    cor: "border-emerald-400/40 bg-emerald-50/40",
    destaque: false,
    desc: "O cliente paga R$ 54. Você recebe R$ 24 na carteira.",
  },
];

const COMO_FUNCIONA = [
  {
    num: "01",
    icon: Handshake,
    titulo: "Cadastre-se",
    desc: "Preencha o formulário abaixo. Aprovação em até 3 dias úteis, sem custo.",
  },
  {
    num: "02",
    icon: Tag,
    titulo: "Crie seus cupons",
    desc: "No seu painel você cria cupons com o desconto que quiser (até 50%). Você decide quanto oferecer.",
  },
  {
    num: "03",
    icon: ShoppingBag,
    titulo: "Compartilhe",
    desc: "Divulgue o cupom em grupos, redes sociais ou pessoalmente. Cada uso é rastreado automaticamente.",
  },
  {
    num: "04",
    icon: Wallet,
    titulo: "Receba na carteira",
    desc: "A diferença entre os 50% da sua margem e o desconto dado vai direto para o seu saldo. Saque a partir de R$ 100 via Pix.",
  },
];

const BENEFICIOS = [
  {
    icon: Tag,
    titulo: "50% de desconto pessoal",
    desc: "Você compra qualquer livro da editora com 50% de desconto — para o seu uso.",
  },
  {
    icon: Gift,
    titulo: "Crie cupons livremente",
    desc: "Gere cupons de 1% a 50% para seus contatos. Cada cupom tem código único e rastreamento em tempo real.",
  },
  {
    icon: Wallet,
    titulo: "Ganhos automáticos",
    desc: "Cada uso de cupom credita automaticamente na sua carteira. Saque quando quiser, a partir de R$ 100.",
  },
  {
    icon: BarChart3,
    titulo: "Painel completo",
    desc: "Veja quantas vezes cada cupom foi usado, quanto você ganhou e o status do seu saldo — tudo em tempo real.",
  },
  {
    icon: Zap,
    titulo: "Sem mensalidade",
    desc: "O programa é 100% gratuito. Nenhuma taxa de entrada, nenhuma mensalidade.",
  },
  {
    icon: TrendingUp,
    titulo: "Missão que rende",
    desc: "Espalhe literatura cristã de qualidade e seja recompensado. Cada livro vendido é uma vida impactada.",
  },
];

const TIERS_LANDING = [
  { label: "Explorador",       vendas: "0–9",    margin: "30%" },
  { label: "Colaborador",      vendas: "10–24",  margin: "35%" },
  { label: "Parceiro",         vendas: "25–49",  margin: "40%" },
  { label: "Embaixador",       vendas: "50–99",  margin: "45%" },
  { label: "Embaixador Elite", vendas: "100+",   margin: "50%" },
];

const TIPOS_AFILIADO = [
  {
    tipo: "Parceiro Geral",
    quem: "Qualquer pessoa",
    margem: "30% → 50%",
    desc: "Começa com 30% de margem e sobe conforme as vendas confirmadas. Ao chegar em 100 vendas, atinge os 50% máximos.",
    destaque: false,
  },
  {
    tipo: "JOCUM",
    quem: "Missionários JOCUM ativos",
    margem: "50% fixo",
    desc: "Margem máxima desde o início, com revisão periódica de vínculo a cada 6 meses.",
    destaque: true,
  },
  {
    tipo: "Diretor de Treinamento",
    quem: "Diretores de treinamento",
    margem: "50% fixo",
    desc: "Margem máxima desde o início, sem progressão de tier.",
    destaque: false,
  },
];

const FAQ = [
  {
    q: "Quanto custa participar?",
    a: "Nada. O programa é 100% gratuito.",
  },
  {
    q: "Como funciona a lógica de ganhos?",
    a: "Você tem uma margem em cada livro (30–50% dependendo do seu nível). Se der um cupom de 20% e sua margem for 30%, você ganha 10% do valor na carteira.",
  },
  {
    q: "O que é o cookie de rastreamento?",
    a: "Quando alguém clica no seu link, um cookie de 60 dias fica no browser do visitante. Se ele comprar dentro desse período, a venda é creditada a você — mesmo sem usar um cupom.",
  },
  {
    q: "Quando posso sacar?",
    a: "Assim que acumular R$ 100 em saldo confirmado. Você solicita pelo painel e recebe via Pix em até 3 dias úteis.",
  },
  {
    q: "Posso criar mais de um cupom?",
    a: "Sim! Quantos quiser, com descontos diferentes. Você controla tudo pelo painel em tempo real.",
  },
  {
    q: "Como funciona a progressão de tier?",
    a: "Cada venda confirmada conta. Ao atingir 10 vendas sua margem sobe para 35%, 25 vendas → 40%, 50 → 45%, 100+ → 50% máximo.",
  },
];

export default function AfiliadosPage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none"
          style={{ backgroundImage: "radial-gradient(circle at 70% 40%, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="container mx-auto max-w-7xl px-4 relative">
          <Badge className="mb-5 bg-brand hover:bg-brand text-white text-xs px-3 py-1">
            Programa de Afiliados
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 max-w-3xl">
            Dê desconto real.{" "}
            <HeroHighlight>Ganhe de verdade.</HeroHighlight>
          </h1>
          <p className="text-white/75 text-lg sm:text-xl max-w-2xl leading-relaxed mb-10">
            Crie seus próprios cupons de desconto para livros da Editora Jocum.
            Você decide o desconto — e recebe a diferença automaticamente na carteira.
          </p>
          <div className="flex flex-wrap gap-3">
            <AfiliadoCTA label="Quero participar" variant="brand" />
            <EntrarButton />
          </div>

          {/* mini stats */}
          <div className="flex flex-wrap gap-6 mt-12 text-sm">
            {[
              { v: "30→50%", l: "de margem por venda" },
              { v: "50%", l: "desconto pessoal em livros" },
              { v: "60 dias", l: "de cookie de rastreamento" },
              { v: "3 d.u.", l: "prazo para saque Pix" },
            ].map(({ v, l }) => (
              <div key={l} className="flex flex-col">
                <span className="font-heading text-2xl font-bold text-white">{v}</span>
                <span className="text-white/60 text-xs mt-0.5">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona a lógica ─────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Como a lógica de ganhos funciona
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Você tem <strong>50% de margem</strong> em cada livro. O desconto que você oferece sai dessa margem.
              O que sobrar vai para a sua carteira.
            </p>
          </div>

          {/* fórmula visual */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 text-sm font-medium">
            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-brand-50 border border-brand/20">
              <span className="text-2xl font-bold text-brand">50%</span>
              <span className="text-muted-foreground text-xs mt-1">Sua margem</span>
            </div>
            <span className="text-2xl text-muted-foreground font-light">−</span>
            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-secondary border border-border">
              <span className="text-2xl font-bold text-foreground">X%</span>
              <span className="text-muted-foreground text-xs mt-1">Desconto do cupom</span>
            </div>
            <span className="text-2xl text-muted-foreground font-light">=</span>
            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-2xl font-bold text-emerald-600">(50−X)%</span>
              <span className="text-muted-foreground text-xs mt-1">Seu ganho por venda</span>
            </div>
          </div>

          {/* cenários */}
          <div className="grid sm:grid-cols-3 gap-4">
            {CENARIOS.map((c) => (
              <div key={c.label} className={`relative border rounded-2xl p-5 flex flex-col gap-3 ${c.cor}`}>
                {c.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" /> Popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{c.label}</span>
                  <Badge variant="secondary" className="text-xs">Cupom {c.cupom}% off</Badge>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">{c.desc}</div>
                <div className="border-t border-border/50 pt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Livro de</p>
                    <p className="font-bold text-foreground">R$ {c.livro},00</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Seu ganho</p>
                    <p className={`font-bold ${c.ganho > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {c.ganho > 0 ? `R$ ${c.ganho},00` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tipos de afiliado ─────────────────────────────────────────────── */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">Três formas de participar</h2>
            <p className="text-muted-foreground">Escolha o perfil que se encaixa com você.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TIPOS_AFILIADO.map(({ tipo, quem, margem, desc, destaque }) => (
              <div key={tipo} className={`relative rounded-2xl border p-6 flex flex-col gap-3 ${destaque ? "border-brand bg-brand-50/40" : "border-border bg-white"}`}>
                {destaque && <span className="absolute -top-3 left-5 bg-brand text-white text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1"><Star className="h-3 w-3" />Margem máxima</span>}
                <div>
                  <p className="font-bold text-foreground">{tipo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{quem}</p>
                </div>
                <div className="text-2xl font-bold text-brand">{margem}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tiers Parceiro Geral ───────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="text-center mb-10">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-2">Progressão de nível — Parceiro Geral</h2>
            <p className="text-muted-foreground text-sm">Sua margem cresce automaticamente conforme as vendas se acumulam.</p>
          </div>
          <div className="flex flex-col gap-2">
            {TIERS_LANDING.map((t, i) => (
              <div key={t.label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${i === 0 ? "border-border bg-secondary/50" : i === TIERS_LANDING.length - 1 ? "border-brand/30 bg-brand-50/30" : "border-border bg-white"}`}>
                <div>
                  <span className="font-semibold text-sm text-foreground">{t.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t.vendas} vendas</span>
                </div>
                <span className={`font-bold text-lg ${i === TIERS_LANDING.length - 1 ? "text-brand" : "text-foreground"}`}>{t.margin}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Passos ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center mb-14">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Do cadastro ao saque em 4 passos
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMO_FUNCIONA.map(({ num, icon: Icon, titulo, desc }) => (
              <div key={num} className="bg-white rounded-2xl p-6 border border-border flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-3xl font-bold text-brand/20">{num}</span>
                  <div className="bg-brand-50 p-2 rounded-lg">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefícios ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              O que você tem como afiliado
            </h2>
            <p className="text-muted-foreground">Tudo que você precisa para divulgar e ganhar.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFICIOS.map(({ icon: Icon, titulo, desc }) => (
              <div key={titulo} className="flex gap-4 p-5 rounded-2xl border border-border bg-card hover:border-brand/30 hover:bg-brand-50/20 transition-colors">
                <div className="bg-brand-50 p-2 rounded-lg h-fit shrink-0">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{titulo}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testemunho / CTA intermediário ────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-brand to-brand-700 text-white">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <p className="font-heading text-2xl sm:text-3xl font-bold mb-4 leading-tight">
            Cada livro vendido é uma vida impactada — e um ganho real para você.
          </p>
          <p className="text-white/75 mb-8">
            Missão e renda não são opostos. Seja um agente de transformação e seja recompensado por isso.
          </p>
          <AfiliadoCTA label="Quero participar agora" variant="white" />
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-secondary/50 border border-border rounded-xl p-5">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-foreground mb-1">{q}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
