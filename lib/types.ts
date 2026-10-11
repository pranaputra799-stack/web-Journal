// Domain types. These mirror supabase/schema.sql.

export type AccountType = "funded" | "live" | "demo";
export type Direction = "Buy" | "Sell";
export type TradeResult = "TP" | "SL" | "BE" | "Manual";
export type TradeStatus = "Open" | "Done";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  starting_balance: number;
  start_date: string | null;
  profit_target: number | null;
  max_daily_loss: number | null;
  max_total_loss: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string | null;
  pair: string;
  direction: Direction;
  entry_time: string;
  exit_time: string | null;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number | null;
  profit_loss: number;
  result: TradeResult;
  planned_rr: number | null;
  risk_percent: number | null;
  risk_amount: number | null;
  r_multiple: number | null;
  reason_entry: string | null;
  emotion: string | null;
  emotion_note: string | null;
  mistakes: string | null;
  lessons: string | null;
  followed_plan: boolean | null;
  status: TradeStatus;
  created_at: string;
  updated_at: string;
}

export type TradeInput = Omit<
  Trade,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface TradeScreenshot {
  id: string;
  user_id: string;
  trade_id: string;
  file_path: string;
  caption: string | null;
  position: string | null;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
}

export interface DailyNote {
  id: string;
  user_id: string;
  day: string;
  morning_plan: string | null;
  evening_review: string | null;
  mood: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Emotion choices from the plan, with free text alongside.
export const EMOTIONS = [
  "Tenang",
  "FOMO",
  "Takut",
  "Serakah",
  "Revenge",
  "Ragu",
  "Percaya diri",
] as const;

export const RESULTS: TradeResult[] = ["TP", "SL", "BE", "Manual"];

export const DIRECTIONS: Direction[] = ["Buy", "Sell"];

export const ACCOUNT_TYPES: AccountType[] = ["funded", "live", "demo"];
