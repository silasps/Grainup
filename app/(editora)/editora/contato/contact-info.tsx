"use client";

import { MapPin, Phone, Mail, Clock } from "lucide-react";

type ContactSettings = {
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  whatsapp_message: string | null;
  whatsapp_enabled: boolean;
  address: string | null;
  business_hours: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
};

type DaySchedule = { enabled: boolean; open: string; close: string };

function formatHours(raw: string | null): string[] {
  try {
    const schedule: Record<string, DaySchedule> = JSON.parse(raw ?? "{}");
    const DAY_LABELS: Record<string, string> = {
      seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
    };
    const enabled = Object.entries(schedule)
      .filter(([, d]) => d.enabled)
      .map(([key, d]) => `${DAY_LABELS[key] ?? key}: ${d.open} – ${d.close}`);
    return enabled.length > 0 ? enabled : ["Seg – Sex: 8h às 18h"];
  } catch {
    return ["Seg – Sex: 8h às 18h"];
  }
}

function cleanPhone(raw: string | null) {
  if (!raw) return null;
  return raw.replace(/\D/g, "");
}

export function ContactInfo({ contact }: { contact: ContactSettings | null }) {
  const phone = contact?.whatsapp || contact?.phone || null;
  const phoneDigits = cleanPhone(phone);
  const email = contact?.email || "contato@editorajocum.com.br";
  const address = contact?.address || null;
  const hours = formatHours(contact?.business_hours ?? null);
  const waMessage = contact?.whatsapp_message || "Olá! Gostaria de saber mais sobre os livros da Editora Jocum.";
  const waUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(waMessage)}`
    : null;

  return (
    <div className="space-y-6">
      {phone && (
        <div className="flex gap-4">
          <div className="bg-brand-50 rounded-xl p-3 h-fit">
            <Phone className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground mb-1">Telefone / WhatsApp</p>
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-muted-foreground hover:text-brand transition-colors">
                {phone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{phone}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="bg-brand-50 rounded-xl p-3 h-fit">
          <Mail className="h-5 w-5 text-brand" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground mb-1">E-mail</p>
          <a href={`mailto:${email}`} className="block text-sm text-muted-foreground hover:text-brand transition-colors">
            {email}
          </a>
        </div>
      </div>

      {address && (
        <div className="flex gap-4">
          <div className="bg-brand-50 rounded-xl p-3 h-fit">
            <MapPin className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground mb-1">Endereço</p>
            {address.split("\n").map((line, i) => (
              <p key={i} className="text-sm text-muted-foreground">{line}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="bg-brand-50 rounded-xl p-3 h-fit">
          <Clock className="h-5 w-5 text-brand" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground mb-1">Horário de atendimento</p>
          {hours.map((h) => (
            <p key={h} className="text-sm text-muted-foreground">{h}</p>
          ))}
        </div>
      </div>

      {waUrl && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mt-6">
          <p className="text-sm font-semibold text-brand-800 mb-1">Prefere o WhatsApp?</p>
          <p className="text-sm text-muted-foreground mb-3">
            Fale diretamente com nossa equipe pelo WhatsApp para um atendimento mais rápido.
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Abrir WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
