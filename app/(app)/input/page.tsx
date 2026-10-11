import { createTrade } from "@/app/actions/trades";
import { TradeForm } from "@/components/trade-form";
import { PageHeader } from "@/components/ui";
import { getTrade, listAccounts } from "@/lib/queries";
import type { Trade } from "@/lib/types";

type SearchParams = Promise<{ duplicate?: string; tanggal?: string }>;

export default async function InputPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const accounts = await listAccounts();
  const duplicateSource = params.duplicate ? await getTrade(params.duplicate) : null;

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
      <TradeForm
        action={createTrade}
        accounts={accounts}
        trade={initialTrade as Trade}
        submitLabel="Simpan trade"
      />
    </>
  );
}
