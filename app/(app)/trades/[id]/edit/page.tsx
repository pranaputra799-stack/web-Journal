import { notFound } from "next/navigation";

import { updateTrade } from "@/app/actions/trades";
import { TradeForm } from "@/components/trade-form";
import { PageHeader } from "@/components/ui";
import { getTrade, listAccounts } from "@/lib/queries";

type Params = Promise<{ id: string }>;

export default async function EditTradePage({ params }: { params: Params }) {
  const { id } = await params;
  const [trade, accounts] = await Promise.all([getTrade(id), listAccounts()]);
  if (!trade) notFound();

  const action = updateTrade.bind(null, trade.id);

  return (
    <>
      <PageHeader
        title="Edit trade"
        lead={`${trade.pair} ${trade.direction}`}
      />
      <TradeForm
        action={action}
        accounts={accounts}
        trade={trade}
        submitLabel="Simpan perubahan"
      />
    </>
  );
}
