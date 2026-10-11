import Link from "next/link";

import { DailyBars, DrawdownChart, EquityChart } from "@/components/charts";
import { DailyLimitAlert } from "@/components/daily-limit-alert";
import { FundedGuard } from "@/components/funded-guard";
import { PerformanceHeatmap } from "@/components/performance-heatmap";
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

type SearchParams = Promise<{ rentang?: string; akun?: string; unit?: string; dd?: string }>;

const RANGES = [
  { key: "semua", label: "Semua" },
  { key: "bulan", label: "Bulan ini" },
  { key: "30", label: "30 hari" },
  { key: "90", label: "90 hari" },
];

function rangeBounds(range: string | undefined) {
  const now = new Date();
  const todayKey = dayKeyWib(now.toISOString());

  if (range === "semua" || !range) return { from: undefined, to: undefined };
  if (range === "30" || range === "90") {
    const days = Number(range);
    const from = new Date(now.getTime() - days * 86400000);
    return { from: dayKeyWib(from.toISOString()), to: todayKey };
  }

  // Current WIB month.
  return { from: `${todayKey.slice(0, 7)}-01`, to: todayKey };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const range = params.rentang ?? "semua";
  const unit = params.unit === "persen" ? "persen" : "dollar";
  const ddMode = params.dd === "dinamis" ? "dinamis" : "statis";
  const bounds = rangeBounds(range);

  // Filtered trades for the selected date range / account — used for stats.
  // ALL trades (no date filter, but respecting account) — used for equity curve & total saldo.
  const [accounts, trades, allTrades] = await Promise.all([
    listAccounts(),
    listTrades({ from: bounds.from, to: bounds.to, accountId: params.akun }),
    listTrades({ accountId: params.akun }),
  ]);

  const summary = summarise(trades);
  const activeAccount = accounts.find((account) => account.id === params.akun);
  const startingBalance =
    (activeAccount?.starting_balance ??
      accounts.reduce((sum, account) => sum + account.starting_balance, 0)) || 10000;

  // Equity curve is based on ALL trades (for this account) so "Saldo Saat Ini" is always accurate.
  const allSummary = summarise(allTrades);
  const points = equityCurve(allTrades, startingBalance);
  const dd = drawdown(points, allSummary.netPnl, ddMode, startingBalance, 4);
  const currentEquity = points.length > 0 ? points[points.length - 1].equity : startingBalance;
  const streak = streaks(trades);

  const dayMap = dailyPnl(trades, dayKeyWib, (trade) => trade.exit_time ?? trade.entry_time);
  const days = [...dayMap.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const recent = trades.slice(0, 5);
  const netTone = summary.netPnl > 0 ? "profit" : summary.netPnl < 0 ? "loss" : "flat";
  const netPercent = startingBalance > 0 ? (summary.netPnl / startingBalance) * 100 : 0;
  const totalEquityPercent = startingBalance > 0 ? (allSummary.netPnl / startingBalance) * 100 : 0;
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
                href={`/dashboard?rentang=${option.key}&unit=${unit}&dd=${ddMode}${params.akun ? `&akun=${params.akun}` : ""}`}
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
              href={`/dashboard?rentang=${range}&unit=dollar&dd=${ddMode}${params.akun ? `&akun=${params.akun}` : ""}`}
              className={`num px-2.5 py-1.5 transition-colors ${
                !isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
              }`}
            >
              $
            </Link>
            <Link
              href={`/dashboard?rentang=${range}&unit=persen&dd=${ddMode}${params.akun ? `&akun=${params.akun}` : ""}`}
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
              <input type="hidden" name="dd" value={ddMode} />
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

        {/* Hero Row: Left = NET P/L, Right = TOTAL EQUITY / SALDO SAAT INI */}
        <div
          className="rise mt-5 flex flex-col justify-between gap-5 border-b border-line/40 pb-5 md:flex-row md:items-end"
          style={{ "--d": "0ms" } as React.CSSProperties}
        >
          {/* Left: Net P/L */}
          <div>
            <div className="flex items-center gap-3">
              <span className="num text-[11px] text-muted tracking-wider">NET P/L</span>
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

          {/* Right: Total Equity / Saldo Saat Ini */}
          <div className="flex flex-col md:items-end border-t border-line/40 pt-4 md:border-0 md:pt-0">
            <div className="flex items-center gap-2">
              <span className="num text-[11px] text-muted tracking-wider">TOTAL EQUITY · SALDO SAAT INI</span>
              <span className="h-1.5 w-1.5 rounded-full bg-brass animate-pulse" />
            </div>
            <div className="num mt-1.5 text-2xl font-semibold text-paper md:text-4xl">
              {isPercent ? formatSignedPercent(totalEquityPercent) : formatMoney(currentEquity)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted md:justify-end">
              <span>Modal awal: <span className="num text-paper font-medium">{formatMoney(startingBalance)}</span></span>
              <span>·</span>
              <span className={`num font-medium ${allSummary.netPnl >= 0 ? "text-profit" : "text-loss"}`}>
                {formatSignedPercent(totalEquityPercent)} ({formatSignedMoney(allSummary.netPnl)})
              </span>
              {isPercent && (
                <>
                  <span>·</span>
                  <span>Saldo: <span className="num text-paper font-medium">{formatMoney(currentEquity)}</span></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid: 2 col on mobile, 4 on desktop */}
        <dl
          className="rise mt-6 grid grid-cols-2 gap-4 pt-1 md:grid-cols-4"
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

      {/* Daily P/L Limit Alert Banner */}
      <DailyLimitAlert
        todayPnl={todayPnl}
        account={fundedAccount ?? activeAccount}
        startingBalance={startingBalance}
        tradesToday={dayMap.get(todayKey)?.count ?? 0}
        className="mx-4 mt-5 md:mx-8"
      />

      {allTrades.length === 0 ? (
        <Empty
          title="Belum ada trade tertutup"
          hint="Catat trade pertamamu. Dasbor ini mengisi sendiri begitu ada data."
          action={{ href: "/input", label: "Catat trade" }}
        />
      ) : (
        <div className="space-y-4 px-4 py-5 md:space-y-6 md:px-8">
          {/* Funded Account Guard if funded account exists */}
          {fundedAccount && (
            <FundedGuard
              account={fundedAccount}
              currentNetPnl={allSummary.netPnl}
              todayPnl={todayPnl}
              maxDrawdown={dd.maxDrawdown}
              ddMode={ddMode}
              currentEquity={currentEquity}
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
              <div className="flex flex-wrap items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <h2 className="text-sm font-medium">Drawdown</h2>
                  <p className="num text-[11px] text-muted">
                    {ddMode === "statis"
                      ? `Batas 4% Modal (${formatMoney(dd.staticLimitAmount)})`
                      : `Trailing dari puncak`}
                  </p>
                </div>
                <div className="flex items-center border border-line p-0.5 text-xs">
                  <Link
                    href={`/dashboard?rentang=${range}&unit=${unit}&dd=statis${params.akun ? `&akun=${params.akun}` : ""}`}
                    className={`num px-2 py-0.5 transition-colors ${
                      ddMode === "statis" ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
                    }`}
                  >
                    Statis (4%)
                  </Link>
                  <Link
                    href={`/dashboard?rentang=${range}&unit=${unit}&dd=dinamis${params.akun ? `&akun=${params.akun}` : ""}`}
                    className={`num px-2 py-0.5 transition-colors ${
                      ddMode === "dinamis" ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
                    }`}
                  >
                    Dinamis
                  </Link>
                </div>
              </div>
              <DrawdownChart
                points={points}
                unit={isPercent ? "percent" : "dollar"}
                mode={ddMode}
                base={startingBalance}
                staticLimitPercent={4}
              />
              <div className="num border-t border-line px-4 py-3 text-[11px] text-muted space-y-1">
                {ddMode === "statis" ? (
                  <>
                    <div className="flex justify-between">
                      <span>Rugi Modal Saat Ini (P/L):</span>
                      <span className={allSummary.netPnl < 0 ? "text-loss font-semibold" : "text-profit font-semibold"}>
                        {formatSignedMoney(allSummary.netPnl)} ({formatSignedPercent(totalEquityPercent)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max DD Terburuk (Historis):</span>
                      <span className={dd.maxDrawdown > 0 ? "text-loss font-medium" : "text-profit font-medium"}>
                        {dd.maxDrawdown > 0
                          ? `-${dd.maxDrawdownPercent.toFixed(1)}% (${formatMoney(dd.maxDrawdown)})`
                          : "0.0% (Aman)"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level Batas Gagal (4%):</span>
                      <span className="text-paper">{formatMoney(dd.staticBreachLevel)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sisa Ruang Aman:</span>
                      <span className="font-semibold text-brass">{formatMoney(dd.remainingBuffer)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Drawdown Saat Ini:</span>
                      <span className={dd.current > 0 ? "text-loss font-semibold" : "text-profit font-semibold"}>
                        {dd.current > 0 ? `-${dd.currentPercent.toFixed(1)}% (${formatMoney(dd.current)})` : "0.0% (Puncak)"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Drawdown Dinamis:</span>
                      <span className={dd.maxDrawdown > 0 ? "text-loss font-medium" : "text-profit font-medium"}>
                        {dd.maxDrawdown > 0
                          ? `-${dd.maxDrawdownPercent.toFixed(1)}% (${formatMoney(dd.maxDrawdown)})`
                          : "0.0% (Aman)"}
                      </span>
                    </div>
                    {dd.recoveryFactor !== null && (
                      <div className="flex justify-between">
                        <span>Recovery Factor:</span>
                        <span className="text-paper">{dd.recoveryFactor.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Sisa Buffer DD (Batas 4%):</span>
                      <span className="font-semibold text-brass">{formatMoney(dd.remainingBuffer)}</span>
                    </div>
                  </>
                )}
              </div>
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

            {/* Performance Heatmap (Annual / 52-Week Grid) */}
            <Panel className="lg:col-span-3">
              <PerformanceHeatmap trades={allTrades} startingBalance={startingBalance} />
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
