"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { toNumber, toNullableNumber, toNullableText } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types";

const TYPES: AccountType[] = ["funded", "live", "demo"];

function accountFromForm(form: FormData, userId: string) {
  const typeText = String(form.get("type") ?? "demo");
  return {
    user_id: userId,
    name: String(form.get("name") ?? "").trim() || "Akun tanpa nama",
    type: (TYPES as string[]).includes(typeText) ? (typeText as AccountType) : "demo",
    currency: toNullableText(form.get("currency")) ?? "USD",
    starting_balance: toNumber(form.get("starting_balance")),
    start_date: toNullableText(form.get("start_date")),
    profit_target: toNullableNumber(form.get("profit_target")),
    max_daily_loss: toNullableNumber(form.get("max_daily_loss")),
    max_total_loss: toNullableNumber(form.get("max_total_loss")),
    active: form.get("active") === "on",
  };
}

export async function createAccount(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("accounts").insert(accountFromForm(form, user.id));
  if (error) throw new Error(error.message);

  revalidatePath("/pengaturan");
  revalidatePath("/dashboard");
}

export async function updateAccount(id: string, form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const payload = accountFromForm(form, user.id);
  delete (payload as { user_id?: string }).user_id;

  const { error } = await supabase.from("accounts").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/pengaturan");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  await requireUser();
  const supabase = await createClient();

  // Trades keep their history; the account link is cleared by the schema.
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/pengaturan");
  revalidatePath("/dashboard");
}
