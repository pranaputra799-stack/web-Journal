import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/env";

// Shown instead of a crash when the Supabase keys are missing.
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="panel-surface p-6">
        <h1 className="text-2xl">Hubungkan Supabase dulu</h1>
        <p className="mt-3 text-muted">
          Kunci Supabase belum ada, jadi aplikasi belum bisa membaca atau
          menyimpan data.
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Buat project di{" "}
            <a
              className="text-brass underline"
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              supabase.com/dashboard
            </a>
            .
          </li>
          <li>
            Buka <span className="num">SQL Editor</span>, tempel isi{" "}
            <span className="num">supabase/schema.sql</span>, lalu jalankan.
          </li>
          <li>
            Buka <span className="num">Project Settings &gt; API</span> dan
            salin <span className="num">Project URL</span> serta{" "}
            <span className="num">anon public key</span>.
          </li>
          <li>
            Tulis ke <span className="num">.env.local</span>:
            <pre className="num mt-2 overflow-x-auto border border-line bg-ink p-3 text-xs">
              {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
            </pre>
          </li>
          <li>Jalankan ulang server dev.</li>
        </ol>
        <p className="mt-5 text-sm text-muted">
          Langkah lengkap ada di <span className="num">README.md</span>.
        </p>
        <Link
          href="/"
          className="num mt-6 inline-block border border-line px-3 py-2 text-sm hover:border-brass"
        >
          Muat ulang
        </Link>
      </div>
    </div>
  );
}

export function isConfigured() {
  return isSupabaseConfigured;
}
