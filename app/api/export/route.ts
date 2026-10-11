import { NextRequest } from "next/server";
import { listAccounts, listDailyNotes, listTrades } from "@/lib/queries";

// Export and backup route.
// Supports:
// - /api/export (or ?type=trades) -> Clean, readable CSV of all trades with account names
// - /api/export?type=notes        -> CSV of all daily notes and reviews
// - /api/export?format=json (or ?type=backup) -> Full structured JSON backup (accounts, trades, notes)

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (Array.isArray(value)) return `"${value.join("; ").replace(/"/g, '""')}"`;
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format")?.toLowerCase();
  const type = searchParams.get("type")?.toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  // 1. Full JSON Backup
  if (format === "json" || type === "backup") {
    const [accounts, trades, dailyNotes] = await Promise.all([
      listAccounts(),
      listTrades({}),
      listDailyNotes(),
    ]);

    const backupData = {
      meta: {
        version: "1.0",
        app: "Jurnal Trading",
        exported_at: new Date().toISOString(),
        timezone: "Asia/Jakarta (WIB)",
        summary: {
          total_accounts: accounts.length,
          total_trades: trades.length,
          total_daily_notes: dailyNotes.length,
        },
      },
      accounts,
      trades,
      daily_notes: dailyNotes,
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="jurnal-trading-backup-full-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // 2. Daily Notes CSV
  if (type === "notes") {
    const dailyNotes = await listDailyNotes();

    const headers = [
      "Tanggal (Day)",
      "Mood",
      "Rencana Pagi (Morning Plan)",
      "Review Sore (Evening Review)",
      "Catatan Tambahan (Notes)",
      "Dibuat Pada",
      "Diperbarui Pada",
    ];

    const rows = dailyNotes.map((note) =>
      [
        escapeCsv(note.day),
        escapeCsv(note.mood),
        escapeCsv(note.morning_plan),
        escapeCsv(note.evening_review),
        escapeCsv(note.notes),
        escapeCsv(note.created_at),
        escapeCsv(note.updated_at),
      ].join(","),
    );

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    return new Response(`\uFEFF${csvContent}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jurnal-trading-catatan-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // 3. Trades CSV (Default)
  const [trades, accounts] = await Promise.all([
    listTrades({}),
    listAccounts(),
  ]);

  const accountMap = new Map(accounts.map((acc) => [acc.id, acc.name]));

  const headers = [
    "ID",
    "Akun",
    "Pair",
    "Direction (Arah)",
    "Status",
    "Entry Time",
    "Exit Time",
    "Entry Price",
    "Exit Price",
    "Stop Loss",
    "Take Profit",
    "Lot Size",
    "Profit / Loss ($)",
    "Result",
    "Planned RR",
    "Realised R",
    "Risk %",
    "Risk Amount ($)",
    "Reason (Alasan Entry)",
    "Emotion (Emosi)",
    "Catatan Emosi",
    "Kesalahan (Mistakes)",
    "Pelajaran (Lessons)",
    "Followed Plan (Patuh)",
    "Created At",
  ];

  const rows = trades.map((trade) =>
    [
      escapeCsv(trade.id),
      escapeCsv(accountMap.get(trade.account_id ?? "") || "-"),
      escapeCsv(trade.pair),
      escapeCsv(trade.direction),
      escapeCsv(trade.status),
      escapeCsv(trade.entry_time),
      escapeCsv(trade.exit_time),
      escapeCsv(trade.entry_price),
      escapeCsv(trade.exit_price),
      escapeCsv(trade.stop_loss),
      escapeCsv(trade.take_profit),
      escapeCsv(trade.lot_size),
      escapeCsv(trade.profit_loss),
      escapeCsv(trade.result),
      escapeCsv(trade.planned_rr),
      escapeCsv(trade.r_multiple),
      escapeCsv(trade.risk_percent),
      escapeCsv(trade.risk_amount),
      escapeCsv(trade.reason_entry),
      escapeCsv(trade.emotion),
      escapeCsv(trade.emotion_note),
      escapeCsv(trade.mistakes),
      escapeCsv(trade.lessons),
      escapeCsv(trade.followed_plan === null ? "" : trade.followed_plan ? "Ya" : "Tidak"),
      escapeCsv(trade.created_at),
    ].join(","),
  );

  const csvContent = [headers.join(","), ...rows].join("\r\n");

  return new Response(`\uFEFF${csvContent}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jurnal-trading-trades-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
