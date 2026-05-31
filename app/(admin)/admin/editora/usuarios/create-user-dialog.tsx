"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { PhoneInput, COUNTRIES } from "@/components/checkout/phone-input";
import { createUserAction } from "./actions";

function buildStoredPhone(countryCode: string, localValue: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  return localValue ? `${country.ddi} ${localValue}` : "";
}

const EDITABLE_ROLES = [
  { value: "cliente", label: "Cliente" },
  { value: "admin_editora", label: "Admin Editora" },
  { value: "afiliado_jocum", label: "Afiliado JOCUM" },
  { value: "afiliado_diretor", label: "Afiliado Diretor" },
];

const SUPER_ADMIN_ROLES = [
  { value: "cliente", label: "Cliente" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin_editora", label: "Admin Editora" },
  { value: "admin_ead", label: "Admin EAD" },
  { value: "admin_eifol", label: "Admin EIFOL" },
  { value: "afiliado_jocum", label: "Afiliado JOCUM" },
  { value: "afiliado_diretor", label: "Afiliado Diretor" },
];

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "cliente",
};

export function CreateUserDialog({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [phoneCountry, setPhoneCountry] = useState("BR");
  const [phoneLocal, setPhoneLocal] = useState("");

  const availableRoles = isSuperAdmin ? SUPER_ADMIN_ROLES : EDITABLE_ROLES;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createUserAction({
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      phone: buildStoredPhone(phoneCountry, phoneLocal) || undefined,
      role: form.role,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setForm(EMPTY_FORM);
      setPhoneCountry("BR");
      setPhoneLocal("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setForm(EMPTY_FORM); setPhoneCountry("BR"); setPhoneLocal(""); } }}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserPlus className="h-4 w-4" />
        Novo usuário
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Nome completo *</Label>
            <Input
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
              placeholder="João da Silva"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="joao@exemplo.com"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Telefone</Label>
            <PhoneInput
              value={phoneLocal}
              countryCode={phoneCountry}
              onChange={setPhoneLocal}
              onCountryChange={setPhoneCountry}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Papel</Label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
