import { AppNav } from "@/components/app-nav";
import { CommandPalette } from "@/components/command-palette";
import { MarketSessionTicker } from "@/components/market-session-ticker";
import { SetupNotice } from "@/components/setup-notice";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppNav email={user.email ?? "masuk"} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* Sleek Linear-style Top Terminal Bar for Desktop */}
        <header className="hidden md:flex items-center justify-between border-b border-line/60 bg-ink/75 px-6 py-2.5 backdrop-blur-md sticky top-0 z-30">
          <MarketSessionTicker />
          <div className="flex items-center gap-3">
            <CommandPalette />
            <ThemeToggle compact />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
