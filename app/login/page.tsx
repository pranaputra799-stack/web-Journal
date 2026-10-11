import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/setup-notice";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="num text-xs text-brass">JURNAL TRADING</p>
        <h1 className="mt-3 text-3xl leading-tight">Catatan yang jujur.</h1>
        <p className="mt-2 text-muted">
          Masuk untuk membuka jurnalmu. Pendaftaran dibuka hanya untuk pemilik
          akun ini.
        </p>

        <div className="panel-surface rise mt-8 p-6">
          <LoginForm />
        </div>

        <p className="num mt-6 text-xs text-muted">
          Akun dibuat lewat dashboard Supabase, bukan dari halaman ini.
        </p>
      </div>
    </main>
  );
}
