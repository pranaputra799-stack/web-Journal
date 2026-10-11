import { AppNav } from "@/components/app-nav";
import { SetupNotice } from "@/components/setup-notice";
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
      {/* pb-20 gives clearance for the mobile bottom tab bar */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
