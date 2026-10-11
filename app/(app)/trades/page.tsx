import Link from "next/link";

import { Empty, Metric, PageHeader } from "@/components/ui";
import { formatSignedMoney, formatTimeWib, formatDateWib, pnlClass } from "@/lib/format";
import { listAccounts, listPairs, listTrades } from "@/lib/queries";
import { summarise } from "@/lib/stats";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  akun?: string;
  pair?: string;
  arah?: string;
}>;

export default async function TradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = {
    from: params.from,
    to: params.to,
    accountId: params.akun,
    pair: params.pair,
    direction: params.arah,
  };

  const [trades, accounts, pairs] = await Promise.all([
    listTrades(filters),
    listAccounts(),
    listPairs(),
  ]);

  const summary = summarise(trades);
  const filtered = Boolean(params.from || params.to || params.akun || params.pair || params.arah);

  return (
    <>
      <PageHeader
        title="Trades"
        lead={`${trades.length} trade ditampilkan${filtered ? " (terfilter)" : ""}.`}
        action={
          <Link
            href="/input"
            className="num bg-brass px-4 py-2.5 text-sm font-medium text-brass-ink"
          >
            + Catat trade
          </Link>
        }
      />

      <form className="grid gap-3 border-b border-line px-4 py-4 sm:grid-cols-2 md:grid-cols-3 md:px-8 lg:grid-cols-6">
        <label className="block">
          <span className="num text-[11px] text-muted">DARI</span>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="num mt-1.5" />
        </label>
        <label className="block">
          <span className="num text-[11px] text-muted">SAMPAI</span>
          <input type="date" name="to" defaultValue={params.to ?? ""} className="num mt-1.5" />
        </label>
        <label className="block">
          <span className="num text-[11px] text-muted">AKUN</span>
          <select name="akun" defaultValue={params.akun ?? ""} className="num mt-1.5">
            <option value="">Semua</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="num text-[11px] text-muted">PAIR</span>
          <select name="pair" defaultValue={params.pair ?? ""} className="num mt-1.5">
            <option value="">Semua</option>
            {pairs.map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="num text-[11px] text-muted">ARAH</span>
          <select name="arah" defaultValue={params.arah ?? ""} className="num mt-1.5">
            <option value="">Semua</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="num border border-brass px-3 py-2 text-sm text-brass">
            Terapkan
          </button>
          {filtered && (
            <Link href="/trades" className="num px-2 py-2 text-sm text-muted">
              Reset
            </Link>
          )}
        </div>
      </form>

      <div className="grid grid-cols-2 gap-5 border-b border-line px-5 py-5 md:grid-cols-4 md:px-8">
        <Metric
          label="NET P/L"
          value={formatSignedMoney(summary.netPnl)}
          tone={summary.netPnl > 0 ? "profit" : summary.netPnl < 0 ? "loss" : "flat"}
        />
        <Metric
          label="WIN RATE"
          value={summary.winRate === null ? "-" : `${summary.winRate.toFixed(1)}%`}
          note={`${summary.wins} menang / ${summary.losses} kalah`}
          small={summary.smallSample}
        />
        <Metric
          label="PROFIT FACTOR"
          value={summary.profitFactor === null ? "-" : summary.profitFactor.toFixed(2)}
          small={summary.smallSample}
        />
        <Metric
          label="EXPECTANCY"
          value={formatSignedMoney(summary.expectancyUsd)}
          tone={summary.expectancyUsd > 0 ? "profit" : summary.expectancyUsd < 0 ? "loss" : "flat"}
        />
      </div>

      {trades.length === 0 ? (
        <Empty
          title={filtered ? "Tidak ada trade di rentang ini" : "Belum ada trade"}
          hint={
            filtered
              ? "Longgarkan filter atau pilih rentang tanggal lain."
              : "Mulai dari satu trade. Statistik baru berguna setelah datanya terkumpul."
          }
          action={{ href: "/input", label: "Catat trade pertama" }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="num px-5 py-2.5 text-[11px] font-normal text-muted md:px-8">TANGGAL</th>
                <th className="num px-3 py-2.5 text-[11px] font-normal text-muted">PAIR</th>
                <th className="num px-3 py-2.5 text-[11px] font-normal text-muted">ARAH</th>
                <th className="num px-3 py-2.5 text-[11px] font-normal text-muted">HASIL</th>
                <th className="num px-3 py-2.5 text-[11px] font-normal text-muted">R</th>
                <th className="num px-3 py-2.5 text-right text-[11px] font-normal text-muted md:pr-8">P/L</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="ledger-row hover:bg-panel">
                  <td className="num px-5 py-3 text-muted md:px-8">
                    <Link href={`/trades/${trade.id}`} className="text-paper hover:text-brass">
                      {formatDateWib(trade.entry_time)}
                    </Link>
                    <span className="ml-2 text-[11px]">{formatTimeWib(trade.entry_time)}</span>
                  </td>
                  <td className="num px-3 py-3">{trade.pair}</td>
                  <td className={`num px-3 py-3 ${trade.direction === "Buy" ? "text-profit" : "text-loss"}`}>
                    {trade.direction}
                  </td>
                  <td className="num px-3 py-3 text-muted">
                    {trade.result}
                    {trade.status === "Open" && <span className="ml-2 text-brass">open</span>}
                  </td>
                  <td className="num px-3 py-3 text-muted">
                    {trade.r_multiple === null ? "-" : trade.r_multiple.toFixed(2)}
                  </td>
                  <td className={`num px-3 py-3 text-right md:pr-8 ${pnlClass(trade.profit_loss)}`}>
                    {formatSignedMoney(trade.profit_loss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
