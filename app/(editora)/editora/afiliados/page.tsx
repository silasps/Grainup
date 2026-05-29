import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DollarSign, Users, TrendingUp, Share2, CheckCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Programa de Afiliados",
  description: "Indique livros da Editora Jocum e ganhe comissão em cada venda. Programa de afiliados gratuito.",
};

const BENEFICIOS = [
  {
    icon: DollarSign,
    titulo: "Comissão por venda",
    descricao: "Ganhe até 10% de comissão em cada livro vendido pelo seu link exclusivo.",
  },
  {
    icon: Share2,
    titulo: "Link personalizado",
    descricao: "Receba um link rastreável único para compartilhar nas suas redes sociais, blog ou grupo.",
  },
  {
    icon: TrendingUp,
    titulo: "Painel de resultados",
    descricao: "Acompanhe cliques, vendas e comissões em tempo real pelo seu painel de afiliado.",
  },
  {
    icon: Users,
    titulo: "Suporte dedicado",
    descricao: "Nossa equipe apoia você com materiais, banners e dicas para divulgar melhor.",
  },
];

const PASSOS = [
  { num: "01", titulo: "Cadastre-se", descricao: "Preencha o formulário de interesse abaixo. É gratuito e leva menos de 2 minutos." },
  { num: "02", titulo: "Receba seu link", descricao: "Após aprovação, você recebe seu link exclusivo e acesso ao painel de afiliados." },
  { num: "03", titulo: "Divulgue", descricao: "Compartilhe os livros nas suas redes sociais, blog, WhatsApp ou onde preferir." },
  { num: "04", titulo: "Receba suas comissões", descricao: "As comissões são creditadas mensalmente direto na sua conta." },
];

const FAQ = [
  {
    pergunta: "Quanto custa participar?",
    resposta: "O programa é 100% gratuito. Não há nenhuma taxa ou mensalidade.",
  },
  {
    pergunta: "Quem pode se tornar afiliado?",
    resposta: "Qualquer pessoa — pastores, líderes, blogueiros, influenciadores ou leitores que queiram compartilhar bons livros.",
  },
  {
    pergunta: "Quando e como recebo minha comissão?",
    resposta: "As comissões são pagas mensalmente via Pix para valores acima de R$50 acumulados.",
  },
  {
    pergunta: "Por quanto tempo vale o cookie de rastreamento?",
    resposta: "30 dias. Se o cliente comprar dentro de 30 dias após clicar no seu link, a venda é creditada a você.",
  },
];

export default function AfiliadosPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-20">
        <div className="container mx-auto max-w-7xl px-4">
          <Badge className="mb-6 bg-brand hover:bg-brand text-white text-xs px-3 py-1">
            Programa de Afiliados
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-6 max-w-2xl">
            Indique livros e{" "}
            <span className="text-brand">ganhe comissão</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed mb-8">
            Faça parte do programa de afiliados da Editora Jocum. Compartilhe livros que transformam
            vidas e seja recompensado por cada venda gerada pelo seu link.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-brand hover:bg-brand-700 text-white font-semibold px-8" asChild>
              <Link href="#cadastro">
                Quero ser afiliado
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/auth/login">
                Já sou afiliado — entrar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="bg-brand text-white py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "+200", label: "títulos para divulgar" },
              { num: "10%", label: "de comissão" },
              { num: "30 dias", label: "de cookie" },
              { num: "Grátis", label: "para participar" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-heading text-2xl font-bold">{item.num}</p>
                <p className="text-white/70 text-sm mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Por que ser um afiliado Jocum?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Um programa pensado para quem quer gerar renda compartilhando conteúdo cristão de qualidade.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFICIOS.map(({ icon: Icon, titulo, descricao }) => (
              <div key={titulo} className="bg-card border border-border rounded-xl p-6">
                <div className="bg-brand-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Como funciona
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PASSOS.map((passo) => (
              <div key={passo.num} className="flex flex-col gap-3">
                <span className="font-heading text-4xl font-bold text-brand/20">{passo.num}</span>
                <h3 className="font-semibold text-foreground">{passo.titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{passo.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4 max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.pergunta} className="bg-card border border-border rounded-xl p-5">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-foreground mb-1">{item.pergunta}</p>
                    <p className="text-sm text-muted-foreground">{item.resposta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário de interesse */}
      <section id="cadastro" className="py-16 bg-foreground text-white">
        <div className="container mx-auto max-w-7xl px-4 max-w-lg mx-auto text-center">
          <BookOpen className="h-10 w-10 text-brand mx-auto mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-white/60 mb-8">
            Cadastre-se ou entre em contato para saber mais sobre o programa.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-brand hover:bg-brand-700 text-white font-semibold px-8" asChild>
              <Link href="/auth/cadastro">
                Criar conta gratuita
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/editora/contato">
                Falar com a equipe
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
