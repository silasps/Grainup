"use client";

import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
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

export function ContatoForm() {
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [assunto, setAssunto] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCarregando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="h-14 w-14 text-brand mb-4" />
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Mensagem enviada!</h2>
        <p className="text-muted-foreground max-w-sm">
          Recebemos sua mensagem e responderemos em breve. Obrigado pelo contato.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setEnviado(false)}>
          Enviar nova mensagem
        </Button>
      </div>
    );
  }

  return (
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
        {carregando ? "Enviando..." : <><Send className="mr-2 h-4 w-4" /> Enviar mensagem</>}
      </Button>
    </form>
  );
}
