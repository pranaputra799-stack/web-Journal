import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteScreenshot, deleteTrade, uploadScreenshot } from "@/app/actions/trades";
import { PageHeader, Panel, PanelHead } from "@/components/ui";
import {
  formatDateTimeWib,
  formatDuration,
  formatMoney,
  formatNumber,
  formatSignedMoney,
  pnlClass,
} from "@/lib/format";
import { getTrade, listScreenshots, signedScreenshotUrls } from "@/lib/queries";

type Params = Promise<{ id: string }>;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="num text-[11px] text-muted">{label}</span>
      <span className="num text-right text-sm">{value}</span>
    </div>
  );
}

export default async function TradeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  const screenshots = await listScreenshots(trade.id);
  const urls = await signedScreenshotUrls(screenshots.map((shot) => shot.file_path));

  const deleteThisTrade = deleteTrade.bind(null, trade.id);

  return (
    <>
      <PageHeader
        title={`${trade.pair} ${trade.direction}`}
        lead={`${formatDateTimeWib(trade.entry_time)} WIB, ${formatDuration(trade.entry_time, trade.exit_time)}`}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/input?duplicate=${trade.id}`}
              className="num border border-line px-4 py-2.5 text-sm text-brass hover:border-brass hover:bg-brass/5 transition-colors"
            >
              + Duplikat
            </Link>
            <Link
              href={`/trades/${trade.id}/edit`}
              className="num border border-line px-4 py-2.5 text-sm text-muted hover:border-brass hover:text-brass"
            >
              Edit
            </Link>
            <form action={deleteThisTrade}>
              <button
                type="submit"
                className="num border border-line px-4 py-2.5 text-sm text-muted hover:border-loss hover:text-loss"
              >
                Hapus
              </button>
            </form>
          </div>
        }
      />

      <div className="grid gap-6 px-5 py-6 md:grid-cols-3 md:px-8">
        <Panel className="md:col-span-2">
          <PanelHead title="Ringkasan trade" note={trade.status} />
          <div className="px-4 py-3">
            <div className="num mb-4 text-3xl">
              <span className={pnlClass(trade.profit_loss)}>
                {formatSignedMoney(trade.profit_loss)}
              </span>
              <span className="ml-3 text-sm text-muted">
                {trade.r_multiple === null ? "" : `${trade.r_multiple.toFixed(2)}R`}
              </span>
            </div>
            <Row label="HASIL" value={trade.result} />
            <Row label="EXIT" value={trade.exit_time ? `${formatDateTimeWib(trade.exit_time)} WIB` : "masih terbuka"} />
            <Row label="ENTRY PRICE" value={formatNumber(trade.entry_price)} />
            <Row label="EXIT PRICE" value={formatNumber(trade.exit_price)} />
            <Row label="STOP LOSS" value={formatNumber(trade.stop_loss)} />
            <Row label="TAKE PROFIT" value={formatNumber(trade.take_profit)} />
            <Row label="LOT" value={formatNumber(trade.lot_size, 4)} />
            <Row label="R:R RENCANA" value={formatNumber(trade.planned_rr)} />
            <Row label="RISK" value={`${formatNumber(trade.risk_percent)}% / ${formatMoney(trade.risk_amount)}`} />
            <Row label="MENGIKUTI RENCANA" value={trade.followed_plan === null ? "-" : trade.followed_plan ? "Ya" : "Tidak"} />
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Emosi" note={trade.emotion ?? "-"} />
          <div className="space-y-4 px-4 py-4 text-sm">
            <div>
              <p className="num text-[11px] text-muted">CATATAN EMOSI</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{trade.emotion_note ?? "-"}</p>
            </div>
            <div>
              <p className="num text-[11px] text-muted">KESALAHAN</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{trade.mistakes ?? "-"}</p>
            </div>
            <div>
              <p className="num text-[11px] text-muted">PELAJARAN</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{trade.lessons ?? "-"}</p>
            </div>
          </div>
        </Panel>

        <Panel className="md:col-span-3">
          <PanelHead title="Alasan entry" />
          <p className="whitespace-pre-wrap px-4 py-4 text-sm text-muted">
            {trade.reason_entry ?? "-"}
          </p>
        </Panel>

        <Panel className="md:col-span-3">
          <PanelHead title="Screenshot" note={`${screenshots.length} berkas`} />
          <div className="space-y-5 px-4 py-4">
            <form action={uploadScreenshot} className="grid gap-3 md:grid-cols-4">
              <input type="hidden" name="trade_id" value={trade.id} />
              <label className="block md:col-span-2">
                <span className="num text-[11px] text-muted">BERKAS</span>
                <input type="file" name="file" accept="image/*" required className="num mt-1.5" />
              </label>
              <label className="block">
                <span className="num text-[11px] text-muted">LABEL</span>
                <select name="position" className="num mt-1.5">
                  <option value="sebelum">Sebelum</option>
                  <option value="sesudah">Sesudah</option>
                  <option value="htf">HTF</option>
                </select>
              </label>
              <div className="flex items-end">
                <button type="submit" className="num w-full border border-brass px-3 py-2 text-sm text-brass">
                  Unggah
                </button>
              </div>
            </form>

            {screenshots.length === 0 ? (
              <p className="num text-xs text-muted">
                Belum ada screenshot. Berkas disimpan di bucket privat dan ditampilkan
                lewat tautan sementara.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {screenshots.map((shot) => (
                  <li key={shot.id} className="panel-surface overflow-hidden">
                    {urls[shot.file_path] ? (
                      // Signed URLs are short-lived, so next/image optimisation
                      // is not useful here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urls[shot.file_path]}
                        alt={shot.caption ?? shot.position ?? "screenshot"}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="num flex h-40 items-center justify-center text-xs text-muted">
                        pratinjau tidak tersedia
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="num text-[11px] text-muted">{shot.position ?? "-"}</span>
                      <form
                        action={deleteScreenshot.bind(null, shot.id, trade.id, shot.file_path)}
                      >
                        <button type="submit" className="num text-[11px] text-muted hover:text-loss">
                          hapus
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
