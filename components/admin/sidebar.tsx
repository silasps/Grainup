"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  Star,
  MessageSquare,
  Users,
  TrendingUp,
  FileText,
  Settings,
  HelpCircle,
  Sparkles,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Code2,
  Store,
  Tag,
  UserCheck,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { useState } from "react";
import { useMobileMenu } from "./mobile-menu-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  excludes?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Catálogo",
    items: [
      { label: "Livros",     href: "/admin/editora/livros",         icon: BookOpen,   excludes: "/admin/editora/livros/vitrine" },
      { label: "Vitrine",    href: "/admin/editora/livros/vitrine", icon: Store },
      { label: "Combos",     href: "/admin/editora/combos",         icon: BookOpen },
      { label: "Destaques",  href: "/admin/editora/destaques",      icon: Sparkles },
      { label: "Ofertas",    href: "/admin/editora/ofertas",        icon: Tag },
      { label: "Anúncios",   href: "/admin/editora/anuncios",       icon: Megaphone },
    ],
  },
  {
    label: "Vendas",
    items: [
      { label: "Pedidos",    href: "/admin/editora/pedidos",    icon: ShoppingBag },
      { label: "Avaliações", href: "/admin/editora/avaliacoes", icon: Star },
      { label: "SAC",        href: "/admin/editora/sac",        icon: MessageSquare },
    ],
  },
  {
    label: "Comunidade",
    items: [
      { label: "Usuários",   href: "/admin/editora/usuarios",   icon: Users },
      { label: "Leads",      href: "/admin/editora/leads",      icon: UserCheck },
      { label: "Afiliados",  href: "/admin/editora/afiliados",  icon: Users },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Financeiro", href: "/admin/editora/financeiro", icon: TrendingUp },
      { label: "Fiscal",     href: "/admin/editora/fiscal",     icon: ReceiptText },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "FAQ",        href: "/admin/editora/faq",            icon: HelpCircle },
      { label: "Config.",    href: "/admin/editora/configuracoes",  icon: Settings },
    ],
  },
];

function isItemActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  if (item.excludes && pathname.startsWith(item.excludes)) return false;
  return pathname.startsWith(item.href);
}

function NavGroup({
  group,
  collapsed,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasActive = group.items.some((i) => isItemActive(i, pathname));
  const [open, setOpen] = useState(true);

  if (collapsed) {
    // No modo colapsado mostra só ícones, sem agrupamento visual
    return (
      <>
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={cn(
                "flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors mb-0.5",
                active ? "bg-brand text-white" : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
        <div className="my-1.5 border-t border-white/10 mx-1" />
      </>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors",
          hasActive ? "text-white/80" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
        )}
      >
        <span>{group.label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
      </button>

      {open && (
        <div className="mt-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                  active
                    ? "bg-brand text-white"
                    : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({ superAdmin = false }: { superAdmin?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { open: mobileOpen, close: mobileClose } = useMobileMenu();

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:static md:z-auto md:translate-x-0 md:flex-shrink-0 md:transition-all",
        collapsed ? "md:w-14" : "md:w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed ? "justify-center" : "gap-2 px-4")}>
        {!collapsed && <Logo variant="white" className="h-6" />}
        {collapsed && <span className="text-white font-bold text-sm">G</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Dashboard — sempre visível, fora dos grupos */}
        <Link
          href="/admin/editora"
          onClick={mobileClose}
          title={collapsed ? "Dashboard" : undefined}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors mb-2",
            pathname === "/admin/editora"
              ? "bg-brand text-white"
              : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">Dashboard</span>}
        </Link>

        {NAV_GROUPS.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            collapsed={collapsed}
            pathname={pathname}
            onNavigate={mobileClose}
          />
        ))}

        {superAdmin && (
          <>
            {!collapsed && <div className="my-2 border-t border-white/10" />}
            <Link
              href="/admin/editora/desenvolvedor"
              onClick={mobileClose}
              title={collapsed ? "Desenvolvedor" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/admin/editora/desenvolvedor")
                  ? "bg-brand text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center"
              )}
            >
              <Code2 className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">Desenvolvedor</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Ver loja */}
      <a
        href="/editora"
        target="_blank"
        rel="noopener noreferrer"
        title="Ver loja"
        className={cn(
          "flex items-center gap-2.5 mx-2 mb-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors border border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30",
          collapsed && "justify-center"
        )}
      >
        <ArrowUpRight className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">Ver loja</span>}
      </a>

      {/* Collapse toggle — desktop */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
