"use client";

import { useState, useRef, useTransition } from "react";
import {
  ShoppingBag, Settings, Users, Plug, GraduationCap,
  Gift, Shield, Download, Mail, ChevronDown, Check, Loader2,
} from "lucide-react";
import type { ContratoContent } from "@/lib/contratos/content";
import {
  requestOtpAction, signContratoAction,
  sendContractByEmailAction, getPdfSignedUrlAction,
} from "./actions";

interface ContratoRecord {
  id: string;
  token: string;
  client_name: string;
  client_email: string;
  status: string;
  signed_at: string | null;
}

const AREA_ICONS = [ShoppingBag, Settings, Users, Plug, GraduationCap];

function ClauseItem({ clausula }: { clausula: ContratoContent["clausulas"][0] }) {
  return (
    <details className="group border-b border-slate-100 last:border-0">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
            {clausula.numero}
          </span>
          <span className="text-sm font-semibold text-slate-700 truncate">
            Cláusula {clausula.numero}ª — {clausula.titulo}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pt-1">
        <div className="pl-10">
          {clausula.texto.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed mb-3 last:mb-0 whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      </div>
    </details>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  function handleChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join(""));
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      onChange(text);
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === " " ? "" : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white"
        />
      ))}
    </div>
  );
}

export function SignForm({
  contrato,
  content,
}: {
  contrato: ContratoRecord;
  content: ContratoContent;
}) {
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"agree" | "form" | "otp" | "done">("agree");
  const [name, setName] = useState(contrato.client_name);
  const [email, setEmail] = useState(contrato.client_email);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const alreadySigned = contrato.status === "assinado";

  function handleAgree() {
    if (!agreed) return;
    setStep("form");
    setTimeout(() => {
      document.getElementById("signature-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleRequestOtp() {
    setError("");
    startTransition(async () => {
      const res = await requestOtpAction(contrato.token, email);
      if (res.error) { setError(res.error); return; }
      setStep("otp");
    });
  }

  function handleSign() {
    setError("");
    startTransition(async () => {
      let geo: { lat: number; lng: number } | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { /* geolocalização é opcional */ }

      const res = await signContratoAction(contrato.token, otp, name, email, geo);
      if (res.error) { setError(res.error); return; }
      setStep("done");
      window.location.href = `/contrato/${contrato.token}/obrigado`;
    });
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    const res = await getPdfSignedUrlAction(contrato.token);
    setPdfLoading(false);
    if (res.error) { setError(res.error); return; }
    window.open(res.url, "_blank", "noopener,noreferrer");
  }

  async function handleSendEmail() {
    setEmailLoading(true);
    const res = await sendContractByEmailAction(contrato.token, email);
    setEmailLoading(false);
    if (res.error) { setError(res.error); return; }
    setEmailSent(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero header */}
      <div className="bg-[#0f172a] text-white">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-sm font-bold">G</span>
            </div>
            <span className="text-sm font-medium text-white/60">GrainUp</span>
            <span className="text-white/20">·</span>
            <span className="text-xs font-medium bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
              Contrato Oficial
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-1">{content.titulo}</h1>
          <p className="text-sm text-white/60">{content.subtitulo}</p>

          {alreadySigned && contrato.signed_at && (
            <div className="mt-6 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400 shrink-0" />
              <span className="text-sm text-green-300">
                Assinado em {new Date(contrato.signed_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit",
                  year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-20">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 -mt-4 mb-8">
          {[
            { label: "Valor total", value: content.valor },
            { label: "Pagamento", value: "100% no go-live" },
            { label: "Prazo", value: "4 semanas" },
            { label: "Suporte pós-entrega", value: "30 dias" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
              <p className="text-sm font-bold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Partes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Partes do contrato
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contratante</p>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{content.partes.contratante.nome}</p>
              <p className="text-xs text-slate-500 mt-1">CNPJ {content.partes.contratante.cnpj}</p>
              <p className="text-xs text-slate-500">{content.partes.contratante.email}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contratado</p>
              <p className="text-sm font-semibold text-slate-800">{content.partes.contratado.nome}</p>
              <p className="text-xs text-slate-500 mt-1">CPF {content.partes.contratado.cpf}</p>
              <p className="text-xs text-slate-500">{content.partes.contratado.email}</p>
            </div>
          </div>
        </div>

        {/* O que você está contratando */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            O que você está contratando
          </h2>
          <div className="space-y-4">
            {content.escopo.areas.map((area, i) => {
              const Icon = AREA_ICONS[i] ?? ShoppingBag;
              return (
                <div key={area.titulo}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{area.titulo}</span>
                  </div>
                  <ul className="pl-8 space-y-1">
                    {area.itens.map((item) => (
                      <li key={item} className="text-xs text-slate-500 flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bônus */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Bônus incluídos — sem custo adicional
            </h2>
          </div>
          <div className="space-y-2">
            {content.bonus.itens.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <div className="mt-0.5 h-4 w-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-amber-600" />
                </div>
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cláusulas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cláusulas do contrato
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Toque em cada cláusula para expandir</p>
          </div>
          {content.clausulas.map((cl) => (
            <ClauseItem key={cl.numero} clausula={cl} />
          ))}
        </div>

        {/* Bloco de validade legal */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Validade jurídica desta assinatura</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Esta assinatura eletrônica tem plena validade jurídica nos termos da{" "}
                <strong>Lei 14.063/2020</strong> e é reconhecida pelo Poder Judiciário brasileiro
                (STJ, REsp 2.159.442/2025). Ao confirmar, sua identidade, data, horário e
                localização ficam registrados de forma imutável, com o mesmo efeito de uma
                assinatura manuscrita em contrato particular.
              </p>
            </div>
          </div>
        </div>

        {/* Botões PDF / E-mail */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar PDF
          </button>
          <button
            onClick={handleSendEmail}
            disabled={emailLoading || emailSent}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {emailLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : emailSent ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {emailSent ? "Enviado!" : "Receber por e-mail"}
          </button>
        </div>

        {/* Seção de assinatura */}
        {!alreadySigned && (
          <div id="signature-form" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-slate-800 mb-1">Assinar este contrato</h2>
            <p className="text-xs text-slate-400 mb-5">Confirme sua leitura e assine eletronicamente</p>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { label: "Concordar", key: "agree" },
                { label: "Dados", key: "form" },
                { label: "Confirmar", key: "otp" },
              ].map((s, i) => {
                const steps = ["agree", "form", "otp", "done"];
                const currentIdx = steps.indexOf(step);
                const thisIdx = steps.indexOf(s.key);
                const done = currentIdx > thisIdx;
                const active = currentIdx === thisIdx;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    {i > 0 && <div className={`h-px flex-1 min-w-[20px] ${done ? "bg-green-500" : "bg-slate-200"}`} />}
                    <div className={`flex items-center gap-1.5 ${active ? "opacity-100" : done ? "opacity-100" : "opacity-40"}`}>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? "bg-green-500 text-white" : active ? "bg-[#0f172a] text-white" : "bg-slate-200 text-slate-500"}`}>
                        {done ? <Check className="h-3 w-3" /> : i + 1}
                      </div>
                      <span className="text-xs font-medium text-slate-600 hidden sm:block">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {step === "agree" && (
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0f172a] cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 leading-relaxed">
                    Li e concordo com todas as{" "}
                    <strong className="text-slate-800">15 cláusulas</strong> e os{" "}
                    <strong className="text-slate-800">2 Anexos</strong> deste contrato.
                  </span>
                </label>
                <button
                  onClick={handleAgree}
                  disabled={!agreed}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all bg-[#0f172a] text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continuar para assinar →
                </button>
              </div>
            )}

            {step === "form" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Nome completo do signatário
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    E-mail para receber o código de confirmação
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  onClick={handleRequestOtp}
                  disabled={!name.trim() || !email.trim() || isPending}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all bg-[#0f172a] text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar código de confirmação
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-5">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600 mb-0.5">
                    Código enviado para <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-slate-400">Válido por 15 minutos. Verifique sua caixa de entrada e o spam.</p>
                </div>
                <OtpInput value={otp} onChange={setOtp} />
                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                <button
                  onClick={handleSign}
                  disabled={otp.length < 6 || isPending}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Assinando…</>
                  ) : (
                    "✅ Confirmar e assinar"
                  )}
                </button>
                <button
                  onClick={() => { setStep("form"); setOtp(""); setError(""); }}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-2"
                >
                  Não recebi o código — voltar
                </button>
              </div>
            )}
          </div>
        )}

        {alreadySigned && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-base font-bold text-green-800 mb-1">Contrato já assinado</p>
            <p className="text-sm text-green-600">
              Este contrato foi assinado eletronicamente em{" "}
              {contrato.signed_at
                ? new Date(contrato.signed_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "—"}
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
