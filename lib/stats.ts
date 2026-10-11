// The statistics engine. Pure functions over a list of trades so the numbers
// can be recomputed anywhere and tested without a database.
//
// Two honesty rules from the plan are enforced here:
//   1. Break-even trades are reported separately and never counted as losses.
//   2. R-based figures need a risk amount. When it is missing they fall back
//      to SL = -1R and TP = +planned_rr R, and the caller is told the figure
//      is an estimate.

import type { Trade } from "@/lib/types";

// Below this many trades a percentage is noise. The interface labels it.
export const SMALL_SAMPLE = 30;

export interface Summary {
  totalTrades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number | null;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  expectancyUsd: number;
  expectancyR: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  payoffRatio: number | null;
  breakEvenWinRate: number | null;
  bestTrade: number | null;
  worstTrade: number | null;
  avgPlannedRr: number | null;
  avgRiskPercent: number | null;
  avgWinDurationMs: number | null;
  avgLossDurationMs: number | null;
  smallSample: boolean;
}

// The R a trade realised. Uses risk_amount when present, otherwise the
// planned R:R convention (SL = -1R, TP = +planned_rr).
export function realisedR(trade: Trade): { value: number; estimated: boolean } {
  if (trade.risk_amount && trade.risk_amount > 0) {
    return { value: trade.profit_loss / trade.risk_amount, estimated: false };
  }
  if (trade.result === "SL") return { value: -1, estimated: true };
  if (trade.result === "BE") return { value: 0, estimated: true };
  if (trade.result === "TP" && trade.planned_rr) {
    return { value: trade.planned_rr, estimated: true };
  }
  return { value: 0, estimated: true };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function durationMs(trade: Trade): number | null {
  if (!trade.exit_time) return null;
  const ms = new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime();
  return Number.isNaN(ms) || ms < 0 ? null : ms;
}

export function summarise(trades: Trade[]): Summary {
  const closed = trades.filter((t) => t.status === "Done");
  const wins = closed.filter((t) => t.profit_loss > 0);
  const losses = closed.filter((t) => t.profit_loss < 0);
  const breakEven = closed.filter((t) => t.profit_loss === 0);

  const grossProfit = wins.reduce((sum, t) => sum + t.profit_loss, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit_loss, 0));
  const netPnl = grossProfit - grossLoss;

  const decided = wins.length + losses.length;
  const winRate = decided > 0 ? (wins.length / decided) * 100 : null;

  const avgWin = mean(wins.map((t) => t.profit_loss));
  const avgLoss = mean(losses.map((t) => Math.abs(t.profit_loss)));
  const payoffRatio = avgWin !== null && avgLoss && avgLoss > 0 ? avgWin / avgLoss : null;
  const breakEvenWinRate =
    payoffRatio && payoffRatio > 0 ? (1 / (1 + payoffRatio)) * 100 : null;

  const rValues = closed.map((t) => realisedR(t).value);
  const pnls = closed.map((t) => t.profit_loss);

  const winDurations = wins.map(durationMs).filter((v): v is number => v !== null);
  const lossDurations = losses.map(durationMs).filter((v): v is number => v !== null);

  return {
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEven.length,
    winRate,
    netPnl,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    expectancyUsd: closed.length > 0 ? netPnl / closed.length : 0,
    expectancyR: mean(rValues),
    avgWin,
    avgLoss,
    payoffRatio,
    breakEvenWinRate,
    bestTrade: pnls.length ? Math.max(...pnls) : null,
    worstTrade: pnls.length ? Math.min(...pnls) : null,
    avgPlannedRr: mean(
      closed.filter((t) => t.planned_rr !== null).map((t) => t.planned_rr as number),
    ),
    avgRiskPercent: mean(
      closed.filter((t) => t.risk_percent !== null).map((t) => t.risk_percent as number),
    ),
    avgWinDurationMs: mean(winDurations),
    avgLossDurationMs: mean(lossDurations),
    smallSample: closed.length < SMALL_SAMPLE,
  };
}

export interface EquityPoint {
  index: number;
  time: string;
  equity: number;
  peak: number;
  drawdown: number;
  drawdownPercent: number;
  staticDrawdown: number;
  staticDrawdownPercent: number;
  pnl?: number;
  pair?: string;
  direction?: string;
  result?: string;
  tradeId?: string;
}

// Cumulative P/L ordered oldest-first, with the running drawdown.
export function equityCurve(trades: Trade[], startingBalance: number): EquityPoint[] {
  const closed = trades
    .filter((t) => t.status === "Done")
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

  let equity = startingBalance;
  let peak = startingBalance;
  const points: EquityPoint[] = [];

  for (const [index, trade] of closed.entries()) {
    equity += trade.profit_loss;
    peak = Math.max(peak, equity);
    const drawdown = Math.max(0, peak - equity);
    const staticDrawdown = Math.max(0, startingBalance - equity);
    points.push({
      index,
      time: trade.exit_time ?? trade.entry_time,
      equity,
      peak,
      drawdown,
      drawdownPercent: peak > 0 ? (drawdown / peak) * 100 : 0,
      staticDrawdown,
      staticDrawdownPercent: startingBalance > 0 ? (staticDrawdown / startingBalance) * 100 : 0,
      pnl: trade.profit_loss,
      pair: trade.pair,
      direction: trade.direction,
      result: trade.result,
      tradeId: trade.id,
    });
  }

  return points;
}

export type DrawdownMode = "dinamis" | "statis";

export interface DrawdownInfo {
  mode: DrawdownMode;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  at: string | null;
  current: number;
  currentPercent: number;
  recoveryFactor: number | null;
  staticLimitPercent: number;
  staticLimitAmount: number;
  staticBreachLevel: number;
  remainingBuffer: number;
  bufferPercent: number;
}

export function drawdown(
  points: EquityPoint[],
  netProfit: number,
  mode: DrawdownMode = "dinamis",
  startingBalance: number = 10000,
  staticLimitPercent: number = 4,
): DrawdownInfo {
  const limitAmount = startingBalance * (staticLimitPercent / 100);
  const breachLevel = startingBalance - limitAmount;

  if (points.length === 0) {
    return {
      mode,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      at: null,
      current: 0,
      currentPercent: 0,
      recoveryFactor: null,
      staticLimitPercent,
      staticLimitAmount: limitAmount,
      staticBreachLevel: breachLevel,
      remainingBuffer: limitAmount,
      bufferPercent: staticLimitPercent,
    };
  }

  const isStatic = mode === "statis";

  let worst = points[0];
  for (const point of points) {
    const worstVal = isStatic ? worst.staticDrawdown : worst.drawdown;
    const curVal = isStatic ? point.staticDrawdown : point.drawdown;
    if (curVal > worstVal) worst = point;
  }

  const last = points[points.length - 1];
  const maxDd = isStatic ? worst.staticDrawdown : worst.drawdown;
  const maxDdPercent = isStatic ? worst.staticDrawdownPercent : worst.drawdownPercent;
  const curDd = isStatic ? last.staticDrawdown : last.drawdown;
  const curDdPercent = isStatic ? last.staticDrawdownPercent : last.drawdownPercent;

  const remainingBuffer = last.equity - breachLevel;
  const bufferPercent = startingBalance > 0 ? (remainingBuffer / startingBalance) * 100 : 0;

  return {
    mode,
    maxDrawdown: maxDd,
    maxDrawdownPercent: maxDdPercent,
    at: worst.time,
    current: curDd,
    currentPercent: curDdPercent,
    recoveryFactor: maxDd > 0 ? netProfit / maxDd : null,
    staticLimitPercent,
    staticLimitAmount: limitAmount,
    staticBreachLevel: breachLevel,
    remainingBuffer,
    bufferPercent,
  };
}

export interface StreakInfo {
  current: number;
  currentKind: "win" | "loss" | "none";
  longestWin: number;
  longestLoss: number;
}

export function streaks(trades: Trade[]): StreakInfo {
  const closed = trades
    .filter((t) => t.status === "Done" && t.profit_loss !== 0)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

  let longestWin = 0;
  let longestLoss = 0;
  let runWin = 0;
  let runLoss = 0;
  let current = 0;
  let currentKind: StreakInfo["currentKind"] = "none";

  for (const trade of closed) {
    if (trade.profit_loss > 0) {
      runWin += 1;
      runLoss = 0;
      longestWin = Math.max(longestWin, runWin);
    } else {
      runLoss += 1;
      runWin = 0;
      longestLoss = Math.max(longestLoss, runLoss);
    }
  }

  for (let i = closed.length - 1; i >= 0; i -= 1) {
    const kind = closed[i].profit_loss > 0 ? "win" : "loss";
    if (currentKind === "none") {
      currentKind = kind;
      current = 1;
    } else if (currentKind === kind) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, currentKind, longestWin, longestLoss };
}

export interface Bucket {
  key: string;
  trades: number;
  winRate: number | null;
  netPnl: number;
  profitFactor: number | null;
  expectancyUsd: number;
  smallSample: boolean;
}

// One row per distinct value of whatever the caller groups by.
export function breakdown(
  trades: Trade[],
  keyOf: (trade: Trade) => string | null,
): Bucket[] {
  const groups = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = keyOf(trade);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(trade);
    else groups.set(key, [trade]);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const summary = summarise(group);
      return {
        key,
        trades: summary.totalTrades,
        winRate: summary.winRate,
        netPnl: summary.netPnl,
        profitFactor: summary.profitFactor,
        expectancyUsd: summary.expectancyUsd,
        smallSample: summary.smallSample,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

// Grouped P/L by WIB calendar day, used by the bar chart and the calendar.
export function dailyPnl(
  trades: Trade[],
  dayKey: (iso: string) => string,
  dateOf: (trade: Trade) => string,
): Map<string, { pnl: number; count: number }> {
  const days = new Map<string, { pnl: number; count: number }>();

  for (const trade of trades) {
    if (trade.status !== "Done") continue;
    const key = dayKey(dateOf(trade));
    const entry = days.get(key) ?? { pnl: 0, count: 0 };
    entry.pnl += trade.profit_loss;
    entry.count += 1;
    days.set(key, entry);
  }

  return days;
}
