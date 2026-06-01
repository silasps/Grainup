"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Bell,
  ShoppingCart,
  Star,
  MessageSquare,
  Users,
  Target,
  Handshake,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin_notif_dismissed";
const POLL_MS = 30_000;

interface NotificationSection {
  key: string;
  label: string;
  count: number;
  description: string;
  href: string;
  icon: React.ReactNode;
  colorClass: string;
  badgeClass: string;
}

const COLOR_CLASSES: Record<string, { icon: string; badge: string }> = {
  orange: { icon: "bg-orange-100 text-orange-600", badge: "bg-orange-100 text-orange-700" },
  amber:  { icon: "bg-amber-100 text-amber-600",   badge: "bg-amber-100 text-amber-700"  },
  blue:   { icon: "bg-blue-100 text-blue-600",     badge: "bg-blue-100 text-blue-700"    },
  green:  { icon: "bg-green-100 text-green-600",   badge: "bg-green-100 text-green-700"  },
  teal:   { icon: "bg-teal-100 text-teal-600",     badge: "bg-teal-100 text-teal-700"    },
  purple: { icon: "bg-purple-100 text-purple-600", badge: "bg-purple-100 text-purple-700"},
};

function loadDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveDismissed(dismissed: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
}

export function AdminNotificationBell() {
  const router = useRouter();
  // Stable supabase reference — never recreated across renders
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<NotificationSection[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [ringing, setRinging] = useState(false);
  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const fetchCounts = useCallback(async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [ordersRes, reviewsRes, ticketsRes, usersRes, leadsRes, affiliatesRes] =
      await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "aguardando_pagamento"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["novo", "em_atendimento"]),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
        supabase.from("affiliate_withdrawals").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      ]);

    const raw = [
      { key: "pedidos",    label: "Pedidos",       count: ordersRes.count ?? 0,     description: "aguardando pagamento",      href: "/admin/editora/pedidos",    icon: <ShoppingCart className="h-4 w-4" />, color: "orange" },
      { key: "avaliacoes", label: "Avaliações",    count: reviewsRes.count ?? 0,    description: "pendentes de aprovação",    href: "/admin/editora/avaliacoes", icon: <Star className="h-4 w-4" />,         color: "amber"  },
      { key: "sac",        label: "SAC & Contato", count: ticketsRes.count ?? 0,    description: "tickets abertos ou novos", href: "/admin/editora/sac",        icon: <MessageSquare className="h-4 w-4" />, color: "blue"   },
      { key: "usuarios",   label: "Usuários",      count: usersRes.count ?? 0,      description: "novos nos últimos 7 dias", href: "/admin/editora/usuarios",   icon: <Users className="h-4 w-4" />,        color: "green"  },
      { key: "leads",      label: "Leads",         count: leadsRes.count ?? 0,      description: "captados este mês",        href: "/admin/editora/leads",      icon: <Target className="h-4 w-4" />,       color: "teal"   },
      { key: "afiliados",  label: "Afiliados",     count: affiliatesRes.count ?? 0, description: "saques pendentes",         href: "/admin/editora/afiliados",  icon: <Handshake className="h-4 w-4" />,    color: "purple" },
    ];

    setSections(
      raw.map((s) => ({
        key: s.key,
        label: s.label,
        count: s.count,
        description: s.description,
        href: s.href,
        icon: s.icon,
        colorClass: COLOR_CLASSES[s.color].icon,
        badgeClass: COLOR_CLASSES[s.color].badge,
      }))
    );

    // If count dropped below the dismissed threshold (items were resolved),
    // lower the threshold so fresh arrivals show up correctly.
    setDismissed((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const s of raw) {
        if ((next[s.key] ?? 0) > s.count) {
          next[s.key] = s.count;
          changed = true;
        }
      }
      if (changed) saveDismissed(next);
      return changed ? next : prev;
    });

    setLoading(false);
  }, [supabase]);

  // Initial fetch (shows loading skeleton on first paint)
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Polling — fallback every 30 s for any changes missed by realtime
  useEffect(() => {
    const id = setInterval(fetchCounts, POLL_MS);
    return () => clearInterval(id);
  }, [fetchCounts]);

  // Realtime — instant update on INSERT/UPDATE across all watched tables
  useEffect(() => {
    const channel = supabase
      .channel("admin_notif_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, fetchCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, fetchCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, fetchCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, fetchCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reviews" }, fetchCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, fetchCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, fetchCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "affiliate_withdrawals" }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchCounts]);

  // Refetch immediately when the popover is opened
  useEffect(() => {
    if (open) fetchCounts();
  }, [open, fetchCounts]);

  // Sections whose count exceeds the dismissed threshold
  const visibleSections = sections.filter((s) => s.count > (dismissed[s.key] ?? 0));
  const total = visibleSections.reduce((sum, s) => sum + s.count, 0);

  // Ring the bell whenever the visible total goes up
  useEffect(() => {
    const prev = prevTotalRef.current;
    prevTotalRef.current = total;
    if (prev !== null && total > prev) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 800);
      return () => clearTimeout(t);
    }
  }, [total]);

  function handleNavigate(section: NotificationSection) {
    const next = { ...dismissed, [section.key]: section.count };
    setDismissed(next);
    saveDismissed(next);
    setOpen(false);
    router.push(section.href);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        render={
          <button
            aria-label="Notificações"
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-secondary transition-colors"
          >
            <Bell className={cn("h-4 w-4", ringing && "animate-bell-ring")} />

            {total > 0 && (
              <span className="absolute -top-1 -right-1">
                {ringing && (
                  <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-75" />
                )}
                <span className="relative inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand text-[9px] font-bold text-white leading-none">
                  {total > 99 ? "99+" : total}
                </span>
              </span>
            )}
          </button>
        }
      />

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="bottom" align="end" sideOffset={8} className="z-[300]">
          <PopoverPrimitive.Popup className="z-[300] w-80 rounded-xl bg-popover shadow-xl ring-1 ring-foreground/10 outline-none origin-(--transform-origin) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold leading-none">Notificações</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {loading
                    ? "Carregando..."
                    : total === 0
                    ? "Nenhuma pendência no momento"
                    : `${total} item${total !== 1 ? "s" : ""} requer${total === 1 ? "" : "em"} atenção`}
                </p>
              </div>
              <button
                onClick={fetchCounts}
                aria-label="Atualizar notificações"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </button>
            </div>

            {/* Sections */}
            <div className="p-2 flex flex-col gap-0.5 max-h-[22rem] overflow-y-auto">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-2.5 w-32 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-7 bg-muted rounded-full" />
                  </div>
                ))
              ) : visibleSections.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Tudo em dia!</p>
                </div>
              ) : (
                visibleSections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => handleNavigate(section)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left w-full group"
                  >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", section.colorClass)}>
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{section.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn("inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[11px] font-bold leading-none", section.badgeClass)}>
                        {section.count}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {!loading && (
              <div className="px-4 py-2.5 border-t border-border">
                <button
                  onClick={() => { setOpen(false); router.push("/admin/editora"); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver dashboard completo →
                </button>
              </div>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
