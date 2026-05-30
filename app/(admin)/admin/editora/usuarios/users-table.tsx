"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X, Mail, Phone, User, ShieldCheck } from "lucide-react";

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_editora: "Admin Editora",
  admin_ead: "Admin EAD",
  admin_eifol: "Admin EIFOL",
  afiliado_jocum: "Afiliado JOCUM",
  afiliado_diretor: "Afiliado Diretor",
  lider_jocum: "Líder JOCUM",
  cliente: "Cliente",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin_editora: "bg-brand-50 text-brand-700",
  admin_ead: "bg-blue-100 text-blue-700",
  admin_eifol: "bg-indigo-100 text-indigo-700",
  afiliado_jocum: "bg-amber-100 text-amber-700",
  afiliado_diretor: "bg-orange-100 text-orange-700",
  lider_jocum: "bg-teal-100 text-teal-700",
  cliente: "bg-secondary text-muted-foreground",
};

function roleLabel(role: string | null) {
  if (!role) return "Cliente";
  return ROLE_LABELS[role] ?? role;
}

function roleColor(role: string | null) {
  if (!role) return ROLE_COLORS["cliente"];
  return ROLE_COLORS[role] ?? "bg-secondary text-muted-foreground";
}

export function UsersTable({ users, isSuperAdmin }: { users: UserRow[]; isSuperAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const roles = useMemo(() => {
    const set = new Set(users.map((u) => u.role ?? ""));
    return [...set].filter(Boolean).sort();
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== "all" && (u.role ?? "") !== filterRole) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const name = (u.full_name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [users, query, filterRole]);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de usuários", value: users.length },
          { label: "Com papel específico", value: users.filter((u) => u.role).length },
          { label: "Clientes regulares", value: users.filter((u) => !u.role).length },
          { label: "Filtro atual", value: filtered.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={`flex items-center h-10 rounded-md border text-sm focus-within:ring-1 focus-within:ring-brand ${filterRole !== "all" ? "border-brand bg-brand-50" : "border-border bg-white"}`}>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-full bg-transparent pl-3 pr-2 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os papéis</option>
            <option value="">Cliente</option>
            {roles.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </select>
          {filterRole !== "all" && (
            <button onClick={() => setFilterRole("all")} className="mr-2 text-brand hover:text-brand-700">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {(query || filterRole !== "all") && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} de {users.length} usuários
        </p>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Usuário</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Contato</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Papel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                    {query || filterRole !== "all"
                      ? "Nenhum usuário encontrado para os filtros aplicados."
                      : "Nenhum usuário ainda."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          {u.role === "super_admin" || u.role?.startsWith("admin_") ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {u.full_name ?? <span className="text-muted-foreground italic">Sem nome</span>}
                          </p>
                          <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {u.email && (
                          <a
                            href={`mailto:${u.email}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
                          >
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {u.email}
                          </a>
                        )}
                        {u.phone && (
                          <a
                            href={`tel:${u.phone}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
                          >
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {u.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${roleColor(u.role)}`}
                      >
                        {roleLabel(u.role)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                      {new Intl.DateTimeFormat("pt-BR").format(new Date(u.created_at))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
