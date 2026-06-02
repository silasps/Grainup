import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { HeroHighlight } from "@/components/editora/hero-highlight";

export interface LegalPageConfig {
  badge: string;
  icon: LucideIcon;
  title: string;
  titleAccent: string;
  description: string;
  highlights: { icon: LucideIcon; label: string }[];
}

interface LegalPage {
  title: string;
  content: string;
  updated_at: string;
}

interface Props {
  config: LegalPageConfig;
  page: LegalPage;
}

export function LegalPageLayout({ config, page }: Props) {
  const Icon = config.icon;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-20">
        <div className="container mx-auto max-w-7xl px-4">
          <Badge className="mb-6 bg-brand hover:bg-brand text-white text-xs px-3 py-1">
            {config.badge}
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-6 max-w-2xl">
            {config.title}{" "}
            <HeroHighlight>{config.titleAccent}</HeroHighlight>
          </h1>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            {config.description}
          </p>
        </div>
      </section>

      {/* Highlights strip */}
      {config.highlights.length > 0 && (
        <section className="bg-brand text-white py-8">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
              {config.highlights.map((h) => {
                const HIcon = h.icon;
                return (
                  <div key={h.label} className="flex flex-col items-center gap-1.5">
                    <HIcon className="h-5 w-5" />
                    <span>{h.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-14">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-brand-50 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-brand" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">{page.title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-8 pl-[52px]">
            Atualizado em{" "}
            {new Date(page.updated_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>

          <div className="bg-card rounded-2xl border border-border p-8 sm:p-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="font-heading text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-heading text-xl font-bold text-foreground mt-8 mb-3 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-heading text-base font-semibold text-foreground mt-6 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed mb-4 last:mb-0">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1.5 text-muted-foreground mb-4 ml-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground mb-4 ml-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-brand hover:text-brand-700 hover:underline transition-colors"
                    target={href?.startsWith("http") ? "_blank" : undefined}
                    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-brand pl-4 py-1 my-4 bg-brand-50 rounded-r-lg text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.startsWith("language-");
                  if (isBlock) {
                    return (
                      <pre className="bg-secondary border border-border rounded-xl p-4 overflow-x-auto my-4">
                        <code className="text-xs font-mono text-foreground">{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono text-foreground">
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="w-full text-sm border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead>
                    <tr className="border-b border-border">{children}</tr>
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="text-left py-3 pr-4 font-semibold text-foreground">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="py-3 pr-4 text-muted-foreground border-b border-border/50 align-top">
                    {children}
                  </td>
                ),
                hr: () => <hr className="border-border my-8" />,
              }}
            >
              {page.content}
            </ReactMarkdown>
          </div>
        </div>
      </section>
    </div>
  );
}
