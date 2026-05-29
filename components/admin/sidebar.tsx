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
  Newspaper,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { useState } from "react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin/editora",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "Livros", href: "/admin/editora/livros", icon: BookOpen },
  { label: "Pedidos", href: "/admin/editora/pedidos", icon: ShoppingBag },
  { label: "Avaliações", href: "/admin/editora/avaliacoes", icon: Star },
  { label: "SAC", href: "/admin/editora/sac", icon: MessageSquare },
  { label: "Leads", href: "/admin/editora/leads", icon: Users },
  { label: "Afiliados", href: "/admin/editora/afiliados", icon: Users },
  { label: "Ofertas", href: "/admin/editora/ofertas", icon: Tag },
  { label: "Combos", href: "/admin/editora/combos", icon: BookOpen },
  { label: "FAQ", href: "/admin/editora/faq", icon: HelpCircle },
  { label: "Novidades", href: "/admin/editora/novidades", icon: Newspaper },
  { label: "Financeiro", href: "/admin/editora/financeiro", icon: TrendingUp },
  { label: "Fiscal", href: "/admin/editora/fiscal", icon: FileText },
  { label: "Config.", href: "/admin/editora/configuracoes", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside
      className={cn(
        "flex-shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed ? "justify-center" : "gap-2 px-4")}>
        {!collapsed && <Logo variant="white" className="h-6" />}
        {collapsed && <span className="text-white font-bold text-sm">G</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5",
                active
                  ? "bg-brand text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-white transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
