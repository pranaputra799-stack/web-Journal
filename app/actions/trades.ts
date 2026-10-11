"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  toNullableNumber,
  toNullableText,
  toNumber,
  wibInputToUtcIso,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Direction, TradeResult, TradeStatus } from "@/lib/types";

const DIRECTIONS: Direction[] = ["Buy", "Sell"];
const RESULTS: TradeResult[] = ["TP", "SL", "BE", "Manual"];
const STATUSES: TradeStatus[] = ["Open", "Done"];

function pick<T extends string>(value: FormDataEntryValue | null, allowed: T[], fallback: T): T {
  const text = String(value ?? "");
  return (allowed as string[]).includes(text) ? (text as T) : fallback;
}

function tradeFromForm(form: FormData, userId: string) {
  const result = pick(form.get("result"), RESULTS, "Manual");
  const plannedRr = toNullableNumber(form.get("planned_rr"));
  const riskAmount = toNullableNumber(form.get("risk_amount"));
  const profitLoss = toNumber(form.get("profit_loss"));

  // R actual comes from the money risked. Without it we fall back to the
  // planned R:R convention and flag the number as an estimate in the UI.
  let rMultiple: number | null = null;
  if (riskAmount && riskAmount > 0) {
    rMultiple = profitLoss / riskAmount;
  } else if (result === "SL") {
    rMultiple = -1;
  } else if (result === "BE") {
    rMultiple = 0;
  } else if (result === "TP" && plannedRr) {
    rMultiple = plannedRr;
  }

  const exitTime = wibInputToUtcIso(toNullableText(form.get("exit_time")));

  return {
    user_id: userId,
    account_id: toNullableText(form.get("account_id")),
    pair: String(form.get("pair") ?? "").trim().toUpperCase() || "UNKNOWN",
    direction: pick(form.get("direction"), DIRECTIONS, "Buy"),
    entry_time:
      wibInputToUtcIso(toNullableText(form.get("entry_time"))) ??
      new Date().toISOString(),
    exit_time: exitTime,
    entry_price: toNullableNumber(form.get("entry_price")),
    exit_price: toNullableNumber(form.get("exit_price")),
    stop_loss: toNullableNumber(form.get("stop_loss")),
    take_profit: toNullableNumber(form.get("take_profit")),
    lot_size: toNullableNumber(form.get("lot_size")),
    profit_loss: profitLoss,
    result,
    planned_rr: plannedRr,
    risk_percent: toNullableNumber(form.get("risk_percent")),
    risk_amount: riskAmount,
    r_multiple: rMultiple,
    reason_entry: toNullableText(form.get("reason_entry")),
    emotion: toNullableText(form.get("emotion")),
    emotion_note: toNullableText(form.get("emotion_note")),
    mistakes: toNullableText(form.get("mistakes")),
    lessons: toNullableText(form.get("lessons")),
    followed_plan: form.get("followed_plan") === "on" ? true : null,
    status: pick(form.get("status"), STATUSES, exitTime ? "Done" : "Open"),
  };
}

export async function createTrade(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const payload = tradeFromForm(form, user.id);

  const { data, error } = await supabase
    .from("trades")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  redirect(`/trades/${data.id}`);
}

export async function updateTrade(id: string, form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const payload = tradeFromForm(form, user.id);
  delete (payload as { user_id?: string }).user_id;

  const { error } = await supabase.from("trades").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
  revalidatePath("/dashboard");
  redirect(`/trades/${id}`);
}

export async function deleteTrade(id: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  redirect("/trades");
}

export async function saveDailyNote(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const day = toNullableText(form.get("day"));
  if (!day) throw new Error("Tanggal catatan tidak ada.");

  const { error } = await supabase.from("daily_notes").upsert(
    {
      user_id: user.id,
      day,
      morning_plan: toNullableText(form.get("morning_plan")),
      evening_review: toNullableText(form.get("evening_review")),
      mood: toNullableText(form.get("mood")),
      notes: toNullableText(form.get("notes")),
    },
    { onConflict: "user_id,day" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/catatan");
  revalidatePath("/calendar");
}

export async function deleteScreenshot(id: string, tradeId: string, path: string) {
  await requireUser();
  const supabase = await createClient();

  await supabase.storage.from("screenshots").remove([path]);
  const { error } = await supabase.from("trade_screenshots").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/trades/${tradeId}`);
}

export async function uploadScreenshot(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const tradeId = toNullableText(form.get("trade_id"));
  const file = form.get("file");
  if (!tradeId || !(file instanceof File) || file.size === 0) {
    throw new Error("Berkas belum dipilih.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${tradeId}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from("screenshots")
    .upload(path, file, { contentType: file.type || "image/png", upsert: false });

  if (upload.error) throw new Error(upload.error.message);

  const { error } = await supabase.from("trade_screenshots").insert({
    user_id: user.id,
    trade_id: tradeId,
    file_path: path,
    caption: toNullableText(form.get("caption")),
    position: toNullableText(form.get("position")),
    sort_order: Number(form.get("sort_order") ?? 0) || 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trades/${tradeId}`);
}

export async function importTrades(tradesToInsert: Array<Record<string, unknown>>) {
  const user = await requireUser();
  const supabase = await createClient();

  const rows = tradesToInsert.map((t) => ({
    ...t,
    user_id: user.id,
  }));

  const { error } = await supabase.from("trades").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/statistik");

  return { count: rows.length, success: true };
}

export async function saveWeeklyReview(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const weekKey = String(form.get("week_key") ?? "");
  const wins = toNullableText(form.get("wins"));
  const mistakes = toNullableText(form.get("mistakes"));
  const goals = toNullableText(form.get("goals"));
  const rating = toNullableNumber(form.get("rating"));

  const { error } = await supabase.from("daily_notes").upsert(
    {
      user_id: user.id,
      day: `W-${weekKey}`,
      morning_plan: wins,
      evening_review: mistakes,
      notes: goals,
      mood: rating ? `${rating} Bintang` : null,
    },
    { onConflict: "user_id,day" },
  );

  if (error) {
    if (error.code === "22007") {
      throw new Error(
        "Kolom 'day' di tabel daily_notes Supabase masih bertipe DATE. Buka SQL Editor di dashboard Supabase lalu jalankan: ALTER TABLE public.daily_notes ALTER COLUMN day TYPE text;"
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/catatan");
}
