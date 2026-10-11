import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/setup-notice";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Home() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getUser();
  redirect(user ? "/dashboard" : "/login");
}
