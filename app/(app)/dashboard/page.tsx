import Link from "next/link";

import { DailyBars, DrawdownChart, EquityChart } from "@/components/charts";
import { FundedGuard } from "@/components/funded-guard";
import { Empty, Panel, PanelHead, SmallSampleTag } from "@/components/ui";
import {
  dayKeyWib,
  formatDateWib,
  formatMoney,
  formatSignedMoney,
  formatSignedPercent,
  formatTimeWib,
  pnlClass,
} from "@/lib/format";
import { listAccounts, listTrades } from "@/lib/queries";
import { dailyPnl, drawdown, equityCurve, streaks, summarise } from "@/lib/stats";

type SearchParams = Promise<{ rentang?: string; akun?: string; unit?: string }>;

const RANGES = [
  { key: "bulan", label: "Bulan ini" },
  { key: "30", label: "30 hari" },
  { key: "90", label: "90 hari" },
  { key: "semua", label: "Semua" },
];

function rangeBounds(range: string | undefined) {
  const now = new Date();
  const todayKey = dayKeyWib(now.toISOString());

  if (range === "semua") return { from: undefined, to: undefined };
  if (range === "30" || range === "90") {
    const days = Number(range);
    const from = new Date(now.getTime() - days * 86400000);
    return { from: dayKeyWib(from.toISOString()), to: todayKey };
  }

  // Default: the current WIB month.
  return { from: `${todayKey.slice(0, 7)}-01`, to: todayKey };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const range = params.rentang ?? "bulan";
  const unit = params.unit === "persen" ? "persen" : "dollar";
  const bounds = rangeBounds(range);

  const [accounts, trades] = await Promise.all([
    listAccounts(),
    listTrades({ from: bounds.from, to: bounds.to, accountId: params.akun }),
  ]);

  const summary = summarise(trades);
  const activeAccount = accounts.find((account) => account.id === params.akun);
  const startingBalance =
    activeAccount?.starting_balance ??
    accounts.reduce((sum, account) => sum + account.starting_balance, 0);

  const points = equityCurve(trades, startingBalance);
  const dd = drawdown(points, summary.netPnl);
  const streak = streaks(trades);

  const dayMap = dailyPnl(trades, dayKeyWib, (trade) => trade.exit_time ?? trade.entry_time);
  const days = [...dayMap.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const recent = trades.slice(0, 5);
  const netTone = summary.netPnl > 0 ? "profit" : summary.netPnl < 0 ? "loss" : "flat";
  const netPercent = startingBalance > 0 ? (summary.netPnl / startingBalance) * 100 : 0;
  const isPercent = unit === "persen";

  // Outcome distribution calculations (TP / SL / BE / Manual)
  const closed = trades.filter((t) => t.status === "Done");
  const tpTrades = closed.filter((t) => t.result === "TP");
  const slTrades = closed.filter((t) => t.result === "SL");
  const beTrades = closed.filter((t) => t.result === "BE");
  const manualTrades = closed.filter((t) => t.result === "Manual");

  // Pair highlights
  const pairMap = new Map<string, { pnl: number; count: number }>();
  for (const t of closed) {
    const cur = pairMap.get(t.pair) ?? { pnl: 0, count: 0 };
    cur.pnl += t.profit_loss;
    cur.count += 1;
    pairMap.set(t.pair, cur);
  }
  const sortedPairs = [...pairMap.entries()].sort((a, b) => b[1].pnl - a[1].pnl);
  const bestPair = sortedPairs[0];
  const worstPair = sortedPairs.length > 1 ? sortedPairs[sortedPairs.length - 1] : null;

  // Best day & worst day
  const sortedDays = [...days].sort((a, b) => b.pnl - a.pnl);
  const bestDay = sortedDays[0];
  const worstDay = sortedDays.length > 1 ? sortedDays[sortedDays.length - 1] : null;

  // Today's P/L for funded guard
  const todayKey = dayKeyWib(new Date().toISOString());
  const todayPnl = dayMap.get(todayKey)?.pnl ?? 0;

  // Check if active account or any account is funded
  const fundedAccount = activeAccount?.type === "funded" ? activeAccount : accounts.find((a) => a.type === "funded");

  return (
    <>
      {/* ── Tally strip ────────────────────────────────────────── */}
      <header className="border-b border-line px-4 py-5 md:px-8 md:py-7">

        {/* Filter row — wraps cleanly on narrow screens */}
        <div className="flex flex-wrap gap-2">
          {/* Range buttons */}
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((option) => (
              <Link
                key={option.key}
                href={`/dashboard?rentang=${option.key}&unit=${unit}${params.akun ? `&akun=${params.akun}` : ""}`}
                className={`num border px-3 py-2 text-xs transition-colors ${
                  range === option.key ? "border-brass text-brass bg-brass/5" : "border-line text-muted hover:text-paper"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>

          {/* Unit toggle */}
          <div className="flex items-center border border-line p-0.5 text-xs">
            <Link
              href={`/dashboard?rentang=${range}&unit=dollar${params.akun ? `&akun=${params.akun}` : ""}`}
              className={`num px-2.5 py-1.5 transition-colors ${
                !isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
              }`}
            >
              $
            </Link>
            <Link
              href={`/dashboard?rentang=${range}&unit=persen${params.akun ? `&akun=${params.akun}` : ""}`}
              className={`num px-2.5 py-1.5 transition-colors ${
                isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
              }`}
            >
              %
            </Link>
          </div>

          {/* Account selector */}
          {accounts.length > 1 && (
            <form className="flex items-center gap-1.5">
              <input type="hidden" name="rentang" value={range} />
              <input type="hidden" name="unit" value={unit} />
              <select name="akun" defaultValue={params.akun ?? ""} className="num w-auto text-xs py-2">
                <option value="">Semua akun</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
              <button type="submit" className="num border border-line px-2.5 py-2 text-xs text-muted hover:text-paper">
                Terapkan
              </button>
            </form>
          )}
        </div>

        {/* Net P/L hero number */}
        <div className="rise mt-5" style={{ "--d": "0ms" } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <span className="num text-[11px] text-muted">NET P/L</span>
            {summary.smallSample && <SmallSampleTag />}
          </div>
          <div className={`num mt-1.5 text-[2.5rem] leading-none md:text-5xl ${pnlToneClass(netTone)}`}>
            {isPercent ? formatSignedPercent(netPercent) : formatSignedMoney(summary.netPnl)}
          </div>
          <p className="mt-2 text-sm text-muted">
            {summary.totalTrades} trade tertutup
            {bounds.from && bounds.to
              ? ` · ${formatDateWib(`${bounds.from}T00:00:00+07:00`)} – ${formatDateWib(`${bounds.to}T00:00:00+07:00`)}`
              : ""}
          </p>
        </div>

        {/* Stats grid: 2 col on mobile, 4 on desktop */}
        <dl
          className="rise mt-6 grid grid-cols-2 gap-4 border-t border-line/40 pt-5 md:grid-cols-4"
          style={{ "--d": "90ms" } as React.CSSProperties}
        >
          <Readout
            label="WIN RATE"
            value={summary.winRate === null ? "-" : `${summary.winRate.toFixed(1)}%`}
            note={`${summary.wins}W ${summary.losses}L ${summary.breakEven}BE`}
          />
          <Readout
            label="PROFIT FACTOR"
            value={summary.profitFactor === null ? "-" : summary.profitFactor.toFixed(2)}
            note={
              isPercent && startingBalance > 0
                ? `+${((summary.grossProfit / startingBalance) * 100).toFixed(1)}% / -${((summary.grossLoss / startingBalance) * 100).toFixed(1)}%`
                : `${formatSignedMoney(summary.grossProfit)} / ${formatSignedMoney(-summary.grossLoss)}`
            }
          />
          <Readout
            label="EXPECTANCY"
            value={
              isPercent && startingBalance > 0
                ? formatSignedPercent((summary.expectancyUsd / startingBalance) * 100)
                : formatSignedMoney(summary.expectancyUsd)
            }
            note={
              summary.expectancyR === null
                ? "–"
                : `${summary.expectancyR.toFixed(2)}R / trade`
            }
          />
          <Readout
            label="STREAK"
            value={
              streak.currentKind === "none"
                ? "-"
                : `${streak.current} ${streak.currentKind === "win" ? "menang" : "kalah"}`
            }
            note={`maks ${streak.longestWin}W / ${streak.longestLoss}L`}
          />
        </dl>
      </header>

      {summary.totalTrades === 0 ? (
        <Empty
          title="Belum ada trade di rentang ini"
          hint="Catat trade pertamamu. Dasbor ini mengisi sendiri begitu ada data."
          action={{ href: "/input", label: "Catat trade" }}
        />
      ) : (
        <div className="space-y-4 px-4 py-5 md:space-y-6 md:px-8">
          {/* Funded Account Guard if funded account exists */}
          {fundedAccount && (
            <FundedGuard
              account={fundedAccount}
              currentNetPnl={summary.netPnl}
              todayPnl={todayPnl}
              maxDrawdown={dd.maxDrawdown}
            />
          )}

          <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <PanelHead title="Kurva equity" note={activeAccount ? activeAccount.name : "semua akun"} />
              <EquityChart
                points={points}
                base={startingBalance}
                unit={isPercent ? "percent" : "dollar"}
              />
            </Panel>

            <Panel>
              <PanelHead
                title="Drawdown"
                note={
                  dd.maxDrawdown > 0
                    ? isPercent
                      ? `maks -${dd.maxDrawdownPercent.toFixed(1)}%`
                      : `maks ${formatSignedMoney(-dd.maxDrawdown)}`
                    : "belum ada"
                }
              />
              <DrawdownChart
                points={points}
                unit={isPercent ? "percent" : "dollar"}
              />
              {dd.maxDrawdownPercent > 0 && (
                <p className="num border-t border-line px-4 py-3 text-[11px] text-muted">
                  {dd.maxDrawdownPercent.toFixed(1)}% dari puncak ({formatSignedMoney(-dd.maxDrawdown)})
                  {dd.recoveryFactor !== null ? `, recovery factor ${dd.recoveryFactor.toFixed(2)}` : ""}
                </p>
              )}
            </Panel>

            <Panel className="lg:col-span-2">
              <PanelHead title="P/L harian" note={`${days.length} hari`} />
              <DailyBars
                days={days}
                base={startingBalance}
                unit={isPercent ? "percent" : "dollar"}
              />
            </Panel>

            {/* Outcome Distribution Panel (TP / SL / BE / Manual) from Section 4 */}
            <Panel>
              <PanelHead title="Distribusi hasil" note={`${closed.length} trade`} />
              <div className="space-y-4 px-4 py-4">
                <div className="flex h-3 w-full overflow-hidden rounded bg-line">
                  <div
                    style={{ width: `${closed.length ? (tpTrades.length / closed.length) * 100 : 0}%` }}
                    className="bg-profit"
                    title={`TP: ${tpTrades.length}`}
                  />
                  <div
                    style={{ width: `${closed.length ? (slTrades.length / closed.length) * 100 : 0}%` }}
                    className="bg-loss"
                    title={`SL: ${slTrades.length}`}
                  />
                  <div
                    style={{ width: `${closed.length ? (beTrades.length / closed.length) * 100 : 0}%` }}
                    className="bg-flat"
                    title={`BE: ${beTrades.length}`}
                  />
                  <div
                    style={{ width: `${closed.length ? (manualTrades.length / closed.length) * 100 : 0}%` }}
                    className="bg-brass"
                    title={`Manual: ${manualTrades.length}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border border-line/50 p-2">
                    <span className="num block text-[10px] text-profit font-medium">TP (TAKE PROFIT)</span>
                    <span className="num mt-0.5 text-sm font-semibold">{tpTrades.length}</span>
                    <span className="num text-[11px] text-muted"> ({closed.length ? ((tpTrades.length / closed.length) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="border border-line/50 p-2">
                    <span className="num block text-[10px] text-loss font-medium">SL (STOP LOSS)</span>
                    <span className="num mt-0.5 text-sm font-semibold">{slTrades.length}</span>
                    <span className="num text-[11px] text-muted"> ({closed.length ? ((slTrades.length / closed.length) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="border border-line/50 p-2">
                    <span className="num block text-[10px] text-muted font-medium">BE (BREAK EVEN)</span>
                    <span className="num mt-0.5 text-sm font-semibold">{beTrades.length}</span>
                    <span className="num text-[11px] text-muted"> ({closed.length ? ((beTrades.length / closed.length) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="border border-line/50 p-2">
                    <span className="num block text-[10px] text-brass font-medium">MANUAL EXIT</span>
                    <span className="num mt-0.5 text-sm font-semibold">{manualTrades.length}</span>
                    <span className="num text-[11px] text-muted"> ({closed.length ? ((manualTrades.length / closed.length) * 100).toFixed(0) : 0}%)</span>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Highlights: Best/Worst Pair & Best/Worst Day */}
            <Panel className="lg:col-span-2">
              <PanelHead title="Sorotan performa" />
              <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4">
                <div>
                  <span className="num text-[11px] text-muted">PAIR TERBAIK</span>
                  <div className="num mt-1 text-base font-semibold text-profit">
                    {bestPair ? bestPair[0] : "-"}
                  </div>
                  <span className="num text-xs text-profit">
                    {bestPair ? formatSignedMoney(bestPair[1].pnl) : ""}
                  </span>
                </div>
                <div>
                  <span className="num text-[11px] text-muted">PAIR TERBURUK</span>
                  <div className="num mt-1 text-base font-semibold text-loss">
                    {worstPair ? worstPair[0] : "-"}
                  </div>
                  <span className="num text-xs text-loss">
                    {worstPair ? formatSignedMoney(worstPair[1].pnl) : ""}
                  </span>
                </div>
                <div>
                  <span className="num text-[11px] text-muted">HARI TERBAIK</span>
                  <div className="num mt-1 text-base font-semibold text-profit">
                    {bestDay ? formatDateWib(`${bestDay.key}T00:00:00+07:00`) : "-"}
                  </div>
                  <span className="num text-xs text-profit">
                    {bestDay ? formatSignedMoney(bestDay.pnl) : ""}
                  </span>
                </div>
                <div>
                  <span className="num text-[11px] text-muted">HARI TERBURUK</span>
                  <div className="num mt-1 text-base font-semibold text-loss">
                    {worstDay ? formatDateWib(`${worstDay.key}T00:00:00+07:00`) : "-"}
                  </div>
                  <span className="num text-xs text-loss">
                    {worstDay ? formatSignedMoney(worstDay.pnl) : ""}
                  </span>
                </div>
              </div>
            </Panel>

            {/* 5 Trade Terakhir */}
            <Panel>
              <PanelHead title="5 trade terakhir" />
              {recent.length === 0 ? (
                <p className="num px-4 py-6 text-xs text-muted">Belum ada trade.</p>
              ) : (
                <ul>
                  {recent.map((trade) => (
                    <li key={trade.id} className="ledger-row last:border-0">
                      <Link
                        href={`/trades/${trade.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-raised transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="num block text-sm">{trade.pair}</span>
                          <span className="num text-[11px] text-muted">
                            {formatDateWib(trade.entry_time)} {formatTimeWib(trade.entry_time)} · {trade.direction}
                          </span>
                        </span>
                        <span className={`num shrink-0 text-sm ${pnlClass(trade.profit_loss)}`}>
                          {isPercent && startingBalance > 0
                            ? formatSignedPercent((trade.profit_loss / startingBalance) * 100)
                            : formatSignedMoney(trade.profit_loss)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

function pnlToneClass(tone: "profit" | "loss" | "flat") {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  return "text-flat";
}

function Readout({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <dt className="num text-[11px] text-muted">{label}</dt>
      <dd className="num mt-1.5 text-lg">{value}</dd>
      <dd className="num mt-1 text-[11px] text-muted">{note}</dd>
    </div>
  );
}
