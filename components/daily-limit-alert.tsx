"use client";

import { useState } from "react";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import type { Account } from "@/lib/types";

export interface DailyLimitAlertProps {
  todayPnl: number;
  account?: Account | null;
  startingBalance?: number;
  tradesToday?: number;
  className?: string;
  compact?: boolean;
}

export function DailyLimitAlert({
  todayPnl,
  account,
  startingBalance = 10000,
  tradesToday = 0,
  className = "",
  compact = false,
}: DailyLimitAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  // Daily max loss from account settings, or default to 2% of starting balance
  const dailyLimit =
    account?.max_daily_loss && account.max_daily_loss > 0
      ? account.max_daily_loss
      : (startingBalance > 0 ? startingBalance * 0.02 : 200);

  const isLosing = todayPnl < 0;
  const currentLoss = isLosing ? Math.abs(todayPnl) : 0;
  const usedPercent = (currentLoss / dailyLimit) * 100;
  const remainingCushion = Math.max(0, dailyLimit - currentLoss);

  // Status tiers
  const isBreached = currentLoss >= dailyLimit;
  const isWarning = !isBreached && usedPercent >= 75;
  const isCaution = !isBreached && !isWarning && usedPercent >= 50;

  // Don't show banner if profitable or loss is small (<50% limit) unless compact readout
  if (dismissed && !isBreached) return null;
  if (!isBreached && !isWarning && !isCaution && !compact) return null;

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between border px-3 py-2 text-xs transition-colors ${
          isBreached
            ? "border-loss bg-loss/10 text-loss font-semibold"
            : isWarning
              ? "border-brass bg-brass/10 text-brass"
              : "border-line bg-raised/50 text-muted"
        } ${className}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isBreached
                ? "bg-loss animate-ping"
                : isWarning
                  ? "bg-brass animate-pulse"
                  : "bg-profit"
            }`}
          />
          <span>
            {isBreached
              ? "STOP TRADING · Batas Harian Terlampaui"
              : isWarning
                ? "WASPADA · Batas Harian 75% Terpakai"
                : "Batas Loss Harian"}
          </span>
        </div>
        <div className="num font-mono">
          {formatSignedMoney(todayPnl)} / maks -{formatMoney(dailyLimit)}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`relative overflow-hidden border p-4 shadow-lg transition-all ${
        isBreached
          ? "border-loss bg-loss/15 text-paper ring-1 ring-loss/40"
          : isWarning
            ? "border-brass bg-brass/10 text-paper"
            : "border-line bg-panel text-paper"
      } ${className}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${
              isBreached
                ? "bg-loss text-ink"
                : isWarning
                  ? "bg-brass text-brass-ink"
                  : "bg-raised text-muted"
            }`}
          >
            {isBreached ? "✕" : "!"}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide">
                {isBreached
                  ? "STOP TRADING: BATAS KERUGIAN HARIAN TERLAMPAUI"
                  : isWarning
                    ? "PERINGATAN: MENDEKATI BATAS KERUGIAN HARIAN"
                    : "PEMANTAUAN RISIKO HARIAN"}
              </h3>
              <span
                className={`num text-[11px] px-2 py-0.5 font-bold uppercase rounded ${
                  isBreached
                    ? "bg-loss text-white"
                    : isWarning
                      ? "bg-brass text-brass-ink"
                      : "bg-raised text-muted"
                }`}
              >
                {usedPercent.toFixed(0)}% Digunakan
              </span>
            </div>

            <p className="mt-1 text-xs text-paper/90 leading-relaxed">
              {isBreached ? (
                <>
                  Kerugian hari ini telah mencapai{" "}
                  <strong className="num text-loss font-semibold">
                    {formatSignedMoney(todayPnl)}
                  </strong>{" "}
                  (batas maks: <span className="num font-medium">-{formatMoney(dailyLimit)}</span>).
                  Sesuai aturan disiplin dan prop firm, <strong>tutup platform trading</strong> dan
                  hindari revenge trading. Lanjutkan kembali esok hari.
                </>
              ) : isWarning ? (
                <>
                  Kerugian hari ini{" "}
                  <strong className="num text-loss font-medium">
                    {formatSignedMoney(todayPnl)}
                  </strong>{" "}
                  sudah mendekati batas harian <span className="num font-medium">-{formatMoney(dailyLimit)}</span>.
                  Sisa ruang aman hari ini tinggal{" "}
                  <strong className="num text-brass font-bold">{formatMoney(remainingCushion)}</strong>.
                  Pertimbangkan untuk berhenti atau kecilkan lot size!
                </>
              ) : (
                <>
                  Penggunaan batas kerugian hari ini:{" "}
                  <span className="num text-loss font-medium">{formatSignedMoney(todayPnl)}</span> dari batas{" "}
                  <span className="num font-medium">-{formatMoney(dailyLimit)}</span>.
                  Sisa buffer aman: <span className="num text-brass font-medium">{formatMoney(remainingCushion)}</span>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2 md:w-56">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/50 border border-line">
            <div
              className={`h-full transition-all duration-500 ${
                isBreached ? "bg-loss" : isWarning ? "bg-brass" : "bg-profit"
              }`}
              style={{ width: `${Math.min(100, usedPercent)}%` }}
            />
          </div>

          <div className="num flex w-full justify-between text-[11px] text-muted">
            <span>{tradesToday} trade hari ini</span>
            <span>Sisa: {formatMoney(remainingCushion)}</span>
          </div>

          {!isBreached && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[11px] text-muted hover:text-paper transition-colors"
            >
              Tutup peringatan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
