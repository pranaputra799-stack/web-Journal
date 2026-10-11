import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// Server components behind the app shell call this. It sends anonymous
// visitors to the login page.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
