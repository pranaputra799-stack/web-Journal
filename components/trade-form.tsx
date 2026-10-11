"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Field } from "@/components/ui";
import { utcIsoToWibInput } from "@/lib/format";
import {
  DIRECTIONS,
  EMOTIONS,
  RESULTS,
  type Account,
  type Trade,
} from "@/lib/types";

export function TradeForm({
  action,
  accounts,
  trade,
  submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  accounts: Account[];
  trade?: Trade;
  submitLabel: string;
}) {
  const [mode, setMode] = useState<"full" | "wizard">("full");
  const [step, setStep] = useState(1);

  // Form interactive states for auto-calculations
  const [selectedAccountId, setSelectedAccountId] = useState(trade?.account_id ?? "");
  const [entryPrice, setEntryPrice] = useState<string>(trade?.entry_price ? String(trade.entry_price) : "");
  const [stopLoss, setStopLoss] = useState<string>(trade?.stop_loss ? String(trade.stop_loss) : "");
  const [takeProfit, setTakeProfit] = useState<string>(trade?.take_profit ? String(trade.take_profit) : "");
  const [plannedRr, setPlannedRr] = useState<string>(trade?.planned_rr ? String(trade.planned_rr) : "");
  const [riskPercent, setRiskPercent] = useState<string>(trade?.risk_percent ? String(trade.risk_percent) : "");
  const [riskAmount, setRiskAmount] = useState<string>(trade?.risk_amount ? String(trade.risk_amount) : "");

  // Auto calculate R:R when entry, SL, TP change
  const autoRr = useMemo(() => {
    const ep = Number(entryPrice);
    const sl = Number(stopLoss);
    const tp = Number(takeProfit);
    if (!ep || !sl || !tp) return null;
    const riskDiff = Math.abs(ep - sl);
    const rewardDiff = Math.abs(tp - ep);
    if (riskDiff === 0) return null;
    return (rewardDiff / riskDiff).toFixed(2);
  }, [entryPrice, stopLoss, takeProfit]);

  // Auto calculate risk amount when account & risk percent change
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const autoRiskMoney = useMemo(() => {
    const rp = Number(riskPercent);
    if (!rp || !selectedAccount) return null;
    return ((rp / 100) * selectedAccount.starting_balance).toFixed(2);
  }, [riskPercent, selectedAccount]);

  const applyAutoRr = () => {
    if (autoRr) setPlannedRr(autoRr);
  };

  const applyAutoRiskMoney = () => {
    if (autoRiskMoney) setRiskAmount(autoRiskMoney);
  };

  const chip =
    "num cursor-pointer border border-line px-3 py-2 text-center text-sm text-muted transition-colors peer-checked:border-brass peer-checked:text-brass peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass";

  return (
    <div className="space-y-5 px-4 py-5 md:space-y-6 md:px-8">
      {/* Switcher: Form Penuh vs Wizard */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-1 border border-line p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`num px-3 py-1.5 transition-colors ${
              mode === "full" ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
            }`}
          >
            Formulir Lengkap
          </button>
          <button
            type="button"
            onClick={() => setMode("wizard")}
            className={`num px-3 py-1.5 transition-colors ${
              mode === "wizard" ? "bg-raised text-brass font-medium" : "text-muted hover:text-paper"
            }`}
          >
            Mode Bertahap
          </button>
        </div>

        {mode === "wizard" && (
          <div className="num text-xs text-muted">
            Langkah <span className="text-brass font-medium">{step}</span> dari 4
          </div>
        )}
      </div>

      <form action={action} className="space-y-8">
        {/* STEP 1: Info Dasar & Waktu */}
        <section
          className={`space-y-5 ${mode === "wizard" && step !== 1 ? "hidden" : ""}`}
        >
          {mode === "wizard" && (
            <h2 className="text-lg font-medium text-brass">1. Info Dasar & Waktu</h2>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="PAIR" hint="Contoh: XAUUSD, EURUSD.">
              <input
                name="pair"
                required
                defaultValue={trade?.pair ?? ""}
                placeholder="XAUUSD"
                className="num mt-1.5 uppercase"
              />
            </Field>

            <Field label="AKUN">
              <select
                name="account_id"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="num mt-1.5"
              >
                <option value="">Tanpa akun</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <span className="num text-[11px] text-muted">ARAH</span>
              <div className="mt-1.5 flex">
                {DIRECTIONS.map((direction, index) => (
                  <label key={direction} className={index > 0 ? "flex-1 -ml-px" : "flex-1"}>
                    <input
                      type="radio"
                      name="direction"
                      value={direction}
                      defaultChecked={trade ? trade.direction === direction : direction === "Buy"}
                      className="peer sr-only"
                    />
                    <span className={chip}>{direction}</span>
                  </label>
                ))}
              </div>
            </div>

            <Field label="HASIL">
              <select name="result" defaultValue={trade?.result ?? "Manual"} className="num mt-1.5">
                {RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {result}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="WAKTU ENTRY (WIB)">
              <input
                type="datetime-local"
                name="entry_time"
                required
                defaultValue={trade?.entry_time ? utcIsoToWibInput(trade.entry_time) : ""}
                className="num mt-1.5"
              />
            </Field>

            <Field label="WAKTU EXIT (WIB)" hint="Kosongkan kalau posisi masih terbuka.">
              <input
                type="datetime-local"
                name="exit_time"
                defaultValue={trade?.exit_time ? utcIsoToWibInput(trade.exit_time) : ""}
                className="num mt-1.5"
              />
            </Field>
          </div>
        </section>

        {/* STEP 2: Harga, Eksekusi & R:R */}
        <section
          className={`space-y-5 ${mode === "wizard" && step !== 2 ? "hidden" : ""}`}
        >
          <div className="border-b border-line pb-2 flex items-center justify-between">
            <h2 className="text-base font-medium">Harga dan ukuran</h2>
            {autoRr && (
              <button
                type="button"
                onClick={applyAutoRr}
                className="num text-xs text-brass hover:underline"
              >
                Gunakan hitungan R:R ({autoRr}R)
              </button>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="HARGA ENTRY">
              <input
                name="entry_price"
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="num mt-1.5"
              />
            </Field>
            <Field label="STOP LOSS">
              <input
                name="stop_loss"
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="num mt-1.5"
              />
            </Field>
            <Field label="TAKE PROFIT">
              <input
                name="take_profit"
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="num mt-1.5"
              />
            </Field>
            <Field label="HARGA EXIT">
              <input
                name="exit_price"
                type="number"
                step="any"
                defaultValue={trade?.exit_price ?? ""}
                className="num mt-1.5"
              />
            </Field>
            <Field label="LOT">
              <input
                name="lot_size"
                type="number"
                step="any"
                defaultValue={trade?.lot_size ?? ""}
                className="num mt-1.5"
              />
            </Field>
            <Field label="P/L (USD)" hint="Pakai tanda minus untuk loss.">
              <input
                name="profit_loss"
                type="number"
                step="any"
                required
                defaultValue={trade?.profit_loss ?? ""}
                className="num mt-1.5"
              />
            </Field>
          </div>
        </section>

        {/* STEP 3: Risiko */}
        <section
          className={`space-y-5 ${mode === "wizard" && step !== 3 ? "hidden" : ""}`}
        >
          <div className="border-b border-line pb-2 flex items-center justify-between">
            <h2 className="text-base font-medium">Risiko</h2>
            {autoRiskMoney && (
              <button
                type="button"
                onClick={applyAutoRiskMoney}
                className="num text-xs text-brass hover:underline"
              >
                Gunakan hitungan Risk (${autoRiskMoney})
              </button>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="R:R RENCANA" hint="Rencana, bukan hasil.">
              <input
                name="planned_rr"
                type="number"
                step="any"
                value={plannedRr}
                onChange={(e) => setPlannedRr(e.target.value)}
                className="num mt-1.5"
              />
            </Field>
            <Field label="RISK (%)">
              <input
                name="risk_percent"
                type="number"
                step="any"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="num mt-1.5"
              />
            </Field>
            <Field label="RISK ($)" hint="Isi ini supaya R aktual akurat.">
              <input
                name="risk_amount"
                type="number"
                step="any"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                className="num mt-1.5"
              />
            </Field>
          </div>
        </section>

        {/* STEP 4: Refleksi, Emosi & Alasan */}
        <section
          className={`space-y-5 ${mode === "wizard" && step !== 4 ? "hidden" : ""}`}
        >
          <h2 className="border-b border-line pb-2 text-base font-medium">Alasan dan emosi</h2>
          <div className="space-y-5">
            <Field label="ALASAN ENTRY">
              <textarea
                name="reason_entry"
                rows={3}
                defaultValue={trade?.reason_entry ?? ""}
                placeholder="Setup apa, level apa, kenapa masuk sekarang."
                className="mt-1.5"
              />
            </Field>

            <div>
              <span className="num text-[11px] text-muted">EMOSI</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {EMOTIONS.map((emotion) => (
                  <label key={emotion}>
                    <input
                      type="radio"
                      name="emotion"
                      value={emotion}
                      defaultChecked={trade?.emotion === emotion}
                      className="peer sr-only"
                    />
                    <span className="num block cursor-pointer border border-line px-2.5 py-1.5 text-xs text-muted peer-checked:border-brass peer-checked:text-brass">
                      {emotion}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Field label="CATATAN EMOSI">
              <textarea
                name="emotion_note"
                rows={2}
                defaultValue={trade?.emotion_note ?? ""}
                className="mt-1.5"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="KESALAHAN">
                <textarea
                  name="mistakes"
                  rows={2}
                  defaultValue={trade?.mistakes ?? ""}
                  className="mt-1.5"
                />
              </Field>
              <Field label="PELAJARAN">
                <textarea
                  name="lessons"
                  rows={2}
                  defaultValue={trade?.lessons ?? ""}
                  className="mt-1.5"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="followed_plan"
                  defaultChecked={trade?.followed_plan === true}
                  className="h-4 w-4"
                />
                <span className="text-sm">Mengikuti rencana</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="num text-[11px] text-muted">STATUS</span>
                <select name="status" defaultValue={trade?.status ?? "Done"} className="num w-auto">
                  <option value="Done">Done</option>
                  <option value="Open">Open</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* Buttons footer */}
        <div className="flex items-center justify-between border-t border-line pt-6">
          {mode === "wizard" ? (
            <>
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    className="num border border-line px-4 py-2 text-sm text-muted hover:text-paper"
                  >
                    &#8592; Sebelumnya
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                    className="num border border-brass bg-brass/10 px-5 py-2 text-sm text-brass hover:bg-brass/20"
                  >
                    Lanjut &#8594;
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="num bg-brass px-5 py-2.5 text-sm font-medium text-brass-ink"
                  >
                    {submitLabel}
                  </button>
                )}
                <Link href="/trades" className="num border border-line px-4 py-2 text-sm text-muted">
                  Batal
                </Link>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="num bg-brass px-5 py-2.5 text-sm font-medium text-brass-ink"
              >
                {submitLabel}
              </button>
              <Link href="/trades" className="num border border-line px-5 py-2.5 text-sm text-muted">
                Batal
              </Link>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
