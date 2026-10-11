import { listTrades } from "@/lib/queries";
import type { Trade } from "@/lib/types";

// CSV export. Doubles as the backup path the plan asks for.

const COLUMNS: (keyof Trade)[] = [
  "pair",
  "direction",
  "entry_time",
  "exit_time",
  "entry_price",
  "exit_price",
  "stop_loss",
  "take_profit",
  "lot_size",
  "profit_loss",
  "result",
  "planned_rr",
  "risk_percent",
  "risk_amount",
  "r_multiple",
  "reason_entry",
  "emotion",
  "emotion_note",
  "mistakes",
  "lessons",
  "followed_plan",
  "status",
];

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET() {
  const trades = await listTrades({});

  const header = COLUMNS.join(",");
  const rows = trades.map((trade) => COLUMNS.map((column) => escapeCsv(trade[column])).join(","));
  const csv = [header, ...rows].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jurnal-trading-${stamp}.csv"`,
    },
  });
}
