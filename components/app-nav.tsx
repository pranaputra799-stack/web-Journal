"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  {
    href: "/dashboard",
    label: "Dasbor",
    shortLabel: "Dasbor",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    href: "/trades",
    label: "Trades",
    shortLabel: "Trades",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Kalender",
    shortLabel: "Kalender",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/statistik",
    label: "Statistik",
    shortLabel: "Stats",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    href: "/catatan",
    label: "Catatan",
    shortLabel: "Catatan",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: "/input",
    label: "Input",
    shortLabel: "Input",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    shortLabel: "Setelan",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      </svg>
    ),
  },
];

const collapseListeners = new Set<() => void>();

function subscribeCollapse(callback: () => void) {
  collapseListeners.add(callback);
  return () => { collapseListeners.delete(callback); };
}

function getCollapseSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("nav_collapsed") === "true";
}

function getCollapseServerSnapshot(): boolean {
  return false;
}

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    getCollapseSnapshot,
    getCollapseServerSnapshot,
  );

  function toggleCollapse() {
    const next = !collapsed;
    try { window.localStorage.setItem("nav_collapsed", String(next)); } catch {}
    for (const listener of collapseListeners) listener();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <nav
        className={`hidden md:flex md:shrink-0 md:flex-col md:border-r md:border-line transition-all duration-200 ease-in-out ${
          collapsed ? "md:w-[60px]" : "md:w-56"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-line/40">
          {!collapsed ? (
            <>
              <Link href="/dashboard" className="text-base leading-tight font-medium">
                Jurnal
                <span className="block text-xs text-muted font-normal">Trading</span>
              </Link>
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex h-7 w-7 items-center justify-center border border-line text-muted hover:border-brass hover:text-brass transition-colors"
                aria-label="Ciutkan menu"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </>
          ) : (
            <div className="mx-auto flex flex-col items-center gap-2">
              <Link href="/dashboard" className="num text-sm font-semibold tracking-wider text-brass" title="Jurnal Trading">
                JT
              </Link>
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex h-6 w-6 items-center justify-center border border-line text-muted hover:border-brass hover:text-brass transition-colors"
                aria-label="Perluas menu"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Nav items */}
        <ul className="flex-1 py-2">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? link.label : undefined}
                  className={`num flex items-center gap-3 text-sm transition-colors ${
                    collapsed ? "justify-center px-2 py-3.5" : "px-4 py-3"
                  } ${
                    active
                      ? "text-brass font-medium bg-brass/5 border-r-2 border-brass"
                      : "text-muted hover:text-paper hover:bg-raised"
                  }`}
                >
                  <span className={active ? "text-brass" : "text-muted"}>
                    {link.icon}
                  </span>
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className={`border-t border-line/40 py-4 ${collapsed ? "px-2 flex flex-col items-center gap-3" : "space-y-2 px-4"}`}>
          {!collapsed ? (
            <>
              <p className="num truncate text-xs text-muted" title={email}>{email}</p>
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <form action="/auth/signout" method="post">
                  <button type="submit" className="num text-xs text-muted hover:text-loss transition-colors">
                    Keluar
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-raised text-[11px] text-brass border border-line" title={email}>
                {email.slice(0, 1).toUpperCase()}
              </div>
              <ThemeToggle compact />
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex h-7 w-7 items-center justify-center text-muted hover:text-loss hover:bg-raised transition-colors"
                  title="Keluar"
                  aria-label="Keluar"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </nav>

      {/* ── Mobile: bottom tab bar ────────────────────────────────── */}
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-sm font-medium">
            Jurnal <span className="text-brass">Trading</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <form action="/auth/signout" method="post">
              <button type="submit" className="num text-xs text-muted hover:text-loss">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-ink/95 backdrop-blur-md md:hidden pb-safe">
        <ul className="grid grid-cols-7 items-stretch">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            const isInput = link.href === "/input";
            return (
              <li key={link.href} className="flex">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center w-full py-2 text-[9px] transition-colors ${
                    active
                      ? "text-brass font-medium bg-brass/5"
                      : isInput
                      ? "text-brass/90 hover:text-brass"
                      : "text-muted hover:text-paper"
                  }`}
                >
                  <span className={`transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                    {link.icon}
                  </span>
                  <span className="num mt-1 truncate max-w-full px-0.5 tracking-tight">
                    {link.shortLabel ?? link.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
