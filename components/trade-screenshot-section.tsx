"use client";

import { useState } from "react";
import { ScreenshotAnnotator } from "@/components/screenshot-annotator";
import { uploadScreenshot, deleteScreenshot } from "@/app/actions/trades";
import type { TradeScreenshot } from "@/lib/types";

export function TradeScreenshotSection({
  tradeId,
  screenshots,
  urls,
}: {
  tradeId: string;
  screenshots: TradeScreenshot[];
  urls: Record<string, string>;
}) {
  const [showStudio, setShowStudio] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | undefined>(undefined);

  const openStudio = (imgUrl?: string) => {
    setEditingImageUrl(imgUrl);
    setShowStudio(true);
  };

  const closeStudio = () => {
    setShowStudio(false);
    setEditingImageUrl(undefined);
  };

  return (
    <div className="space-y-5 px-4 py-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <p className="text-xs text-muted">
          Unggah berkas langsung atau gunakan studio untuk <strong>auto-crop margin</strong> dan <strong>anotasi panah / kotak zona / catatan</strong>.
        </p>

        <button
          type="button"
          onClick={() => openStudio()}
          className="num border border-brass bg-brass/10 px-3 py-1.5 text-xs font-semibold text-brass hover:bg-brass/20 transition-colors flex items-center gap-1.5"
        >
          <span>✂🎨</span>
          <span>Buka Studio Auto-Crop & Anotasi</span>
        </button>
      </div>

      {/* Studio Drawer / Modal when open */}
      {showStudio && (
        <div className="border border-brass/40 bg-ink/95 p-3 rounded shadow-2xl">
          <ScreenshotAnnotator
            tradeId={tradeId}
            initialImageUrl={editingImageUrl}
            onUploaded={closeStudio}
            onClose={closeStudio}
          />
        </div>
      )}

      {/* Standard File Upload Form */}
      {!showStudio && (
        <form action={uploadScreenshot} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="trade_id" value={tradeId} />
          <label className="block md:col-span-2">
            <span className="num text-[11px] text-muted">UNGGAH BERKAS CEPAT</span>
            <input type="file" name="file" accept="image/*" required className="num mt-1.5 w-full text-xs" />
          </label>
          <label className="block">
            <span className="num text-[11px] text-muted">LABEL</span>
            <select name="position" className="num mt-1.5 bg-raised border border-line py-1.5 px-2 text-xs text-paper w-full">
              <option value="sebelum">Sebelum Entry</option>
              <option value="sesudah">Sesudah (Hasil)</option>
              <option value="htf">HTF (Higher Timeframe)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="num w-full border border-line hover:border-brass px-3 py-2 text-xs font-medium text-paper hover:text-brass transition-colors"
            >
              Unggah Langsung
            </button>
          </div>
        </form>
      )}

      {/* Screenshots Grid */}
      {screenshots.length === 0 ? (
        <p className="num text-xs text-muted pt-2">
          Belum ada screenshot. Tekan &quot;Buka Studio Auto-Crop & Anotasi&quot; lalu tekan Ctrl+V untuk menempel langsung dari clipboard.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {screenshots.map((shot) => {
            const imgUrl = urls[shot.file_path];
            return (
              <li key={shot.id} className="panel-surface overflow-hidden border border-line group">
                {imgUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={shot.caption ?? shot.position ?? "screenshot"}
                      className="h-44 w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openStudio(imgUrl)}
                        className="num border border-brass bg-ink px-2.5 py-1 text-xs text-brass hover:bg-brass/20 rounded shadow"
                      >
                        Anotasi Ulang
                      </button>
                      <a
                        href={imgUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="num border border-line bg-ink px-2.5 py-1 text-xs text-paper hover:bg-raised rounded shadow"
                      >
                        Lihat Penuh
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="num flex h-44 items-center justify-center text-xs text-muted">
                    Pratinjau tidak tersedia
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2 border-t border-line/60 bg-raised/30">
                  <div>
                    <span className="num text-[11px] font-semibold text-paper uppercase">
                      {shot.position ?? "-"}
                    </span>
                    {shot.caption && (
                      <p className="text-[10px] text-muted truncate max-w-[160px]">{shot.caption}</p>
                    )}
                  </div>
                  <form action={deleteScreenshot.bind(null, shot.id, tradeId, shot.file_path)}>
                    <button
                      type="submit"
                      className="num text-[11px] text-muted hover:text-loss transition-colors"
                    >
                      Hapus
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
