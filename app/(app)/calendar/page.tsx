import Link from "next/link";

import { CalendarView } from "@/components/calendar-view";
import { PageHeader, Panel } from "@/components/ui";
import { dayKeyWib, formatDateWib, formatSignedMoney as money } from "@/lib/format";
import { listTrades } from "@/lib/queries";
import { summarise } from "@/lib/stats";

type SearchParams = Promise<{ bulan?: string }>;

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface Cell {
  key: string;
  day: number;
}

// Builds the month grid in WIB calendar days, weeks starting Monday.
function monthGrid(year: number, month: number): (Cell | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (Cell | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Cell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const todayKey = dayKeyWib(new Date().toISOString());
  const monthParam = params.bulan ?? todayKey.slice(0, 7);

  const [yearText, monthText] = monthParam.split("-");
  const year = Number(yearText) || Number(todayKey.slice(0, 4));
  const month = Number(monthText) || Number(todayKey.slice(5, 7));

  const trades = await listTrades({
    from: `${monthParam}-01`,
    to: `${monthParam}-31`,
  });

  const byDay = new Map<string, { pnl: number; count: number }>();
  for (const trade of trades) {
    if (trade.status !== "Done") continue;
    const key = dayKeyWib(trade.exit_time ?? trade.entry_time);
    const entry = byDay.get(key) ?? { pnl: 0, count: 0 };
    entry.pnl += trade.profit_loss;
    entry.count += 1;
    byDay.set(key, entry);
  }

  const weeks = monthGrid(year, month);
  const summary = summarise(trades);

  const monthIndex = month - 1;
  const prev = monthIndex === 0 ? `${year - 1}-12` : `${year}-${String(monthIndex).padStart(2, "0")}`;
  const next = monthIndex === 11 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const peak = Math.max(...[...byDay.values()].map((d) => Math.abs(d.pnl)), 1);

  return (
    <>
      <PageHeader
        title="Kalender"
        lead={`${trades.length} trade di ${MONTHS[monthIndex]} ${year}. Klik pada tanggal untuk melihat detail trade dan membuat catatan.`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/calendar?bulan=${prev}`} className="num border border-line px-3 py-2 text-sm text-muted hover:text-paper">
              &#8592;
            </Link>
            <Link href={`/calendar?bulan=${todayKey.slice(0, 7)}`} className="num border border-line px-3 py-2 text-sm text-muted hover:text-paper">
              Bulan ini
            </Link>
            <Link href={`/calendar?bulan=${next}`} className="num border border-line px-3 py-2 text-sm text-muted hover:text-paper">
              &#8594;
            </Link>
          </div>
        }
      />

      <div className="px-5 py-6 md:px-8">
        <div className="num mb-5 flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-line pb-4">
          <div>
            <span className="text-[11px] text-muted">TOTAL BULAN</span>
            <span className={`ml-3 text-xl ${summary.netPnl > 0 ? "text-profit" : summary.netPnl < 0 ? "text-loss" : "text-flat"}`}>
              {money(summary.netPnl)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-muted">WIN RATE</span>
            <span className="ml-3 text-xl">
              {summary.winRate === null ? "-" : `${summary.winRate.toFixed(1)}%`}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-muted">HARI PROFIT</span>
            <span className="ml-3 text-xl">
              {[...byDay.values()].filter((d) => d.pnl > 0).length}
              <span className="text-muted"> / </span>
              {[...byDay.values()].filter((d) => d.pnl < 0).length}
            </span>
          </div>
        </div>

        <Panel className="overflow-x-auto">
          <div className="min-w-[720px]">
            <CalendarView
              weeks={weeks}
              byDay={byDay}
              trades={trades}
              todayKey={todayKey}
              peak={peak}
            />
          </div>
        </Panel>

        <p className="num mt-4 text-xs text-muted">
          Hari <span className="text-brass">bergaris emas</span> adalah hari ini
          {trades.length > 0 ? `, ${formatDateWib(trades[0].entry_time)} trade terakhir tercatat` : ""}.
          Klik hari manapun untuk membuka daftar detail trade atau mencatat trade pada tanggal tersebut.
        </p>
      </div>
    </>
  );
}
