"use client";

import { useState, useEffect } from "react";
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
import { Trash2 } from "lucide-react";
import { PhoneInput, COUNTRIES } from "@/components/checkout/phone-input";
import { updateUserAction, deleteUserAction } from "./actions";
import type { UserRow } from "./users-table";

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("BR");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [role, setRole] = useState("cliente");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    const p = parseStoredPhone(user.phone ?? null);
    setFullName(user.full_name ?? "");
    setPhoneCountry(p.countryCode);
    setPhoneLocal(p.localValue);
    setRole(user.role ?? "cliente");
    setNewPassword("");
    setError(null);
  }, [user?.user_id]);

  const availableRoles = isSuperAdmin ? SUPER_ADMIN_ROLES : EDITABLE_ROLES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
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
    if (!user) return;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Label>Telefone</Label>
            <PhoneInput
              value={phoneLocal}
              countryCode={phoneCountry}
              onChange={setPhoneLocal}
              onCountryChange={setPhoneCountry}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_role">Papel</Label>
            <select
              id="edit_role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!canEdit}
              className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer disabled:bg-muted disabled:cursor-default disabled:text-muted-foreground"
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {canEdit && (
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
      </DialogContent>
    </Dialog>
  );
}
