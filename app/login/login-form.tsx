"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setIsError(false);

    const supabase = createClient();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setIsError(true);
        setMessage("Email atau password salah.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setIsError(true);
        setMessage("Tautan gagal dikirim. Coba lagi.");
      } else {
        setMessage("Tautan masuk sudah dikirim. Buka emailmu.");
      }
    }

    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex border border-line">
        <button
          type="button"
          onClick={() => setMode("password")}
          aria-pressed={mode === "password"}
          className={`num flex-1 px-3 py-2 text-sm ${
            mode === "password"
              ? "bg-brass text-brass-ink"
              : "text-muted hover:text-paper"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          aria-pressed={mode === "magic"}
          className={`num flex-1 border-l border-line px-3 py-2 text-sm ${
            mode === "magic"
              ? "bg-brass text-brass-ink"
              : "text-muted hover:text-paper"
          }`}
        >
          Tautan email
        </button>
      </div>

      <label className="block">
        <span className="num text-xs text-muted">EMAIL</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 num"
        />
      </label>

      {mode === "password" && (
        <label className="block">
          <span className="num text-xs text-muted">PASSWORD</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 num"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={busy}
        className="num w-full bg-brass px-4 py-2.5 text-sm font-medium text-brass-ink disabled:opacity-60"
      >
        {busy ? "Memproses..." : mode === "password" ? "Masuk" : "Kirim tautan"}
      </button>

      {message && (
        <p
          role="status"
          className={`num text-sm ${isError ? "text-loss" : "text-profit"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
