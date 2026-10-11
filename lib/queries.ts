import { createClient } from "@/lib/supabase/server";
import type { Account, DailyNote, Trade, TradeScreenshot } from "@/lib/types";

export interface TradeFilters {
  from?: string;
  to?: string;
  accountId?: string;
  pair?: string;
  direction?: string;
}

const isoBounds = (filters: TradeFilters) => ({
  from: filters.from ? new Date(`${filters.from}T00:00:00+07:00`).toISOString() : null,
  to: filters.to ? new Date(`${filters.to}T23:59:59+07:00`).toISOString() : null,
});

export async function listAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Account[];
}

export async function listTrades(filters: TradeFilters = {}): Promise<Trade[]> {
  const bounds = isoBounds(filters);
  const supabase = await createClient();

  let query = supabase.from("trades").select("*").order("entry_time", { ascending: false });

  if (bounds.from) query = query.gte("entry_time", bounds.from);
  if (bounds.to) query = query.lte("entry_time", bounds.to);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.pair) query = query.eq("pair", filters.pair);
  if (filters.direction) query = query.eq("direction", filters.direction);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Trade[];
}

export async function getTrade(id: string): Promise<Trade | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Trade) ?? null;
}

export async function listScreenshots(tradeId: string): Promise<TradeScreenshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_screenshots")
    .select("*")
    .eq("trade_id", tradeId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TradeScreenshot[];
}

export async function listPairs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trades").select("pair");
  if (error) throw new Error(error.message);
  const unique = new Set((data ?? []).map((row) => row.pair as string));
  return [...unique].sort();
}

export async function getDailyNote(day: string): Promise<DailyNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("day", day)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DailyNote) ?? null;
}

export async function listDailyNotes(limit = 60): Promise<DailyNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .order("day", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as DailyNote[];
}

// Screenshots live in a private bucket, so each one needs a short-lived
// signed URL rather than a public link.
export async function signedScreenshotUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("screenshots")
    .createSignedUrls(paths, 60 * 60);
  if (error) return {};
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
