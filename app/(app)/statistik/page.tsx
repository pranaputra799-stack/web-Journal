import { Metric, PageHeader, Panel, PanelHead, SmallSampleTag } from "@/components/ui";
import { dayKeyWib, formatMoney, formatSignedMoney, parseEntryModel, pnlClass } from "@/lib/format";
import { listAccounts, listTrades } from "@/lib/queries";
import { breakdown, drawdown, equityCurve, streaks, summarise, type Bucket } from "@/lib/stats";
import type { Trade } from "@/lib/types";

type SearchParams = Promise<{ akun?: string }>;

const SESSION = (trade: Trade) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date(trade.entry_time)),
  );
  if (hour >= 6 && hour < 15) return "Asia";
  if (hour >= 14 && hour < 23) return "London";
  if (hour >= 19 || hour < 4) return "New York";
  return "Di luar sesi";
};

const WEEKDAY = (trade: Trade) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long" }).format(
    new Date(trade.entry_time),
  );

const HOUR = (trade: Trade) =>
  `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  }).format(new Date(trade.entry_time))}:00 WIB`;

const DURATION_BUCKET = (trade: Trade) => {
  if (!trade.exit_time) return "Masih terbuka";
  const minutes = (new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000;
  if (minutes < 15) return "Scalp (<15 menit)";
  if (minutes < 60 * 6) return "Intraday";
  return "Swing";
};

const RISK_BUCKET = (trade: Trade) => {
  if (trade.risk_percent === null) return "Risk tidak dicatat";
  if (trade.risk_percent <= 0.5) return "Kecil (<=0.5%)";
  if (trade.risk_percent <= 1) return "Sedang (0.5-1%)";
  return "Besar (>1%)";
};

const ENTRY_MODEL_BUCKET = (trade: Trade) =>
  parseEntryModel(trade.reason_entry) ?? "Tidak dicatat";

function BreakdownTable({
  title,
  note,
  rows,
}: {
  title: string;
  note?: string;
  rows: Bucket[];
}) {
  return (
    <Panel>
      <PanelHead title={title} note={note} />
      {rows.length === 0 ? (
        <p className="num px-4 py-5 text-xs text-muted">Belum ada data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="num px-4 py-2 text-[11px] font-normal text-muted">KELOMPOK</th>
              <th className="num px-2 py-2 text-right text-[11px] font-normal text-muted">N</th>
              <th className="num px-2 py-2 text-right text-[11px] font-normal text-muted">WIN</th>
              <th className="num px-2 py-2 text-right text-[11px] font-normal text-muted">PF</th>
              <th className="num px-4 py-2 text-right text-[11px] font-normal text-muted">NET P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="ledger-row">
                <td className="num px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    {row.key}
                    {row.smallSample && <SmallSampleTag />}
                  </span>
                </td>
                <td className="num px-2 py-2.5 text-right text-muted">{row.trades}</td>
                <td className="num px-2 py-2.5 text-right text-muted">
                  {row.winRate === null ? "-" : `${row.winRate.toFixed(0)}%`}
                </td>
                <td className="num px-2 py-2.5 text-right text-muted">
                  {row.profitFactor === null ? "-" : row.profitFactor.toFixed(2)}
                </td>
                <td className={`num px-4 py-2.5 text-right ${pnlClass(row.netPnl)}`}>
                  {formatSignedMoney(row.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export default async function StatistikPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [accounts, trades] = await Promise.all([
    listAccounts(),
    listTrades({ accountId: params.akun }),
  ]);

  const selected = accounts.find((account) => account.id === params.akun);
  const accountName = selected?.name;
  const startingBalance =
    selected?.starting_balance ??
    accounts.reduce((sum, account) => sum + account.starting_balance, 0);

  const closed = trades.filter((trade) => trade.status === "Done");
  const summary = summarise(trades);
  const points = equityCurve(trades, startingBalance);
  const dd = drawdown(points, summary.netPnl, "dinamis", startingBalance);
  const streak = streaks(trades);

  const dayMap = new Map<string, number>();
  for (const trade of closed) {
    const key = dayKeyWib(trade.exit_time ?? trade.entry_time);
    dayMap.set(key, (dayMap.get(key) ?? 0) + trade.profit_loss);
  }
  const dayValues = [...dayMap.values()];
  const profitDays = dayValues.filter((value) => value > 0).length;
  const lossDays = dayValues.filter((value) => value < 0).length;
  const bestDay = dayValues.length ? Math.max(...dayValues) : null;
  const worstDay = dayValues.length ? Math.min(...dayValues) : null;
  const consistency =
    bestDay !== null && summary.grossProfit > 0 ? (bestDay / summary.grossProfit) * 100 : null;

  // Emotion cost: how much money the three worst emotional states cost.
  const badEmotions = ["FOMO", "Revenge", "Serakah"];
  const badTrades = closed.filter((trade) => badEmotions.includes(trade.emotion ?? ""));
  const emotionCost = badTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);

  const afterLoss: Trade[] = [];
  const ordered = [...closed].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime(),
  );
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i - 1].profit_loss < 0) afterLoss.push(ordered[i]);
  }
  const afterLossSummary = summarise(afterLoss);

  return (
    <>
      <PageHeader
        title="Statistik"
        lead={`${closed.length} trade tertutup${accountName ? ` di ${accountName}` : ", semua akun"}. Angka ditandai "sampel kecil" kalau belum cukup untuk dipercaya.`}
        action={
          accounts.length > 1 ? (
            <form className="flex items-center gap-2">
              <select name="akun" defaultValue={params.akun ?? ""} className="num w-auto text-sm">
                <option value="">Semua akun</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="num border border-line px-3 py-2 text-sm text-muted">
                Terapkan
              </button>
            </form>
          ) : undefined
        }
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        <Panel>
          <PanelHead
            title="Ringkasan utama"
            note={summary.smallSample ? "sampel kecil" : undefined}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 px-4 py-5 md:grid-cols-4">
            <Metric label="TOTAL TRADE" value={String(summary.totalTrades)} note={`${summary.breakEven} BE dilaporkan terpisah`} />
            <Metric label="WIN RATE" value={summary.winRate === null ? "-" : `${summary.winRate.toFixed(1)}%`} tone="brass" small={summary.smallSample} />
            <Metric label="NET P/L" value={formatSignedMoney(summary.netPnl)} tone={summary.netPnl >= 0 ? "profit" : "loss"} />
            <Metric label="PROFIT FACTOR" value={summary.profitFactor === null ? "-" : summary.profitFactor.toFixed(2)} small={summary.smallSample} />
            <Metric label="EXPECTANCY" value={formatSignedMoney(summary.expectancyUsd)} tone={summary.expectancyUsd >= 0 ? "profit" : "loss"} />
            <Metric label="EXPECTANCY (R)" value={summary.expectancyR === null ? "-" : `${summary.expectancyR.toFixed(2)}R`} note="perkiraan bila risk tidak diisi" />
            <Metric label="RATA-RATA MENANG" value={formatMoney(summary.avgWin)} tone="profit" />
            <Metric label="RATA-RATA KALAH" value={summary.avgLoss === null ? "-" : formatMoney(-summary.avgLoss)} tone="loss" />
            <Metric label="PAYOFF RATIO" value={summary.payoffRatio === null ? "-" : summary.payoffRatio.toFixed(2)} />
            <Metric label="BE WIN RATE" value={summary.breakEvenWinRate === null ? "-" : `${summary.breakEvenWinRate.toFixed(1)}%`} note="win rate minimum agar impas" />
            <Metric label="TRADE TERBAIK" value={summary.bestTrade === null ? "-" : formatSignedMoney(summary.bestTrade)} tone="profit" />
            <Metric label="TRADE TERBURUK" value={summary.worstTrade === null ? "-" : formatSignedMoney(summary.worstTrade)} tone="loss" />
            <Metric label="R:R RENCANA" value={summary.avgPlannedRr === null ? "-" : summary.avgPlannedRr.toFixed(2)} note="rata-rata" />
            <Metric label="RISK RATA-RATA" value={summary.avgRiskPercent === null ? "-" : `${summary.avgRiskPercent.toFixed(2)}%`} />
            <Metric
              label="MAX DRAWDOWN"
              value={dd.maxDrawdown > 0 ? `-${formatMoney(dd.maxDrawdown)}` : "0.0% (Aman)"}
              tone={dd.maxDrawdown > 0 ? "loss" : "paper"}
              note={dd.maxDrawdownPercent > 0 ? `-${dd.maxDrawdownPercent.toFixed(1)}% dari puncak` : undefined}
            />
            <Metric label="RECOVERY FACTOR" value={dd.recoveryFactor === null ? "-" : dd.recoveryFactor.toFixed(2)} note="net profit / max drawdown" />
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHead title="Konsistensi" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 px-4 py-5">
              <Metric label="HARI PROFIT" value={String(profitDays)} tone="profit" />
              <Metric label="HARI LOSS" value={String(lossDays)} tone="loss" />
              <Metric
                label="% HARI PROFIT"
                value={dayValues.length === 0 ? "-" : `${((profitDays / dayValues.length) * 100).toFixed(0)}%`}
              />
              <Metric label="HARI TERBAIK" value={bestDay === null ? "-" : formatSignedMoney(bestDay)} tone="profit" />
              <Metric label="HARI TERBURUK" value={worstDay === null ? "-" : formatSignedMoney(worstDay)} tone="loss" />
              <Metric
                label="KONSISTENSI"
                value={consistency === null ? "-" : `${consistency.toFixed(0)}%`}
                note="profit hari terbesar dibanding total profit"
              />
              <Metric label="STREAK SEKARANG" value={streak.currentKind === "none" ? "-" : `${streak.current} ${streak.currentKind === "win" ? "menang" : "kalah"}`} />
              <Metric label="STREAK TERPANJANG" value={`${streak.longestWin}W / ${streak.longestLoss}L`} />
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Emosi dan disiplin" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 px-4 py-5">
              <Metric
                label="BIAYA EMOSI"
                value={formatSignedMoney(emotionCost)}
                tone={emotionCost >= 0 ? "profit" : "loss"}
                note={`dari ${badTrades.length} trade FOMO / Revenge / Serakah`}
              />
              <Metric
                label="IKUT RENCANA"
                value={`${closed.filter((t) => t.followed_plan === true).length} / ${closed.filter((t) => t.followed_plan !== null).length}`}
                note="dicatat ya atau tidak"
              />
              <Metric
                label="SETELAH LOSS"
                value={afterLossSummary.winRate === null ? "-" : `${afterLossSummary.winRate.toFixed(0)}%`}
                note={`win rate ${afterLoss.length} trade setelah kalah`}
                small={afterLossSummary.smallSample}
              />
              <Metric
                label="NET SETELAH LOSS"
                value={formatSignedMoney(afterLossSummary.netPnl)}
                tone={afterLossSummary.netPnl >= 0 ? "profit" : "loss"}
              />
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <BreakdownTable title="Per pair" rows={breakdown(closed, (t) => t.pair)} />
          <BreakdownTable title="Per arah" rows={breakdown(closed, (t) => t.direction)} />
          <BreakdownTable title="Per hari" rows={breakdown(closed, WEEKDAY)} />
          <BreakdownTable title="Per sesi" note="jam bisa diubah nanti di Pengaturan" rows={breakdown(closed, SESSION)} />
          <BreakdownTable title="Per jam (WIB)" rows={breakdown(closed, HOUR)} />
          <BreakdownTable title="Per hasil" rows={breakdown(closed, (t) => t.result)} />
          <BreakdownTable title="Per ukuran risk" rows={breakdown(closed, RISK_BUCKET)} />
          <BreakdownTable title="Per durasi" rows={breakdown(closed, DURATION_BUCKET)} />
          <BreakdownTable title="Per emosi" rows={breakdown(closed, (t) => t.emotion)} />
          <BreakdownTable title="Per bulan" rows={breakdown(closed, (t) => dayKeyWib(t.entry_time).slice(0, 7))} />
          <BreakdownTable title="Per model entry" rows={breakdown(closed, ENTRY_MODEL_BUCKET)} />
          <BreakdownTable title="Per akun" rows={breakdown(closed, (t) => accounts.find((a) => a.id === t.account_id)?.name ?? "Tanpa akun")} />
        </div>
      </div>
    </>
  );
}
