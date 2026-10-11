"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatDateWib,
  formatMoney,
  formatSignedMoney,
  formatSignedPercent,
  pnlClass,
} from "@/lib/format";
import type { Trade } from "@/lib/types";

export interface PerformanceHeatmapProps {
  trades: Trade[];
  startingBalance?: number;
  className?: string;
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  pnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  bes: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const DAY_LABELS = ["Sen", "", "Rab", "", "Jum", "", "Min"];

export function PerformanceHeatmap({
  trades,
  startingBalance = 10000,
  className = "",
}: PerformanceHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Group closed trades by WIB date
  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();
    const closed = trades.filter((t) => t.status === "Done");

    for (const t of closed) {
      const time = t.exit_time ?? t.entry_time;
      if (!time) continue;
      // Convert to WIB date YYYY-MM-DD
      const d = new Date(time);
      const wibDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);

      const existing = map.get(wibDate) ?? {
        dateStr: wibDate,
        pnl: 0,
        tradeCount: 0,
        wins: 0,
        losses: 0,
        bes: 0,
      };

      existing.pnl += t.profit_loss;
      existing.tradeCount += 1;
      if (t.profit_loss > 0) existing.wins += 1;
      else if (t.profit_loss < 0) existing.losses += 1;
      else existing.bes += 1;

      map.set(wibDate, existing);
    }
    return map;
  }, [trades]);

  // Determine active years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const dateStr of dayMap.keys()) {
      const y = parseInt(dateStr.slice(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    }
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [dayMap]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

  // Keep selectedYear in sync when trade data changes (new year's trades added)
  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Calculate year metrics
  const stats = useMemo(() => {
    const yearDays = Array.from(dayMap.values()).filter(
      (d) => d.dateStr.startsWith(String(selectedYear)) && d.tradeCount > 0,
    );

    const profitDays = yearDays.filter((d) => d.pnl > 0).length;
    const lossDays = yearDays.filter((d) => d.pnl < 0).length;
    const beDays = yearDays.filter((d) => d.pnl === 0).length;
    const totalPnl = yearDays.reduce((acc, d) => acc + d.pnl, 0);

    const bestDay = yearDays.length
      ? yearDays.reduce((max, d) => (d.pnl > max.pnl ? d : max), yearDays[0])
      : null;
    const worstDay = yearDays.length
      ? yearDays.reduce((min, d) => (d.pnl < min.pnl ? d : min), yearDays[0])
      : null;

    // Calculate longest win streak of consecutive profitable days
    const sortedDays = [...yearDays].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    let longestStreak = 0;
    let currentStreak = 0;
    for (const d of sortedDays) {
      if (d.pnl > 0) {
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      totalTradingDays: yearDays.length,
      profitDays,
      lossDays,
      beDays,
      winRate: yearDays.length > 0 ? (profitDays / yearDays.length) * 100 : 0,
      totalPnl,
      bestDay,
      worstDay,
      longestStreak,
    };
  }, [dayMap, selectedYear]);

  // Build 52-week calendar grid for selectedYear
  const gridWeeks = useMemo(() => {
    // Start from Jan 1 of selectedYear
    const start = new Date(Date.UTC(selectedYear, 0, 1));
    // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat.
    // We want Monday = 0, ..., Sunday = 6
    const startDay = (start.getUTCDay() + 6) % 7;

    // Adjust start to previous Monday
    const calendarStart = new Date(start);
    calendarStart.setUTCDate(calendarStart.getUTCDate() - startDay);

    const end = new Date(Date.UTC(selectedYear, 11, 31));
    const weeks: Array<Array<{ dateStr: string; inYear: boolean; data?: DayData }>> = [];

    const current = new Date(calendarStart);
    while (current <= end || weeks.length < 52) {
      const week: Array<{ dateStr: string; inYear: boolean; data?: DayData }> = [];
      for (let day = 0; day < 7; day++) {
        const yyyy = current.getUTCFullYear();
        const mm = String(current.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(current.getUTCDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const inYear = yyyy === selectedYear;

        week.push({
          dateStr,
          inYear,
          data: dayMap.get(dateStr),
        });

        current.setUTCDate(current.getUTCDate() + 1);
      }
      weeks.push(week);
      if (current.getUTCFullYear() > selectedYear && current.getUTCDay() === 1) {
        break;
      }
    }

    return weeks;
  }, [selectedYear, dayMap]);

  // Determine cell color based on day data
  const getCellColor = (item: { dateStr: string; inYear: boolean; data?: DayData }) => {
    if (!item.inYear) return "opacity-15 bg-transparent";
    if (!item.data || item.data.tradeCount === 0) {
      return "bg-raised/50 border border-line/30 hover:border-paper/40";
    }

    const { pnl } = item.data;
    if (pnl === 0) {
      return "bg-brass/40 border border-brass/60";
    }

    // Profit shades
    if (pnl > 0) {
      if (pnl < 30) return "bg-emerald-950/70 border border-emerald-800/60 text-emerald-300";
      if (pnl < 100) return "bg-emerald-800/80 border border-emerald-600/70 text-emerald-200";
      if (pnl < 250) return "bg-emerald-600 border border-emerald-500 text-white";
      return "bg-emerald-500 border border-emerald-400 shadow-sm shadow-emerald-500/30 text-white";
    }

    // Loss shades
    const loss = Math.abs(pnl);
    if (loss < 30) return "bg-rose-950/70 border border-rose-800/60 text-rose-300";
    if (loss < 100) return "bg-rose-800/80 border border-rose-600/70 text-rose-200";
    if (loss < 250) return "bg-rose-600 border border-rose-500 text-white";
    return "bg-rose-500 border border-rose-400 shadow-sm shadow-rose-500/30 text-white";
  };

  return (
    <div className={`relative px-4 py-4 select-none ${className}`}>
      {/* Header controls: Title, Year switcher & stats */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-paper">Performance Heatmap</h3>
            <span className="num rounded bg-raised px-1.5 py-0.5 text-[10px] text-brass font-medium">
              Kalender Harian
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Peta visual performa per hari. Hijau = profit, Merah = loss, semakin pekat = semakin besar nominal.
          </p>
        </div>

        {/* Year Selector */}
        {availableYears.length > 1 && (
          <div className="flex items-center border border-line p-0.5 text-xs">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`num px-2.5 py-1 transition-colors ${
                  selectedYear === yr
                    ? "bg-raised text-brass font-semibold"
                    : "text-muted hover:text-paper"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Readout Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 border-b border-line/40 pb-3 text-xs">
        <div>
          <span className="num block text-[10px] text-muted uppercase">HARI TRADING</span>
          <span className="num text-sm font-semibold text-paper">{stats.totalTradingDays} hari</span>
        </div>
        <div>
          <span className="num block text-[10px] text-muted uppercase">WIN RATE HARI</span>
          <span className="num text-sm font-semibold text-profit">
            {stats.winRate.toFixed(1)}% ({stats.profitDays}W {stats.lossDays}L)
          </span>
        </div>
        <div>
          <span className="num block text-[10px] text-muted uppercase">TOTAL P/L TAHUN {selectedYear}</span>
          <span className={`num text-sm font-semibold ${pnlClass(stats.totalPnl)}`}>
            {formatSignedMoney(stats.totalPnl)}
          </span>
        </div>
        <div>
          <span className="num block text-[10px] text-muted uppercase">STREAK HIJAU MAKS</span>
          <span className="num text-sm font-semibold text-brass">{stats.longestStreak} hari beruntun</span>
        </div>
        <div>
          <span className="num block text-[10px] text-muted uppercase">HARI TERBAIK</span>
          <span className="num text-sm font-semibold text-profit">
            {stats.bestDay ? formatSignedMoney(stats.bestDay.pnl) : "-"}
          </span>
        </div>
        <div>
          <span className="num block text-[10px] text-muted uppercase">HARI TERBURUK</span>
          <span className="num text-sm font-semibold text-loss">
            {stats.worstDay ? formatSignedMoney(stats.worstDay.pnl) : "-"}
          </span>
        </div>
      </div>

      {/* Heatmap Grid Wrapper (Scrollable on small screens) */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="inline-block min-w-[760px]">
          {/* Month labels header */}
          <div className="mb-1 flex pl-8 text-[10px] text-muted font-mono">
            {MONTH_NAMES.map((name, i) => (
              <div key={name} style={{ width: `${100 / 12}%` }} className="truncate">
                {name}
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            {/* Day of Week Labels (Left Axis) */}
            <div className="flex flex-col justify-between py-0.5 text-[9px] text-muted font-mono w-6 select-none">
              {DAY_LABELS.map((label, idx) => (
                <div key={idx} className="h-3 flex items-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks Column Container */}
            <div className="flex gap-1">
              {gridWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((item, dIdx) => {
                    const isHovered = hoveredDay?.dateStr === item.dateStr;
                    return (
                      <div
                        key={dIdx}
                        onMouseEnter={(e) => {
                          if (item.data) {
                            setHoveredDay(item.data);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredDay(null);
                          setTooltipPos(null);
                        }}
                        className={`h-3 w-3 rounded-[2px] transition-all cursor-pointer ${getCellColor(
                          item,
                        )} ${isHovered ? "ring-2 ring-brass scale-125 z-20" : ""}`}
                        title={
                          item.data
                            ? `${item.dateStr}: ${formatSignedMoney(item.data.pnl)} (${item.data.tradeCount} trade)`
                            : item.inYear
                              ? `${item.dateStr}: tidak ada trade`
                              : ""
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Intensity Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-2.5 text-[11px] text-muted">
        <div className="flex items-center gap-1.5">
          <span>Rugi:</span>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-rose-950/70 border border-rose-800" title="Rugi kecil" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-rose-800 border border-rose-600" title="Rugi sedang" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-rose-600 border border-rose-500" title="Rugi besar" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-rose-500 border border-rose-400" title="Rugi sangat besar" />
          </div>
          <span className="ml-2">Netral:</span>
          <span className="h-2.5 w-2.5 rounded-[2px] bg-raised border border-line" title="Tidak ada trade" />
          <span className="ml-2">Untung:</span>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-950/70 border border-emerald-800" title="Untung kecil" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-800 border border-emerald-600" title="Untung sedang" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-600 border border-emerald-500" title="Untung besar" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500 border border-emerald-400" title="Untung sangat besar" />
          </div>
        </div>

        <span className="num font-mono text-[10px]">
          {trades.length} Total riwayat trade dimuat
        </span>
      </div>

      {/* Floating Tooltip */}
      {hoveredDay && tooltipPos && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-full transform pb-2 transition-transform duration-75"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className="panel-surface min-w-[190px] border border-line bg-ink/95 p-2.5 shadow-2xl backdrop-blur-md rounded text-xs">
            <div className="flex items-center justify-between border-b border-line/60 pb-1 font-semibold">
              <span className="num text-brass">
                {formatDateWib(`${hoveredDay.dateStr}T12:00:00+07:00`)}
              </span>
              <span className={`num font-bold ${pnlClass(hoveredDay.pnl)}`}>
                {formatSignedMoney(hoveredDay.pnl)}
              </span>
            </div>

            <div className="mt-1.5 space-y-1 text-[11px]">
              <div className="flex justify-between text-muted">
                <span>Total trade:</span>
                <span className="num text-paper font-medium">{hoveredDay.tradeCount} trade</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Hasil:</span>
                <span className="num text-paper">
                  <span className="text-profit font-semibold">{hoveredDay.wins}W</span> ·{" "}
                  <span className="text-loss font-semibold">{hoveredDay.losses}L</span>
                  {hoveredDay.bes > 0 ? ` · ${hoveredDay.bes}BE` : ""}
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Dampak modal:</span>
                <span className={`num font-medium ${pnlClass(hoveredDay.pnl)}`}>
                  {startingBalance > 0
                    ? formatSignedPercent((hoveredDay.pnl / startingBalance) * 100)
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
