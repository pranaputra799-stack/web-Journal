"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatDateWib,
  formatDateTimeWib,
  formatSignedMoney,
  formatTimeWib,
  pnlClass,
} from "@/lib/format";
import type { Trade } from "@/lib/types";

interface Cell {
  key: string;
  day: number;
}

interface DayData {
  pnl: number;
  count: number;
}

export function CalendarView({
  weeks,
  byDay,
  trades,
  todayKey,
  peak,
}: {
  weeks: (Cell | null)[][];
  byDay: Map<string, DayData>;
  trades: Trade[];
  todayKey: string;
  peak: number;
}) {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const selectedTrades = selectedDayKey
    ? trades.filter((t) => {
        const exitOrEntry = t.exit_time ?? t.entry_time;
        // Compare WIB day string
        const wibDate = new Intl.DateTimeFormat("sv-SE", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(exitOrEntry));
        return wibDate === selectedDayKey;
      })
    : [];

  const selectedDayData = selectedDayKey ? byDay.get(selectedDayKey) : null;

  return (
    <>
      <div className="grid grid-cols-8 border-b border-line">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
          <div key={day} className="num px-3 py-2 text-[11px] text-muted">
            {day}
          </div>
        ))}
        <div className="num border-l border-line px-3 py-2 text-[11px] text-muted">
          Ringkasan minggu
        </div>
      </div>

      {weeks.map((week, weekIndex) => {
        const weekDays = week.filter((cell): cell is Cell => cell !== null);
        const weekPnl = weekDays.reduce(
          (sum, cell) => sum + (byDay.get(cell.key)?.pnl ?? 0),
          0,
        );
        const weekCount = weekDays.reduce(
          (sum, cell) => sum + (byDay.get(cell.key)?.count ?? 0),
          0,
        );

        return (
          <div key={weekIndex} className="grid grid-cols-8 ledger-row">
            {week.map((cell, cellIndex) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${cellIndex}`}
                    className="min-h-[78px] border-r border-line bg-raised/20"
                  />
                );
              }
              const day = byDay.get(cell.key);
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDayKey;
              const intensity = day ? Math.min(Math.abs(day.pnl) / peak, 1) : 0;
              const background = !day
                ? "transparent"
                : day.pnl > 0
                  ? `rgba(63, 178, 127, ${0.12 + intensity * 0.45})`
                  : day.pnl < 0
                    ? `rgba(224, 87, 74, ${0.12 + intensity * 0.45})`
                    : "rgba(124, 136, 148, 0.18)";

              return (
                <div
                  key={cell.key}
                  onClick={() => setSelectedDayKey(cell.key)}
                  style={{ background }}
                  className={`min-h-[78px] cursor-pointer border-r border-line px-3 py-2 transition-all hover:brightness-110 ${
                    isSelected
                      ? "ring-2 ring-inset ring-brass z-10"
                      : isToday
                        ? "ring-1 ring-inset ring-brass"
                        : ""
                  }`}
                  title="Klik untuk melihat detail trade hari ini"
                >
                  <div className="flex items-center justify-between">
                    <span className="num text-[11px] text-muted">{cell.day}</span>
                    {day && (
                      <span className="num text-[10px] text-muted opacity-75">
                        {day.count}tr
                      </span>
                    )}
                  </div>
                  {day ? (
                    <span
                      className={`num mt-1 block text-sm font-medium ${
                        day.pnl > 0
                          ? "text-profit"
                          : day.pnl < 0
                            ? "text-loss"
                            : "text-flat"
                      }`}
                    >
                      {formatSignedMoney(day.pnl)}
                    </span>
                  ) : (
                    <span className="num mt-1 block text-[11px] text-muted">-</span>
                  )}
                </div>
              );
            })}

            <div className="border-l border-line px-3 py-2">
              <span
                className={`num block text-sm ${
                  weekPnl > 0
                    ? "text-profit"
                    : weekPnl < 0
                      ? "text-loss"
                      : "text-muted"
                }`}
              >
                {weekPnl === 0 && weekCount === 0 ? "-" : formatSignedMoney(weekPnl)}
              </span>
              <span className="num text-[11px] text-muted">{weekCount} trade</span>
            </div>
          </div>
        );
      })}

      {/* Floating Day Detail Drawer / Modal on Click */}
      {selectedDayKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="panel-surface relative w-full max-w-lg border border-line bg-ink p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-lg font-medium">
                  {formatDateWib(`${selectedDayKey}T00:00:00+07:00`)}
                </h3>
                <span className="num text-xs text-muted">
                  {selectedDayData
                    ? `${selectedDayData.count} trade · Total ${formatSignedMoney(selectedDayData.pnl)}`
                    : "Belum ada trade di tanggal ini"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="num rounded p-1 text-muted hover:text-paper"
              >
                ✕
              </button>
            </div>

            <div className="my-4 max-h-60 overflow-y-auto space-y-2">
              {selectedTrades.length === 0 ? (
                <p className="num py-6 text-center text-xs text-muted">
                  Tidak ada trade tercatat pada tanggal ini.
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {selectedTrades.map((t) => (
                    <li key={t.id} className="py-2.5">
                      <Link
                        href={`/trades/${t.id}`}
                        className="flex items-center justify-between hover:text-brass"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="num font-semibold">{t.pair}</span>
                            <span
                              className={`num text-xs ${
                                t.direction === "Buy" ? "text-profit" : "text-loss"
                              }`}
                            >
                              {t.direction}
                            </span>
                            <span className="num text-[10px] text-muted border border-line px-1">
                              {t.result}
                            </span>
                          </div>
                          <span className="num text-[11px] text-muted">
                            {formatTimeWib(t.entry_time)} WIB
                          </span>
                        </div>
                        <span className={`num text-sm ${pnlClass(t.profit_loss)}`}>
                          {formatSignedMoney(t.profit_loss)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4 text-xs">
              <Link
                href={`/catatan?hari=${selectedDayKey}`}
                className="num text-muted hover:text-brass"
              >
                Lihat Catatan Tanggal Ini &#8594;
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href={`/input?tanggal=${selectedDayKey}`}
                  className="num bg-brass px-3 py-1.5 text-brass-ink font-medium rounded"
                >
                  + Catat Trade Tanggal Ini
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
