"use client";

import { useState } from "react";
import { importTrades } from "@/app/actions/trades";
import { formatSignedMoney, pnlClass } from "@/lib/format";
import type { Account, Direction, TradeResult } from "@/lib/types";

interface ParsedRow {
  pair: string;
  direction: Direction;
  entry_time: string;
  exit_time?: string | null;
  profit_loss: number;
  result: TradeResult;
  planned_rr?: number | null;
  risk_percent?: number | null;
  risk_amount?: number | null;
  reason_entry?: string | null;
  emotion?: string | null;
  status: "Done" | "Open";
  account_id?: string | null;
}

export function CsvImporter({ accounts }: { accounts: Account[] }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const parseCsvText = (text: string): ParsedRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return [];

    // Simple delimiter detection: comma or semicolon
    const headerLine = lines[0];
    const delimiter = headerLine.includes(";") ? ";" : ",";

    // Split line respecting quotes
    const splitRow = (row: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      return result;
    };

    const headers = splitRow(headerLine).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const getIndex = (keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex((h) => h.includes(k));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const pairIdx = getIndex(["pair", "symbol", "instrument"]);
    const dirIdx = getIndex(["direction", "arah", "type", "side"]);
    const entryIdx = getIndex(["entrytime", "dateentry", "entry", "date"]);
    const exitIdx = getIndex(["exittime", "dateexit", "exit"]);
    const pnlIdx = getIndex(["profitloss", "pnl", "profit", "loss", "hasil"]);
    const resIdx = getIndex(["result", "outcome"]);
    const rrIdx = getIndex(["rr", "plannedrr"]);
    const riskIdx = getIndex(["risk", "riskpercent"]);
    const reasonIdx = getIndex(["reason", "alasan"]);
    const emotionIdx = getIndex(["emotion", "emosi"]);

    const cleanNum = (str: string | undefined): number => {
      if (!str) return 0;
      const num = Number(str.replace(/[^0-9.-]/g, ""));
      return Number.isNaN(num) ? 0 : num;
    };

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitRow(lines[i]);
      if (cols.length < 2) continue;

      const rawPair = pairIdx !== -1 ? cols[pairIdx] : cols[0];
      if (!rawPair) continue;

      const rawDir = dirIdx !== -1 ? cols[dirIdx]?.toLowerCase() : "buy";
      const direction: Direction = rawDir.includes("sell") || rawDir.includes("short") ? "Sell" : "Buy";

      const rawPnl = pnlIdx !== -1 ? cleanNum(cols[pnlIdx]) : 0;
      const rawRes = resIdx !== -1 ? cols[resIdx]?.toUpperCase() : "";
      let result: TradeResult = "Manual";
      if (rawRes.includes("TP")) result = "TP";
      else if (rawRes.includes("SL")) result = "SL";
      else if (rawRes.includes("BE")) result = "BE";
      else result = rawPnl > 0 ? "TP" : rawPnl < 0 ? "SL" : "BE";

      const rawEntry = entryIdx !== -1 && cols[entryIdx] ? cols[entryIdx] : new Date().toISOString();
      const rawExit = exitIdx !== -1 && cols[exitIdx] ? cols[exitIdx] : null;

      rows.push({
        pair: rawPair.toUpperCase().trim(),
        direction,
        entry_time: rawEntry,
        exit_time: rawExit,
        profit_loss: rawPnl,
        result,
        planned_rr: rrIdx !== -1 ? cleanNum(cols[rrIdx]) || null : null,
        risk_percent: riskIdx !== -1 ? cleanNum(cols[riskIdx]) || null : null,
        reason_entry: reasonIdx !== -1 ? cols[reasonIdx] || null : null,
        emotion: emotionIdx !== -1 ? cols[emotionIdx] || null : null,
        status: "Done",
        account_id: selectedAccountId || null,
      });
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCsvText(text);
        setParsedRows(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setMessage(null);

    try {
      // Attach selected account
      const rowsWithAccount = parsedRows.map((r) => ({
        ...r,
        account_id: selectedAccountId || null,
      }));

      const res = await importTrades(rowsWithAccount as unknown as Array<Record<string, unknown>>);
      setMessage(
        `Sukses mengimpor ${res.count} trade!`
      );
      setParsedRows([]);
      setFileName("");
    } catch (err: unknown) {
      setMessage(`Gagal mengimpor: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-5">
      <p className="text-sm text-muted">
        Unggah berkas CSV hasil ekspor dari <span className="text-paper font-medium">Notion</span> atau berkas spreadsheet. Kolom Pair, Direction, Tanggal, P/L, dan Hasil akan dipetakan otomatis.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block">
            <span className="num text-[11px] text-muted">PILIH BERKAS CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="num mt-1.5"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="num text-[11px] text-muted">HUBUNGKAN KE AKUN</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="num mt-1.5"
            >
              <option value="">Semua / Tanpa akun</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            disabled={parsedRows.length === 0 || loading}
            onClick={handleImport}
            className="num w-full bg-brass px-4 py-2.5 text-sm font-medium text-brass-ink disabled:opacity-50"
          >
            {loading ? "Mengimpor..." : `Impor ${parsedRows.length ? `${parsedRows.length} Trade` : ""}`}
          </button>
        </div>
      </div>

      {message && (
        <div className="border border-brass/50 bg-brass/10 px-4 py-2.5 text-sm text-brass rounded">
          {message}
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Pratinjau {Math.min(5, parsedRows.length)} dari {parsedRows.length} trade yang terdeteksi dari {fileName}:</span>
          </div>
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left bg-raised">
                  <th className="num px-3 py-2 text-muted">PAIR</th>
                  <th className="num px-3 py-2 text-muted">ARAH</th>
                  <th className="num px-3 py-2 text-muted">HASIL</th>
                  <th className="num px-3 py-2 text-right text-muted">P/L</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-b border-line/40 last:border-0">
                    <td className="num px-3 py-2">{row.pair}</td>
                    <td className={`num px-3 py-2 ${row.direction === "Buy" ? "text-profit" : "text-loss"}`}>
                      {row.direction}
                    </td>
                    <td className="num px-3 py-2 text-muted">{row.result}</td>
                    <td className={`num px-3 py-2 text-right ${pnlClass(row.profit_loss)}`}>
                      {formatSignedMoney(row.profit_loss)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
