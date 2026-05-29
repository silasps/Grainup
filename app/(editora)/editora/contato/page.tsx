"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ASSUNTOS = [
  "Pedido / Entrega",
  "Dúvida sobre produto",
  "Troca ou devolução",
  "Parceria / Afiliados",
  "Imprensa",
  "Outro",
];

const INFO = [
  {
    icon: Phone,
    titulo: "Telefone / WhatsApp",
    linhas: ["(41) 9914-35610"],
    href: "https://wa.me/5541991435610",
  },
  {
    icon: Mail,
    titulo: "E-mail",
    linhas: ["contato@editorajocum.com.br"],
    href: "mailto:contato@editorajocum.com.br",
  },
  {
    icon: MapPin,
    titulo: "Endereço",
    linhas: ["Almirante Tamandaré, PR", "Brasil"],
    href: null,
  },
  {
    icon: Clock,
    titulo: "Horário de atendimento",
    linhas: ["Seg – Sex: 8h às 18h", "Sábado: 8h às 12h"],
    href: null,
  },
];

export default function ContatoPage() {
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [assunto, setAssunto] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);
    // Simula envio — integrar com Resend/SendGrid futuramente
    await new Promise((r) => setTimeout(r, 1000));
    setCarregando(false);
    setEnviado(true);
  }

  return (
    <div>
      {/* Hero — mesmo padrão da home */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-14">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <Send className="h-5 w-5 text-brand" />
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Atendimento</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            Fale conosco
          </h1>
          <p className="text-white/65 max-w-xl leading-relaxed">
            Estamos aqui para ajudar. Envie sua mensagem e retornaremos em até 1 dia útil.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-[1fr_380px] gap-12">

            {/* Formulário */}
            <div>
              {enviado ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="h-14 w-14 text-brand mb-4" />
                  <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                    Mensagem enviada!
                  </h2>
                  <p className="text-muted-foreground max-w-sm">
                    Recebemos sua mensagem e responderemos em breve. Obrigado pelo contato.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setEnviado(false)}
                  >
                    Enviar nova mensagem
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" name="nome" placeholder="Seu nome" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" name="email" type="email" placeholder="seu@email.com" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="telefone">Telefone (opcional)</Label>
                    <Input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="assunto">Assunto</Label>
                    <Select value={assunto} onValueChange={(v) => setAssunto(v ?? "")} required>
                      <SelectTrigger id="assunto">
                        <SelectValue placeholder="Selecione o assunto" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSUNTOS.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mensagem">Mensagem</Label>
                    <Textarea
                      id="mensagem"
                      name="mensagem"
                      placeholder="Descreva sua dúvida ou solicitação..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={carregando}
                    className="bg-brand hover:bg-brand-700 text-white w-full sm:w-auto px-8"
                  >
                    {carregando ? (
                      "Enviando..."
                    ) : (
                      <>
                        Enviar mensagem
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Informações de contato */}
            <div className="space-y-6">
              {INFO.map(({ icon: Icon, titulo, linhas, href }) => (
                <div key={titulo} className="flex gap-4">
                  <div className="bg-brand-50 rounded-xl p-3 h-fit">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground mb-1">{titulo}</p>
                    {linhas.map((l) =>
                      href ? (
                        <a
                          key={l}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-muted-foreground hover:text-brand transition-colors"
                        >
                          {l}
                        </a>
                      ) : (
                        <p key={l} className="text-sm text-muted-foreground">{l}</p>
                      )
                    )}
                  </div>
                </div>
              ))}

              {/* WhatsApp CTA */}
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mt-6">
                <p className="text-sm font-semibold text-brand-800 mb-1">Prefere o WhatsApp?</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Fale diretamente com nossa equipe pelo WhatsApp para um atendimento mais rápido.
                </p>
                <a
                  href="https://wa.me/5541991435610"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-brand hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Abrir WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
