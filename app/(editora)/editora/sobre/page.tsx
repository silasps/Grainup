import type { Metadata } from "next";
import { BookOpen, Heart, Globe, Users, Award, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Nossa História",
  description:
    "Conheça a história da Editora Jocum e nossa missão de publicar livros que transformam vidas através do evangelho.",
};

const MARCOS = [
  { ano: "1960", titulo: "Fundação da JOCUM", descricao: "Loren Cunningham funda Jovens Com Uma Missão em Lausanne, Suíça, com a visão de enviar jovens ao redor do mundo." },
  { ano: "1974", titulo: "JOCUM no Brasil", descricao: "A JOCUM chega ao Brasil trazendo sua visão missionária para o contexto latino-americano." },
  { ano: "1985", titulo: "Início da Editora", descricao: "Nasce a Editora Jocum com o propósito de disponibilizar literatura cristã de qualidade para igrejas e missionários." },
  { ano: "2000", titulo: "Expansão do Catálogo", descricao: "A editora expande seu catálogo para mais de 100 títulos, alcançando leitores em todo o Brasil e no exterior." },
  { ano: "2010", titulo: "Distribuição Nacional", descricao: "A editora fortalece sua rede de distribuição nacional, chegando a livrarias, igrejas e escolas bíblicas em todos os estados." },
  { ano: "2024", titulo: "Hoje", descricao: "Com mais de 200 títulos, a Editora Jocum segue publicando obras que formam missionários, líderes e discípulos de Cristo." },
];

const VALORES = [
  { icon: Heart, titulo: "Paixão pelo evangelho", descricao: "Cada livro publicado tem o propósito de levar pessoas a um relacionamento mais profundo com Deus." },
  { icon: Globe, titulo: "Visão missionária", descricao: "Nosso DNA é missionário. Publicamos para equipar pessoas a alcançar as nações." },
  { icon: BookOpen, titulo: "Excelência editorial", descricao: "Comprometidos com conteúdo bíblico sólido, bem escrito e aplicável ao cotidiano." },
  { icon: Users, titulo: "Comunidade", descricao: "Fazemos parte de uma família global — JOCUM — presente em mais de 180 países." },
  { icon: Award, titulo: "Integridade", descricao: "Operamos com transparência e responsabilidade em tudo que fazemos." },
  { icon: Target, titulo: "Propósito", descricao: "Não publicamos por lucro, mas para cumprir a Grande Comissão por meio da literatura." },
];

export default function SobrePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-background py-20 border-b border-border">
        <div className="container mx-auto max-w-7xl px-4">
          <Badge className="mb-6 bg-brand hover:bg-brand text-white text-xs px-3 py-1">
            Nossa História
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-6 max-w-2xl text-foreground">
            Publicando para{" "}
            <span className="text-brand relative inline-block pb-1">
              transformar vidas
              <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6 Q100 2 198 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-200" />
              </svg>
            </span>{" "}
            há décadas
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
            A Editora Jocum nasceu do coração missionário da JOCUM — Jovens Com Uma Missão.
            Somos movidos pelo propósito de colocar nas mãos das pessoas literatura que forma,
            inspira e equipa para o chamado de Deus.
          </p>
        </div>
      </section>

      {/* Números */}
      <section className="bg-secondary py-10 border-b border-border">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "+200", label: "títulos publicados" },
              { num: "+40", label: "anos de história" },
              { num: "180+", label: "países — JOCUM global" },
              { num: "Milhões", label: "de leitores impactados" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-heading text-2xl font-bold text-foreground">{item.num}</p>
                <p className="text-muted-foreground text-sm mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Missão */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Nossa missão
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A Editora Jocum existe para publicar literatura cristã que equipa missionários,
                líderes, pastores e toda pessoa que deseja crescer em sua caminhada de fé.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Fazemos parte da JOCUM — Jovens Com Uma Missão —, uma das maiores organizações
                missionárias do mundo, presente em mais de 180 países. Esse DNA missionário
                está em cada livro que publicamos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Acreditamos que a palavra impressa tem poder de transformar gerações.
                Por isso, trabalhamos com dedicação para que cada publicação seja bíblica,
                relevante e acessível a todos.
              </p>
            </div>
            <div className="bg-brand-50 rounded-2xl p-8 border border-brand/10">
              <blockquote className="text-lg font-medium text-foreground leading-relaxed italic">
                "Conhecereis a verdade, e a verdade vos libertará."
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground">— João 8:32</p>
              <div className="mt-6 pt-6 border-t border-brand/10">
                <p className="text-sm text-muted-foreground">
                  Este versículo resume nossa crença: a literatura cristã séria liberta pessoas,
                  transforma famílias e avança o Reino de Deus.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Nossos valores
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Os princípios que guiam cada decisão editorial e cada relacionamento que construímos.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALORES.map(({ icon: Icon, titulo, descricao }) => (
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

      {/* Linha do tempo */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Nossa trajetória
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-16 top-0 bottom-0 w-px bg-border" />
              <div className="flex flex-col gap-8">
                {MARCOS.map((marco) => (
                  <div key={marco.ano} className="flex gap-8 items-start relative">
                    <div className="w-16 shrink-0 text-right">
                      <span className="font-heading font-bold text-brand text-sm">{marco.ano}</span>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-brand border-2 border-white shadow-sm" />
                      <div className="pl-4">
                        <h3 className="font-semibold text-foreground mb-1">{marco.titulo}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{marco.descricao}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-foreground text-white">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <BookOpen className="h-10 w-10 text-brand mx-auto mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
            Explore nosso catálogo
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Mais de 200 títulos sobre missões, liderança, família, oração e vida cristã esperando por você.
          </p>
          <a
            href="/editora/livros"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Ver todos os livros
          </a>
        </div>
      </section>
    </div>
  );
}
