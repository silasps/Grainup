"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertTenantSettingsAction } from "@/lib/actions/ead/tenant-settings-action";
import type { Tenant, TenantSettings } from "@/types/ead";
import { Save, Info } from "lucide-react";

interface Props {
  tenant: Tenant | null;
  settings: TenantSettings | null;
}

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 md:p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-sm">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TenantSettingsForm({ tenant, settings }: Props) {
  const [isPending, startTransition] = useTransition();

  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color ?? "#000000");
  const [emailFromName, setEmailFromName] = useState(settings?.email_from_name ?? "");
  const [bunnyLibraryId, setBunnyLibraryId] = useState(settings?.bunny_library_id ?? "");
  const [bunnyTokenKey, setBunnyTokenKey] = useState(settings?.bunny_token_key ?? "");
  const [bunnyCdnHostname, setBunnyCdnHostname] = useState(settings?.bunny_cdn_hostname ?? "");
  const [mpAccessToken, setMpAccessToken] = useState(settings?.mp_access_token ?? "");
  const [mpPublicKey, setMpPublicKey] = useState(settings?.mp_public_key ?? "");
  const [communityLink, setCommunityLink] = useState(settings?.community_link ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertTenantSettingsAction({
        logo_url:          logoUrl || null,
        primary_color:     primaryColor,
        email_from_name:   emailFromName || null,
        bunny_library_id:  bunnyLibraryId || null,
        bunny_token_key:   bunnyTokenKey || null,
        bunny_cdn_hostname: bunnyCdnHostname || null,
        mp_access_token:   mpAccessToken || null,
        mp_public_key:     mpPublicKey || null,
        community_link:    communityLink || null,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configurações salvas!");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">

      {tenant && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 border border-border">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Tenant: <strong>{tenant.name}</strong> · Plano: {tenant.plan} · Slug: {tenant.slug}</span>
        </div>
      )}

      <Section title="Identidade visual" description="Logo e cor primária exibidos na área do aluno.">
        <Field label="URL do logo" hint="PNG ou SVG, fundo transparente recomendado.">
          <Input
            type="url"
            placeholder="https://cdn.seusite.com.br/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </Field>
        <Field label="Cor primária">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-14 rounded-md border border-input cursor-pointer p-1"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-32 font-mono"
              maxLength={7}
            />
          </div>
        </Field>
      </Section>

      <Section title="Email transacional" description="Nome exibido no campo 'De:' dos emails enviados aos alunos.">
        <Field label="Nome do remetente" hint='Ex: "Eifol Cursos" · Os emails são enviados via @grainup.com.br.'>
          <Input
            placeholder="Eifol Cursos"
            value={emailFromName}
            onChange={(e) => setEmailFromName(e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Bunny.net Stream"
        description="Credenciais para hospedagem e proteção de vídeos. Obtenha em bunny.net → Stream → sua biblioteca."
      >
        <Field label="Library ID" hint="Número da biblioteca Bunny. Ex: 123456">
          <Input
            placeholder="123456"
            value={bunnyLibraryId}
            onChange={(e) => setBunnyLibraryId(e.target.value)}
          />
        </Field>
        <Field label="Token Key" hint="Chave para assinar URLs de vídeo. Bunny Dashboard → Security → Token Authentication.">
          <Input
            type="password"
            placeholder="••••••••••••••••"
            value={bunnyTokenKey}
            onChange={(e) => setBunnyTokenKey(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="CDN Hostname" hint="Ex: videos.seutenant.b-cdn.net">
          <Input
            placeholder="videos.seutenant.b-cdn.net"
            value={bunnyCdnHostname}
            onChange={(e) => setBunnyCdnHostname(e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Mercado Pago"
        description="Suas credenciais do Mercado Pago. O aluno paga diretamente para você — a GrainUp não toca no dinheiro da venda."
      >
        <Field label="Access Token" hint="Começa com APP_USR-. Mercado Pago → Suas aplicações → Credenciais → Produção.">
          <Input
            type="password"
            placeholder="APP_USR-••••••••••••••••"
            value={mpAccessToken}
            onChange={(e) => setMpAccessToken(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Public Key" hint="Usada no formulário de pagamento no navegador do aluno.">
          <Input
            placeholder="APP_USR-••••••••••••••••"
            value={mpPublicKey}
            onChange={(e) => setMpPublicKey(e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Comunidade" description="Link de grupo externo (Discord, WhatsApp, Telegram) exibido após a matrícula.">
        <Field label="Link da comunidade">
          <Input
            type="url"
            placeholder="https://chat.whatsapp.com/..."
            value={communityLink}
            onChange={(e) => setCommunityLink(e.target.value)}
          />
        </Field>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="min-w-[120px]">
          <Save className="h-4 w-4 mr-1.5" />
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
