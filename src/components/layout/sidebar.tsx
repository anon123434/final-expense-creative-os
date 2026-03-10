"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PlusCircle, Settings, UserCircle, Zap } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Campaign", href: "/campaigns/new", icon: PlusCircle },
  { label: "Avatars", href: "/avatars", icon: UserCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-sidebar text-sidebar-foreground print:hidden">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          <Zap className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
        </div>
        <div className="leading-none min-w-0">
          <div
            className="text-xs font-bold uppercase tracking-widest truncate"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--primary)",
              letterSpacing: "0.12em",
            }}
          >
            Creative OS
          </div>
          <div
            className="text-[10px] tracking-wider truncate text-muted-foreground"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Final Expense
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <span
          className="text-[10px] tracking-widest uppercase text-muted-foreground/40"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Navigation
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-sidebar-accent-foreground bg-sidebar-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              )}
              style={
                isActive
                  ? { borderLeft: "2px solid var(--primary)", paddingLeft: "10px", paddingRight: "12px" }
                  : { borderLeft: "2px solid transparent", paddingLeft: "10px", paddingRight: "12px" }
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: isActive ? 600 : 400 }}>
                {item.label}
              </span>
              {isActive && (
                <span
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--primary)", boxShadow: "0 0 5px var(--primary)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className="border-t px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: "var(--primary)", boxShadow: "0 0 4px var(--primary)" }}
          />
          <span
            className="text-[10px] tracking-wider text-muted-foreground/40"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
