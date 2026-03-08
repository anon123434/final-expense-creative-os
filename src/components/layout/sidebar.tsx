"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PlusCircle, Settings, Zap } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Campaign", href: "/campaigns/new", icon: PlusCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-56 flex-col border-r"
      style={{ background: "#060606", borderColor: "#141414" }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-2.5 px-4 border-b"
        style={{ borderColor: "#141414" }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
          style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.25)",
            boxShadow: "0 0 8px rgba(0,255,136,0.12)",
          }}
        >
          <Zap className="h-3.5 w-3.5" style={{ color: "#00FF88" }} />
        </div>
        <div className="leading-none min-w-0">
          <div
            className="text-xs uppercase tracking-widest truncate"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              color: "#00FF88",
              letterSpacing: "0.12em",
              textShadow: "0 0 8px rgba(0,255,136,0.35)",
            }}
          >
            Creative OS
          </div>
          <div
            className="text-[10px] tracking-wider truncate"
            style={{ color: "#2E2E2E", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Final Expense
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ color: "#252525", fontFamily: "'JetBrains Mono', monospace" }}
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
                isActive ? "text-[#00FF88]" : "text-[#3A3A3A] hover:text-[#999999]"
              )}
              style={
                isActive
                  ? {
                      background: "rgba(0,255,136,0.05)",
                      borderLeft: "2px solid #00FF88",
                      paddingLeft: "10px",
                      paddingRight: "12px",
                    }
                  : { borderLeft: "2px solid transparent", paddingLeft: "10px", paddingRight: "12px" }
              }
            >
              <item.icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? "#00FF88" : undefined }}
              />
              <span
                style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  ...(isActive && { textShadow: "0 0 8px rgba(0,255,136,0.3)" }),
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "#00FF88", boxShadow: "0 0 5px #00FF88" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "#141414" }}>
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: "#00FF88", boxShadow: "0 0 4px #00FF88" }}
          />
          <span
            className="text-[10px] tracking-wider"
            style={{ color: "#2A2A2A", fontFamily: "'JetBrains Mono', monospace" }}
          >
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
