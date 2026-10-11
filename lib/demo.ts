// Sample data for preview mode (DEMO_MODE=1).
//
// Deterministic on purpose: the same numbers appear on every run, so a layout
// change can be judged against a stable baseline. Nothing here is ever written
// to the database.

import type { Account, DailyNote, Trade, TradeScreenshot } from "@/lib/types";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_EMAIL = "putra@contoh.id";

export const demoAccounts: Account[] = [
  {
    id: "acc-funded-50k",
    user_id: DEMO_USER_ID,
    name: "Funded 50K",
    type: "funded",
    currency: "USD",
    starting_balance: 50000,
    start_date: "2026-09-01",
    profit_target: 3000,
    max_daily_loss: 1250,
    max_total_loss: 2500,
    active: true,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "acc-live",
    user_id: DEMO_USER_ID,
    name: "Live kecil",
    type: "live",
    currency: "USD",
    starting_balance: 2000,
    start_date: "2026-08-15",
    profit_target: null,
    max_daily_loss: null,
    max_total_loss: null,
    active: true,
    created_at: "2026-08-15T00:00:00.000Z",
    updated_at: "2026-08-15T00:00:00.000Z",
  },
];

const PAIRS: { pair: string; base: number; step: number }[] = [
  { pair: "XAUUSD", base: 2648, step: 6 },
  { pair: "EURUSD", base: 1.0865, step: 0.004 },
  { pair: "GBPUSD", base: 1.2712, step: 0.005 },
  { pair: "USDJPY", base: 152.4, step: 0.5 },
  { pair: "NAS100", base: 18320, step: 60 },
];

const EMOTIONS = ["Tenang", "FOMO", "Takut", "Serakah", "Revenge", "Ragu"];
const REASONS = [
  "Sapuan likuiditas di low sesi Asia, lalu masuk saat candle engulfing tutup.",
  "Retest level harian yang sudah ditembus, konfirmasi di M5.",
  "Breakout rentang London, tunggu pullback ke mid-range.",
  "Setup ORB, masuk setelah candle pertama New York tutup di atas VWAP.",
  "Divergence RSI di resistance mingguan.",
];

// Small deterministic generator. Same seed, same trades, every run.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTrades(): Trade[] {
  const random = mulberry32(20261011);
  const trades: Trade[] = [];

  // Two weeks of activity in October 2026, in WIB wall clock.
  const slots = [
    "2026-10-01T09:20", "2026-10-01T15:05", "2026-10-02T08:45",
    "2026-10-02T14:30", "2026-10-02T20:10", "2026-10-05T09:35",
    "2026-10-05T16:20", "2026-10-06T08:50", "2026-10-06T15:40",
    "2026-10-07T10:05", "2026-10-07T19:55", "2026-10-07T21:15",
    "2026-10-08T09:10", "2026-10-08T14:45", "2026-10-09T08:30",
    "2026-10-09T15:25", "2026-10-09T20:40", "2026-10-10T09:55",
    "2026-10-10T16:15", "2026-10-10T21:05", "2026-10-11T09:05",
    "2026-10-11T14:40", "2026-10-11T20:25",
  ];

  slots.forEach((slot, index) => {
    const instrument = PAIRS[index % PAIRS.length];
    const roll = random();
    // Tuned so the sample lands near a 55 percent win rate with a positive
    // expectancy, which is a realistic shape to look at.
    const result = roll < 0.5 ? "TP" : roll < 0.85 ? "SL" : roll < 0.95 ? "BE" : "Manual";
    const direction = random() < 0.55 ? "Buy" : "Sell";
    const plannedRr = [1.5, 2, 2, 2.5, 3][Math.floor(random() * 5)];
    const riskPercent = [0.25, 0.5, 0.5, 0.75, 1][Math.floor(random() * 5)];
    const riskAmount = (50000 * riskPercent) / 100;

    let profitLoss: number;
    if (result === "TP") profitLoss = riskAmount * plannedRr;
    else if (result === "SL") profitLoss = -riskAmount;
    else if (result === "BE") profitLoss = 0;
    else profitLoss = riskAmount * (random() < 0.5 ? 0.4 : -0.6);

    const entryMs = new Date(`${slot}:00+07:00`).getTime();
    const holdMinutes = 20 + Math.floor(random() * 220);
    const exitMs = entryMs + holdMinutes * 60000;

    const emotion =
      result === "SL" && random() < 0.4
        ? EMOTIONS[Math.floor(random() * EMOTIONS.length)]
        : random() < 0.7
          ? "Tenang"
          : EMOTIONS[Math.floor(random() * EMOTIONS.length)];

    trades.push({
      id: `demo-trade-${index + 1}`,
      user_id: DEMO_USER_ID,
      account_id: index % 5 === 4 ? "acc-live" : "acc-funded-50k",
      pair: instrument.pair,
      direction,
      entry_time: new Date(entryMs).toISOString(),
      exit_time: new Date(exitMs).toISOString(),
      entry_price: Number((instrument.base + index * instrument.step * 0.1).toFixed(4)),
      exit_price: Number((instrument.base + index * instrument.step * 0.1 + (direction === "Buy" ? 1 : -1) * instrument.step * 0.4).toFixed(4)),
      stop_loss: Number((instrument.base + index * instrument.step * 0.1 - (direction === "Buy" ? 1 : -1) * instrument.step * 0.5).toFixed(4)),
      take_profit: Number((instrument.base + index * instrument.step * 0.1 + (direction === "Buy" ? 1 : -1) * instrument.step).toFixed(4)),
      lot_size: Number((0.1 + random() * 0.4).toFixed(2)),
      profit_loss: Number(profitLoss.toFixed(2)),
      result,
      planned_rr: plannedRr,
      risk_percent: riskPercent,
      risk_amount: Number(riskAmount.toFixed(2)),
      r_multiple: Number((profitLoss / riskAmount).toFixed(2)),
      reason_entry: REASONS[index % REASONS.length],
      emotion,
      emotion_note:
        emotion === "FOMO"
          ? "Masuk karena takut ketinggalan, padahal belum ada konfirmasi."
          : emotion === "Revenge"
            ? "Dipicu loss sebelumnya, ukuran posisi dinaikkan tanpa alasan."
            : null,
      mistakes: result === "SL" ? "Entry terlalu awal sebelum candle tutup." : null,
      lessons: result === "TP" ? "Sabar menunggu retest terbayar." : "Tunggu konfirmasi penutupan candle.",
      followed_plan: random() < 0.75,
      status: "Done",
      created_at: new Date(entryMs).toISOString(),
      updated_at: new Date(exitMs).toISOString(),
    });
  });

  return trades;
}

export const demoTrades: Trade[] = buildTrades();

export const demoScreenshots: TradeScreenshot[] = [];

export const demoNotes: DailyNote[] = [
  {
    id: "demo-note-1",
    user_id: DEMO_USER_ID,
    day: "2026-10-10",
    morning_plan:
      "Bias jual XAUUSD selama harga di bawah 2660. Level penting 2648 dan 2665. Batas risk hari ini 0.5 persen, maksimal 3 trade.",
    evening_review:
      "Dua trade pagi sesuai rencana. Trade ketiga terlalu tergesa, masuk sebelum candle tutup.",
    mood: "Netral",
    notes: null,
    created_at: "2026-10-10T02:00:00.000Z",
    updated_at: "2026-10-10T14:00:00.000Z",
  },
  {
    id: "demo-note-2",
    user_id: DEMO_USER_ID,
    day: "2026-10-09",
    morning_plan: "Tidak trading sebelum rilis data. Tunggu 15 menit setelah rilis.",
    evening_review: "Menahan diri dari tiga setup yang menggoda. Hasilnya benar, dua di antaranya kena SL.",
    mood: "Tenang",
    notes: null,
    created_at: "2026-10-09T02:00:00.000Z",
    updated_at: "2026-10-09T14:00:00.000Z",
  },
];
