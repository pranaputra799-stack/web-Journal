import { formatMoney, formatPercent, formatSignedMoney } from "@/lib/format";
import type { Account } from "@/lib/types";
import { Panel, PanelHead } from "@/components/ui";

export function FundedGuard({
  account,
  currentNetPnl,
  todayPnl,
  maxDrawdown,
}: {
  account: Account;
  currentNetPnl: number;
  todayPnl: number;
  maxDrawdown: number;
}) {
  const hasTarget = account.profit_target && account.profit_target > 0;
  const hasDailyLimit = account.max_daily_loss && account.max_daily_loss > 0;
  const hasTotalLoss = account.max_total_loss && account.max_total_loss > 0;

  if (!hasTarget && !hasDailyLimit && !hasTotalLoss) return null;

  // Target Profit Progress
  const target = account.profit_target ?? 0;
  const targetProgress = target > 0 ? Math.min(100, Math.max(0, (currentNetPnl / target) * 100)) : 0;
  const remainingTarget = target > 0 ? Math.max(0, target - currentNetPnl) : 0;

  // Daily Loss Cushion (todayPnl is negative if losing)
  const maxDaily = account.max_daily_loss ?? 0;
  const todayLoss = todayPnl < 0 ? Math.abs(todayPnl) : 0;
  const dailyUsedPercent = maxDaily > 0 ? Math.min(100, (todayLoss / maxDaily) * 100) : 0;
  const dailyCushion = maxDaily > 0 ? Math.max(0, maxDaily - todayLoss) : 0;
  const dailyStatus =
    todayLoss >= maxDaily
      ? "MELANGGAR"
      : dailyUsedPercent >= 75
        ? "WASPADA"
        : "AMAN";

  // Total Drawdown Cushion
  const maxTotal = account.max_total_loss ?? 0;
  const totalUsedPercent = maxTotal > 0 ? Math.min(100, (maxDrawdown / maxTotal) * 100) : 0;
  const totalCushion = maxTotal > 0 ? Math.max(0, maxTotal - maxDrawdown) : 0;
  const totalStatus =
    maxDrawdown >= maxTotal
      ? "MELANGGAR"
      : totalUsedPercent >= 75
        ? "WASPADA"
        : "AMAN";

  return (
    <Panel className="border-brass/30 bg-brass/5">
      <PanelHead
        title={`Pelacak Akun Funded · ${account.name}`}
        note="Batas Aturan Prop Firm"
      />
      <div className="grid gap-5 px-4 py-4 md:grid-cols-3">
        {/* Profit Target */}
        <div className="space-y-2 border-line/60 md:border-r md:pr-4">
          <div className="flex items-center justify-between">
            <span className="num text-[11px] text-muted">TARGET PROFIT</span>
            <span className="num text-xs font-semibold text-profit">
              {targetProgress.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-profit transition-all duration-300"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <div className="num flex justify-between text-[11px] text-muted">
            <span>capai {formatSignedMoney(currentNetPnl)}</span>
            <span>target {formatMoney(target)}</span>
          </div>
          {remainingTarget > 0 ? (
            <p className="num text-[10px] text-muted">
              Kurang {formatMoney(remainingTarget)} lagi menuju target pass
            </p>
          ) : (
            <p className="num text-[10px] text-profit font-medium">
              Target tercapai! Siap verifikasi / payout
            </p>
          )}
        </div>

        {/* Max Daily Loss */}
        <div className="space-y-2 border-line/60 md:border-r md:pr-4">
          <div className="flex items-center justify-between">
            <span className="num text-[11px] text-muted">DAILY LOSS LIMIT</span>
            <span
              className={`num text-[10px] px-1.5 py-0.5 font-medium border ${
                dailyStatus === "AMAN"
                  ? "border-profit/40 text-profit bg-profit/10"
                  : dailyStatus === "WASPADA"
                    ? "border-brass text-brass bg-brass/10"
                    : "border-loss text-loss bg-loss/10"
              }`}
            >
              {dailyStatus}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full transition-all duration-300 ${
                dailyUsedPercent >= 75 ? "bg-loss" : "bg-brass"
              }`}
              style={{ width: `${dailyUsedPercent}%` }}
            />
          </div>
          <div className="num flex justify-between text-[11px] text-muted">
            <span>rugi hari ini {formatSignedMoney(-todayLoss)}</span>
            <span>maks {formatMoney(maxDaily)}</span>
          </div>
          <p className="num text-[10px] text-muted">
            Sisa batas aman hari ini:{" "}
            <span className="font-semibold text-paper">{formatMoney(dailyCushion)}</span>
          </p>
        </div>

        {/* Max Total Drawdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="num text-[11px] text-muted">MAX TOTAL LOSS</span>
            <span
              className={`num text-[10px] px-1.5 py-0.5 font-medium border ${
                totalStatus === "AMAN"
                  ? "border-profit/40 text-profit bg-profit/10"
                  : totalStatus === "WASPADA"
                    ? "border-brass text-brass bg-brass/10"
                    : "border-loss text-loss bg-loss/10"
              }`}
            >
              {totalStatus}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full transition-all duration-300 ${
                totalUsedPercent >= 75 ? "bg-loss" : "bg-brass"
              }`}
              style={{ width: `${totalUsedPercent}%` }}
            />
          </div>
          <div className="num flex justify-between text-[11px] text-muted">
            <span>drawdown {formatSignedMoney(-maxDrawdown)}</span>
            <span>batas {formatMoney(maxTotal)}</span>
          </div>
          <p className="num text-[10px] text-muted">
            Sisa ruang drawdown:{" "}
            <span className="font-semibold text-paper">{formatMoney(totalCushion)}</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}
