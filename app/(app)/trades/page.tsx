import Link from "next/link";

import { Empty, Metric, PageHeader } from "@/components/ui";
import { formatSignedMoney, formatSignedPercent, formatTimeWib, formatDateWib, pnlClass } from "@/lib/format";
import { listAccounts, listPairs, listTrades } from "@/lib/queries";
import { summarise } from "@/lib/stats";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  akun?: string;
  pair?: string;
  arah?: string;
  unit?: string;
}>;

export default async function TradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const unit = params.unit === "persen" ? "persen" : "dollar";
  const isPercent = unit === "persen";

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

  const activeAccount = accounts.find((account) => account.id === params.akun);
  const startingBalance =
    (activeAccount?.starting_balance ??
      accounts.reduce((sum, account) => sum + account.starting_balance, 0)) || 10000;

  const summary = summarise(trades);
  const filtered = Boolean(params.from || params.to || params.akun || params.pair || params.arah);

  const filterQuery = (targetUnit: string) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.akun) q.set("akun", params.akun);
    if (params.pair) q.set("pair", params.pair);
    if (params.arah) q.set("arah", params.arah);
    q.set("unit", targetUnit);
    return q.toString();
  };

  return (
    <>
      <PageHeader
        title="Trades"
        lead={`${trades.length} trade ditampilkan${filtered ? " (terfilter)" : ""}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Unit toggle: $ USD vs % Persen */}
            <div className="flex items-center border border-line p-0.5 text-xs">
              <Link
                href={`/trades?${filterQuery("dollar")}`}
                className={`num px-3 py-1.5 transition-colors ${
                  !isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
                }`}
              >
                $ USD
              </Link>
              <Link
                href={`/trades?${filterQuery("persen")}`}
                className={`num px-3 py-1.5 transition-colors ${
                  isPercent ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
                }`}
              >
                % Persen
              </Link>
            </div>
            <Link
              href="/input"
              className="num bg-brass px-4 py-2 text-sm font-medium text-brass-ink"
            >
              + Catat trade
            </Link>
          </div>
        }
      />

      <form className="grid gap-3 border-b border-line px-4 py-4 sm:grid-cols-2 md:grid-cols-3 md:px-8 lg:grid-cols-6">
        <input type="hidden" name="unit" value={unit} />
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
            <Link href={`/trades?unit=${unit}`} className="num px-2 py-2 text-sm text-muted">
              Reset
            </Link>
          )}
        </div>
      </form>

      <div className="grid grid-cols-2 gap-5 border-b border-line px-5 py-5 md:grid-cols-4 md:px-8">
        <Metric
          label="NET P/L"
          value={
            isPercent && startingBalance > 0
              ? formatSignedPercent((summary.netPnl / startingBalance) * 100)
              : formatSignedMoney(summary.netPnl)
          }
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
          value={
            isPercent && startingBalance > 0
              ? formatSignedPercent((summary.expectancyUsd / startingBalance) * 100)
              : formatSignedMoney(summary.expectancyUsd)
          }
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
                <th className="num px-3 py-2.5 text-right text-[11px] font-normal text-muted md:pr-8">
                  P/L {isPercent ? "(%) · $" : "($) · %"}
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const tradePercent = startingBalance > 0 ? (trade.profit_loss / startingBalance) * 100 : 0;
                return (
                  <tr key={trade.id} className="ledger-row hover:bg-panel">
                    <td className="num px-5 py-3 text-muted md:px-8">
                      <Link href={`/trades/${trade.id}`} className="text-paper hover:text-brass">
                        {formatDateWib(trade.entry_time)}
                      </Link>
                      <span className="ml-2 text-[11px]">{formatTimeWib(trade.entry_time)}</span>
                    </td>
                    <td className="num px-3 py-3 font-medium text-paper">{trade.pair}</td>
                    <td className={`num px-3 py-3 ${trade.direction === "Buy" ? "text-profit" : "text-loss"}`}>
                      {trade.direction}
                    </td>
                    <td className="num px-3 py-3 text-muted">
                      {trade.result}
                      {trade.status === "Open" && <span className="ml-2 text-brass">open</span>}
                    </td>
                    <td className="num px-3 py-3 text-muted">
                      {trade.r_multiple === null ? "-" : `${trade.r_multiple.toFixed(2)}R`}
                    </td>
                    <td className={`num px-3 py-3 text-right md:pr-8 ${pnlClass(trade.profit_loss)}`}>
                      {isPercent ? (
                        <>
                          <span className="font-semibold">{formatSignedPercent(tradePercent)}</span>
                          <span className="ml-2 text-[11px] opacity-75">
                            {formatSignedMoney(trade.profit_loss)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{formatSignedMoney(trade.profit_loss)}</span>
                          <span className="ml-2 text-[11px] opacity-75">
                            ({formatSignedPercent(tradePercent)})
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
