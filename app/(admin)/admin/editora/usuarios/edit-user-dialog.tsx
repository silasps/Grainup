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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Home, MapPin, ShieldCheck, Star, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput, COUNTRIES } from "@/components/checkout/phone-input";
import { updateUserAction, deleteUserAction } from "./actions";
import type { UserRow } from "./users-table";
import { ROLE_LABELS, getAssignableRoleOptions, isKnownRole } from "./role-access";
import type { UserRole } from "@/types/database";

function Section({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground bg-secondary/40 hover:bg-secondary/60 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="p-3 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

function formatCpf(cpf: string | null): string {
  if (!cpf) return "Não informado";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function parseStoredPhone(stored: string | null): { countryCode: string; localValue: string } {
  if (!stored) return { countryCode: "BR", localValue: "" };
  for (const country of COUNTRIES) {
    const prefix = `${country.ddi} `;
    if (stored.startsWith(prefix)) {
      return { countryCode: country.code, localValue: stored.slice(prefix.length) };
    }
  }
  return { countryCode: "BR", localValue: stored };
}

function buildStoredPhone(countryCode: string, localValue: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  return localValue ? `${country.ddi} ${localValue}` : "";
}

interface EditUserDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  canEdit: boolean;
  isMe: boolean;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  isSuperAdmin,
  canEdit,
  isMe,
}: EditUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        {open && user ? (
          <EditUserDialogForm
            key={user.user_id}
            user={user}
            onOpenChange={onOpenChange}
            isSuperAdmin={isSuperAdmin}
            canEdit={canEdit}
            isMe={isMe}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialogForm({
  user,
  onOpenChange,
  isSuperAdmin,
  canEdit,
  isMe,
}: {
  user: UserRow;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  canEdit: boolean;
  isMe: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedPhone = parseStoredPhone(user.phone ?? null);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phoneCountry, setPhoneCountry] = useState(parsedPhone.countryCode);
  const [phoneLocal, setPhoneLocal] = useState(parsedPhone.localValue);
  const [role, setRole] = useState<UserRole>(user.role ?? "cliente");
  const [newPassword, setNewPassword] = useState("");

  const baseRoleOptions = getAssignableRoleOptions(isSuperAdmin);
  const availableRoles =
    isKnownRole(role) && !baseRoleOptions.some((option) => option.value === role)
      ? [{ value: role, label: ROLE_LABELS[role] }, ...baseRoleOptions]
      : baseRoleOptions;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await updateUserAction({
      userId: user.user_id,
      full_name: fullName,
      phone: buildStoredPhone(phoneCountry, phoneLocal) || undefined,
      role,
      newPassword: newPassword || undefined,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onOpenChange(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir "${user.full_name ?? user.email}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const result = await deleteUserAction(user.user_id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
    } else {
      onOpenChange(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Section title="Dados pessoais" icon={UserRound} defaultOpen>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit_full_name">Nome completo</Label>
          <Input
            id="edit_full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo"
            disabled={!canEdit}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>E-mail</Label>
          <Input
            value={user?.email ?? ""}
            disabled
            className="bg-muted text-muted-foreground cursor-default"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>CPF</Label>
          <Input
            value={formatCpf(user.cpf)}
            disabled
            className="bg-muted text-muted-foreground cursor-default"
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
      </Section>

      <Section title="Permissões" icon={ShieldCheck} defaultOpen>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit_role">Papel</Label>
          <select
            id="edit_role"
            value={role}
            onChange={(e) => {
              if (isKnownRole(e.target.value)) setRole(e.target.value);
            }}
            disabled={!canEdit}
            className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer disabled:bg-muted disabled:cursor-default disabled:text-muted-foreground"
          >
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title={`Endereços${user.addresses.length ? ` (${user.addresses.length})` : ""}`} icon={MapPin}>
        {user.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {user.addresses.map((addr) => (
              <div key={addr.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <Home className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground">{addr.label || "Endereço"}</span>
                  {addr.is_default && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full leading-none">
                      <Star className="h-2.5 w-2.5" /> padrão
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground">{addr.full_name}</p>
                <p className="text-muted-foreground">
                  {addr.street}, {addr.number}
                  {addr.complement ? ` — ${addr.complement}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {addr.neighborhood} — {addr.city}/{addr.state}
                </p>
                <p className="text-muted-foreground">CEP {addr.zip_code}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {canEdit && (
        <Section title="Senha" icon={ShieldCheck}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_password">Nova senha <span className="text-muted-foreground font-normal">(deixe em branco para não alterar)</span></Label>
            <Input
              id="edit_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
        </Section>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
        {canEdit && !isMe ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 sm:mr-auto"
            onClick={handleDelete}
            disabled={deleting || loading}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? "Excluindo..." : "Excluir usuário"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2 justify-end">
          <DialogClose render={<Button variant="outline" type="button" />}>
            {canEdit ? "Cancelar" : "Fechar"}
          </DialogClose>
          {canEdit && (
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
      </DialogFooter>
    </form>
  );
}
