"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  CreditCard,
  History,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  today: LayoutDashboard,
  calendar: CalendarDays,
  book: CalendarPlus,
  waitlist: ClipboardList,
  customers: Users,
  services: Stethoscope,
  team: UserCog,
  activity: History,
  settings: Settings,
  billing: CreditCard,
} as const;

export interface NavEntry {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  group: "operate" | "manage";
  badge?: number;
}

export function SidebarNav({ base, items }: { base: string; items: NavEntry[] }) {
  const pathname = usePathname();
  const groups: Array<{ key: NavEntry["group"]; label: string }> = [
    { key: "operate", label: "Operate" },
    { key: "manage", label: "Manage" },
  ];

  return (
    <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:overflow-visible lg:px-3 lg:pb-0">
      {groups.map((g) => {
        const entries = items.filter((i) => i.group === g.key);
        if (entries.length === 0) return null;
        return (
          <div key={g.key} className="flex gap-1 lg:mb-6 lg:block">
            <p className="hidden px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-clinic-300 lg:block">
              {g.label}
            </p>
            {entries.map((item) => {
              const href = `${base}${item.href}`;
              const active = item.href === "" ? pathname === base : pathname.startsWith(href);
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors lg:mb-0.5",
                    active ? "bg-white text-clinic-900" : "text-clinic-100 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto rounded bg-sand-200 px-1.5 text-[11px] font-bold text-ink-900">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
