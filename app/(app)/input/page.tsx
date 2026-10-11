import { createTrade } from "@/app/actions/trades";
import { DailyLimitAlert } from "@/components/daily-limit-alert";
import { TradeForm } from "@/components/trade-form";
import { PageHeader } from "@/components/ui";
import { dayKeyWib } from "@/lib/format";
import { getTrade, listAccounts, listTrades } from "@/lib/queries";
import type { Trade } from "@/lib/types";

type SearchParams = Promise<{ duplicate?: string; tanggal?: string }>;

export default async function InputPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const [accounts, todayTrades] = await Promise.all([
    listAccounts(),
    listTrades({ from: dayKeyWib(new Date().toISOString()), to: dayKeyWib(new Date().toISOString()) }),
  ]);
  const duplicateSource = params.duplicate ? await getTrade(params.duplicate) : null;

  const todayClosed = todayTrades.filter((t) => t.status === "Done");
  const todayPnl = todayClosed.reduce((sum, t) => sum + t.profit_loss, 0);
  const fundedAccount = accounts.find((a) => a.type === "funded") ?? accounts[0];

  // Prefill if duplicate or date is requested
  let initialTrade: Partial<Trade> | undefined = undefined;
  if (duplicateSource) {
    initialTrade = {
      ...duplicateSource,
      id: "",
      entry_time: new Date().toISOString(),
      exit_time: null,
      profit_loss: 0,
      status: "Open",
    };
  } else if (params.tanggal) {
    initialTrade = {
      entry_time: `${params.tanggal}T09:00:00.000Z`,
    };
  }

  return (
    <>
      <PageHeader
        title={duplicateSource ? `Duplikat trade ${duplicateSource.pair}` : "Catat trade"}
        lead={
          duplicateSource
            ? "Data trade sebelumnya telah dimuat sebagai templat. Sesuaikan detail sebelum menyimpan."
            : "Waktu diisi dalam WIB. Gunakan mode formulir penuh atau mode bertahap (wizard)."
        }
      />
      <DailyLimitAlert
        todayPnl={todayPnl}
        account={fundedAccount}
        tradesToday={todayClosed.length}
        className="mx-3 mt-4 sm:mx-6 md:mx-8"
      />
      <TradeForm
        action={createTrade}
        accounts={accounts}
        trade={initialTrade as Trade}
        submitLabel="Simpan trade"
      />
    </>
  );
}
