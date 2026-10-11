"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  category: "Navigasi" | "Aksi Cepat" | "Filter & Tampilan";
  label: string;
  sublabel?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global hotkey listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    const nav = (path: string) => () => {
      setIsOpen(false);
      router.push(path);
    };

    return [
      // Quick Navigation
      {
        id: "nav-dashboard",
        category: "Navigasi",
        label: "Dasbor Utama",
        sublabel: "Lihat ringkasan performa & equity curve",
        icon: "📊",
        shortcut: "G D",
        action: nav("/dashboard"),
      },
      {
        id: "nav-trades",
        category: "Navigasi",
        label: "Daftar Trades",
        sublabel: "Semua riwayat transaksi posisi tertutup & terbuka",
        icon: "📋",
        shortcut: "G T",
        action: nav("/trades"),
      },
      {
        id: "nav-input",
        category: "Navigasi",
        label: "Catat Trade Baru",
        sublabel: "Buka formulir input trade",
        icon: "➕",
        shortcut: "G N",
        action: nav("/input"),
      },
      {
        id: "nav-calendar",
        category: "Navigasi",
        label: "Kalender P/L",
        sublabel: "Kalender hasil trading harian & mingguan",
        icon: "📅",
        shortcut: "G C",
        action: nav("/calendar"),
      },
      {
        id: "nav-stats",
        category: "Navigasi",
        label: "Statistik Mendalam",
        sublabel: "Analisis win rate, payoff, model entry & drawdown",
        icon: "📈",
        shortcut: "G S",
        action: nav("/statistik"),
      },
      {
        id: "nav-notes",
        category: "Navigasi",
        label: "Catatan Harian & Mingguan",
        sublabel: "Jurnal psikologi, evaluasi & checklist",
        icon: "📝",
        shortcut: "G J",
        action: nav("/catatan"),
      },
      {
        id: "nav-settings",
        category: "Navigasi",
        label: "Pengaturan Akun & Saldo",
        sublabel: "Kelola akun prop firm, target & backup",
        icon: "⚙️",
        action: nav("/pengaturan"),
      },

      // Quick Actions
      {
        id: "action-new-trade",
        category: "Aksi Cepat",
        label: "Catat Trade Cepat",
        sublabel: "Input posisi baru ke jurnal",
        icon: "⚡",
        action: nav("/input"),
      },
      {
        id: "action-filter-all",
        category: "Filter & Tampilan",
        label: "Filter: Semua Riwayat Trade",
        sublabel: "Tampilkan seluruh data tanpa batasan tanggal",
        icon: "🌐",
        action: nav("/dashboard?rentang=semua"),
      },
      {
        id: "action-filter-month",
        category: "Filter & Tampilan",
        label: "Filter: Bulan Ini",
        sublabel: "Tampilkan statistik khusus bulan berjalan",
        icon: "📆",
        action: nav("/dashboard?rentang=bulan"),
      },
      {
        id: "action-unit-percent",
        category: "Filter & Tampilan",
        label: "Tampilan Mode Persen (%)",
        sublabel: "Ubah angka hasil trade ke format persentase modal",
        icon: "％",
        action: nav("/dashboard?unit=persen"),
      },
      {
        id: "action-unit-dollar",
        category: "Filter & Tampilan",
        label: "Tampilan Mode Dollar ($)",
        sublabel: "Ubah angka hasil trade ke format nominal mata uang",
        icon: "💲",
        action: nav("/dashboard?unit=dollar"),
      },
      {
        id: "action-dd-static",
        category: "Filter & Tampilan",
        label: "Mode Drawdown: Statis (4% Modal Awal)",
        sublabel: "Hitung risiko berdasarkan saldo awal prop firm",
        icon: "🛡️",
        action: nav("/dashboard?dd=statis"),
      },
      {
        id: "action-dd-dynamic",
        category: "Filter & Tampilan",
        label: "Mode Drawdown: Dinamis (Trailing Puncak)",
        sublabel: "Hitung risiko trailing dari equity tertinggi",
        icon: "📉",
        action: nav("/dashboard?dd=dinamis"),
      },
    ];
  }, [router]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(lower)) ||
        item.category.toLowerCase().includes(lower),
    );
  }, [items, query]);

  // Handle keyboard navigation inside the list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded border border-line/60 bg-raised/50 px-2.5 py-1 text-xs text-muted hover:border-brass/40 hover:text-paper transition-all group"
        title="Buka Command Palette (Ctrl + K)"
      >
        <span className="text-xs">🔍</span>
        <span className="hidden sm:inline text-xs">Cari atau pintasan...</span>
        <kbd className="num ml-1 rounded bg-ink/70 border border-line px-1.5 py-0.5 text-[10px] text-brass group-hover:border-brass/50 font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-ink/80 backdrop-blur-md animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-line/80 bg-ink/95 shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3.5">
          <span className="text-base text-muted">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Ketik tujuan, aksi, atau filter..."
            className="flex-1 bg-transparent text-sm text-paper placeholder:text-muted/60 focus:outline-none border-none p-0"
          />
          <kbd
            onClick={() => setIsOpen(false)}
            className="num cursor-pointer rounded border border-line bg-raised/70 px-1.5 py-0.5 text-[10px] text-muted hover:text-paper"
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted">
              Tidak ada hasil yang cocok dengan &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => item.action()}
                    className={`flex items-center justify-between rounded px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brass/10 text-paper border border-brass/30"
                        : "text-muted hover:text-paper hover:bg-raised/40 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <div className="min-w-0 truncate">
                        <div className="font-medium text-paper flex items-center gap-2">
                          <span>{item.label}</span>
                          <span className="text-[10px] text-muted/60 uppercase">
                            · {item.category}
                          </span>
                        </div>
                        {item.sublabel && (
                          <p className="text-[11px] text-muted truncate">{item.sublabel}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {item.shortcut && (
                        <kbd className="num rounded bg-raised/80 border border-line px-1.5 py-0.5 text-[10px] text-brass font-mono">
                          {item.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <span className="num text-[11px] text-brass">↵</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-line/60 bg-raised/20 px-4 py-2 text-[10px] text-muted font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Pilih</span>
            <span>ESC Tutup</span>
          </div>
          <span>Trading Command Palette</span>
        </div>
      </div>
    </div>
  );
}
