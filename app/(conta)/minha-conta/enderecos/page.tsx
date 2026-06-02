"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, MapPin, Star, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

const schema = z.object({
  label: z.string().optional(),
  full_name: z.string().min(2, "Nome obrigatório"),
  zip_code: z.string().length(9, "CEP inválido"),
  street: z.string().min(3, "Rua obrigatória"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro obrigatório"),
  city: z.string().min(2, "Cidade obrigatória"),
  state: z.string().length(2, "UF inválida"),
});

type FormData = z.infer<typeof schema>;

function applyZipMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function AddressForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Address;
  onSave: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [zipRaw, setZipRaw] = useState(initial?.zip_code ?? "");
  const [fetchingCep, setFetchingCep] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        label: initial?.label ?? "",
        full_name: initial?.full_name ?? "",
        zip_code: initial?.zip_code ?? "",
        street: initial?.street ?? "",
        number: initial?.number ?? "",
        complement: initial?.complement ?? "",
        neighborhood: initial?.neighborhood ?? "",
        city: initial?.city ?? "",
        state: initial?.state ?? "",
      },
    });

  async function handleZipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyZipMask(e.target.value);
    setZipRaw(masked);
    setValue("zip_code", masked);

    if (masked.replace(/\D/g, "").length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${masked.replace(/\D/g, "")}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue("street", data.logradouro ?? "");
          setValue("neighborhood", data.bairro ?? "");
          setValue("city", data.localidade ?? "");
          setValue("state", data.uf ?? "");
        }
      } catch {
        // ignore
      } finally {
        setFetchingCep(false);
      }
    }
  }

  async function onSubmit(data: FormData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = initial
      ? { count: null }
      : await supabase
          .from("addresses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

    const payload = {
      user_id: user.id,
      label: data.label || null,
      full_name: data.full_name,
      zip_code: data.zip_code,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state.toUpperCase(),
      is_default: initial?.is_default ?? count === 0,
    };

    let error;
    if (initial) {
      ({ error } = await supabase.from("addresses").update(payload).eq("id", initial.id));
    } else {
      ({ error } = await supabase.from("addresses").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar endereço");
      return;
    }

    toast.success(initial ? "Endereço atualizado!" : "Endereço salvo!");
    onSave();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-border p-6 flex flex-col gap-4">
      <h2 className="font-semibold text-foreground">{initial ? "Editar endereço" : "Novo endereço"}</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="label">Rótulo <span className="text-muted-foreground font-normal text-xs">(opcional, ex: Casa, Trabalho)</span></Label>
          <Input id="label" placeholder="Casa" {...register("label")} />
        </div>

        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="full_name">Nome do destinatário</Label>
          <Input id="full_name" placeholder="Nome completo" {...register("full_name")} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="zip_code">CEP</Label>
          <div className="relative">
            <Input
              id="zip_code"
              value={zipRaw}
              onChange={handleZipChange}
              placeholder="00000-000"
              maxLength={9}
            />
            {fetchingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {errors.zip_code && <p className="text-xs text-destructive">{errors.zip_code.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">UF</Label>
          <Input id="state" placeholder="PR" maxLength={2} {...register("state")} className="uppercase" />
          {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
        </div>

        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="street">Rua / Avenida</Label>
          <Input id="street" placeholder="Nome da rua" {...register("street")} />
          {errors.street && <p className="text-xs text-destructive">{errors.street.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="number">Número</Label>
          <Input id="number" placeholder="123" {...register("number")} />
          {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="complement">Complemento <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input id="complement" placeholder="Apto 42" {...register("complement")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input id="neighborhood" placeholder="Centro" {...register("neighborhood")} />
          {errors.neighborhood && <p className="text-xs text-destructive">{errors.neighborhood.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" placeholder="Curitiba" {...register("city")} />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-brand hover:bg-brand-700 text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar endereço
        </Button>
      </div>
    </form>
  );
}

export default function EnderecosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login?redirectTo=/minha-conta/enderecos"); return; }
      loadAddresses(user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAddresses(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover endereço"); return; }
    toast.success("Endereço removido");
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSetDefault(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    await loadAddresses(user.id);
    toast.success("Endereço padrão atualizado");
  }

  async function afterSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadAddresses(user.id);
    setShowForm(false);
    setEditing(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-6 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
            <div className="h-3 bg-secondary rounded w-2/3 mb-2" />
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/minha-conta"
        className="md:hidden inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Minha conta
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">Endereços</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {addresses.length === 0
              ? "Nenhum endereço salvo ainda."
              : `${addresses.length} endereço${addresses.length > 1 ? "s" : ""} salvo${addresses.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {!showForm && !editing && (
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-700 text-white gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Novo endereço
          </Button>
        )}
      </div>

      {(showForm) && (
        <AddressForm
          onSave={afterSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <AddressForm
          initial={editing}
          onSave={afterSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {addresses.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">Nenhum endereço salvo</p>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione um endereço para agilizar suas próximas compras.
          </p>
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-700 text-white gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar endereço
          </Button>
        </div>
      )}

      {addresses.map((addr) => (
        <div
          key={addr.id}
          className="bg-white rounded-xl border border-border p-5 flex flex-col sm:flex-row gap-4 sm:items-start"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {addr.label && (
                <span className="text-xs font-semibold text-brand bg-brand-50 px-2 py-0.5 rounded-full">
                  {addr.label}
                </span>
              )}
              {addr.is_default && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" /> Padrão
                </span>
              )}
            </div>
            <p className="font-medium text-foreground text-sm">{addr.full_name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {addr.street}, {addr.number}
              {addr.complement && ` — ${addr.complement}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {addr.neighborhood} — {addr.city}/{addr.state}
            </p>
            <p className="text-sm text-muted-foreground">CEP {addr.zip_code}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!addr.is_default && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleSetDefault(addr.id)}
              >
                Tornar padrão
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => { setEditing(addr); setShowForm(false); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:border-destructive"
              onClick={() => handleDelete(addr.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
