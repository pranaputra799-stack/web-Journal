"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Field } from "@/components/ui";
import { cleanReasonText, parseEntryModel, utcIsoToWibInput } from "@/lib/format";
import {
  DIRECTIONS,
  EMOTIONS,
  ENTRY_MODELS,
  RESULTS,
  type Account,
  type EntryModel,
  type Trade,
} from "@/lib/types";

const STEP_TITLES: Record<number, string> = {
  1: "Info Dasar & Waktu",
  2: "Harga, Lot & P/L",
  3: "Risiko & R:R",
  4: "Alasan, Emosi & Evaluasi",
};

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
  const [selectedDirection, setSelectedDirection] = useState(trade?.direction ?? "Buy");
  const [selectedResult, setSelectedResult] = useState(trade?.result ?? "Manual");
  const [entryTime, setEntryTime] = useState<string>(
    trade?.entry_time ? utcIsoToWibInput(trade.entry_time) : "",
  );
  const [exitTime, setExitTime] = useState<string>(
    trade?.exit_time ? utcIsoToWibInput(trade.exit_time) : "",
  );

  const [entryPrice, setEntryPrice] = useState<string>(
    trade?.entry_price ? String(trade.entry_price) : "",
  );
  const [stopLoss, setStopLoss] = useState<string>(
    trade?.stop_loss ? String(trade.stop_loss) : "",
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    trade?.take_profit ? String(trade.take_profit) : "",
  );
  const [plannedRr, setPlannedRr] = useState<string>(
    trade?.planned_rr ? String(trade.planned_rr) : "",
  );
  const [riskPercent, setRiskPercent] = useState<string>(
    trade?.risk_percent ? String(trade.risk_percent) : "",
  );
  const [riskAmount, setRiskAmount] = useState<string>(
    trade?.risk_amount ? String(trade.risk_amount) : "",
  );

  // Entry model parsed from existing reason_entry (e.g. "[Model: Reversal] ...")
  const [entryModel, setEntryModel] = useState<EntryModel | null>(
    trade?.reason_entry ? parseEntryModel(trade.reason_entry) : null,
  );

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

  const setNowForEntry = () => {
    setEntryTime(utcIsoToWibInput(new Date().toISOString()));
  };

  const setNowForExit = () => {
    setExitTime(utcIsoToWibInput(new Date().toISOString()));
  };

  return (
    <div className="space-y-5 px-3 py-4 sm:px-6 md:space-y-6 md:px-8 pb-16">
      {/* Switcher: Form Penuh vs Wizard */}
      <div className="flex flex-col gap-2.5 border-b border-line pb-4">
        <div className="grid grid-cols-2 w-full sm:w-auto border border-line p-0.5 text-xs bg-ink/60">
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`num py-2 text-center font-medium transition-colors ${
              mode === "full" ? "bg-raised text-brass" : "text-muted hover:text-paper"
            }`}
          >
            Formulir Lengkap
          </button>
          <button
            type="button"
            onClick={() => setMode("wizard")}
            className={`num py-2 text-center font-medium transition-colors ${
              mode === "wizard" ? "bg-raised text-brass" : "text-muted hover:text-paper"
            }`}
          >
            Mode Bertahap (Wizard)
          </button>
        </div>

        {mode === "wizard" && (
          <div className="flex items-center justify-between text-xs text-muted pt-1">
            <span className="truncate">
              Langkah <strong className="text-brass">{step}</strong> dari 4:{" "}
              <span className="text-paper">{STEP_TITLES[step]}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStep(s)}
                  className={`h-2 rounded-full transition-all ${
                    s === step
                      ? "w-6 bg-brass"
                      : s < step
                      ? "w-2.5 bg-brass/40"
                      : "w-2 bg-line"
                  }`}
                  aria-label={`Ke langkah ${s}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form action={action} className="space-y-6">
        {/* STEP 1: Info Dasar & Waktu */}
        <section
          className={`space-y-4 rounded border border-line/60 bg-surface-2/20 p-4 sm:p-5 ${
            mode === "wizard" && step !== 1 ? "hidden" : ""
          }`}
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-brass uppercase">
              1. Info Dasar & Waktu
            </h2>
            <span className="text-[11px] text-muted">Pasar & Jadwal</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PAIR / INSTRUMEN" hint="Contoh: XAUUSD, EURUSD, BTCUSD.">
              <input
                name="pair"
                required
                defaultValue={trade?.pair ?? ""}
                placeholder="XAUUSD"
                className="num mt-1.5 uppercase tracking-wider font-semibold"
              />
            </Field>

            <Field label="AKUN TRADING">
              <select
                name="account_id"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="num mt-1.5"
              >
                <option value="">Tanpa akun</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </Field>

            {/* Arah: Segmented tactile buttons Buy / Sell */}
            <div>
              <span className="num text-[11px] text-muted">ARAH TRANSAKSI</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {DIRECTIONS.map((direction) => {
                  const isBuy = direction === "Buy";
                  const checked = selectedDirection === direction;
                  return (
                    <label key={direction} className="relative block">
                      <input
                        type="radio"
                        name="direction"
                        value={direction}
                        checked={checked}
                        onChange={() => setSelectedDirection(direction)}
                        className="peer sr-only"
                      />
                      <span
                        className={`num flex items-center justify-center gap-2 cursor-pointer rounded border py-2.5 px-3 text-sm transition-all ${
                          checked
                            ? isBuy
                              ? "border-profit bg-profit/15 text-profit font-semibold shadow-sm"
                              : "border-loss bg-loss/15 text-loss font-semibold shadow-sm"
                            : "border-line text-muted hover:border-line-strong hover:text-paper"
                        }`}
                      >
                        <span className="text-base leading-none">
                          {isBuy ? "▲" : "▼"}
                        </span>
                        <span>{direction.toUpperCase()}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Hasil: Segmented pills TP / SL / BE / Manual */}
            <div>
              <span className="num text-[11px] text-muted">HASIL EKSEKUSI</span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {RESULTS.map((result) => {
                  const checked = selectedResult === result;
                  return (
                    <label key={result} className="relative block">
                      <input
                        type="radio"
                        name="result"
                        value={result}
                        checked={checked}
                        onChange={() => setSelectedResult(result)}
                        className="peer sr-only"
                      />
                      <span
                        className={`num flex items-center justify-center cursor-pointer rounded border py-2 px-1 text-xs text-center transition-all ${
                          checked
                            ? "border-brass bg-brass text-brass-ink font-semibold"
                            : "border-line text-muted hover:text-paper"
                        }`}
                      >
                        {result}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Waktu Entry */}
            <div>
              <div className="flex items-center justify-between">
                <span className="num text-[11px] text-muted">WAKTU ENTRY (WIB)</span>
                <button
                  type="button"
                  onClick={setNowForEntry}
                  className="num text-[10px] text-brass hover:underline"
                >
                  + Set Sekarang
                </button>
              </div>
              <input
                type="datetime-local"
                name="entry_time"
                required
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="num mt-1.5"
              />
            </div>

            {/* Waktu Exit */}
            <div>
              <div className="flex items-center justify-between">
                <span className="num text-[11px] text-muted">WAKTU EXIT (WIB)</span>
                <button
                  type="button"
                  onClick={setNowForExit}
                  className="num text-[10px] text-brass hover:underline"
                >
                  + Set Sekarang
                </button>
              </div>
              <input
                type="datetime-local"
                name="exit_time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                placeholder="Kosongkan jika masih Open"
                className="num mt-1.5"
              />
            </div>
          </div>
        </section>

        {/* STEP 2: Harga, Eksekusi & R:R */}
        <section
          className={`space-y-4 rounded border border-line/60 bg-surface-2/20 p-4 sm:p-5 ${
            mode === "wizard" && step !== 2 ? "hidden" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-brass uppercase">
              2. Harga, Lot & Profit/Loss
            </h2>
            {autoRr && (
              <button
                type="button"
                onClick={applyAutoRr}
                className="num rounded bg-brass/15 border border-brass/40 px-2 py-0.5 text-xs text-brass hover:bg-brass/25 transition-colors"
              >
                Pakai Hitungan R:R ({autoRr}R) ↓
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Field label="HARGA ENTRY">
              <input
                name="entry_price"
                type="number"
                step="any"
                inputMode="decimal"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className="num mt-1.5"
              />
            </Field>

            <Field label="STOP LOSS">
              <input
                name="stop_loss"
                type="number"
                step="any"
                inputMode="decimal"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                className="num mt-1.5"
              />
            </Field>

            <Field label="TAKE PROFIT">
              <input
                name="take_profit"
                type="number"
                step="any"
                inputMode="decimal"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00"
                className="num mt-1.5"
              />
            </Field>

            <Field label="HARGA EXIT">
              <input
                name="exit_price"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={trade?.exit_price ?? ""}
                placeholder="0.00"
                className="num mt-1.5"
              />
            </Field>

            <Field label="LOT SIZE" hint="Ukuran volume posisi.">
              <input
                name="lot_size"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={trade?.lot_size ?? ""}
                placeholder="0.10"
                className="num mt-1.5"
              />
            </Field>

            <Field label="PROFIT / LOSS (USD)" hint="Gunakan tanda minus (-) untuk loss.">
              <input
                name="profit_loss"
                type="number"
                step="any"
                inputMode="decimal"
                required
                defaultValue={trade?.profit_loss ?? ""}
                placeholder="+50.00 atau -25.00"
                className="num mt-1.5 font-semibold text-paper"
              />
            </Field>
          </div>
        </section>

        {/* STEP 3: Risiko */}
        <section
          className={`space-y-4 rounded border border-line/60 bg-surface-2/20 p-4 sm:p-5 ${
            mode === "wizard" && step !== 3 ? "hidden" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-brass uppercase">
              3. Parameter Risiko
            </h2>
            {autoRiskMoney && (
              <button
                type="button"
                onClick={applyAutoRiskMoney}
                className="num rounded bg-brass/15 border border-brass/40 px-2 py-0.5 text-xs text-brass hover:bg-brass/25 transition-colors"
              >
                Pakai Nominal Risk (${autoRiskMoney}) ↓
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="R:R RENCANA" hint="Target ratio sebelum entry.">
              <input
                name="planned_rr"
                type="number"
                step="any"
                inputMode="decimal"
                value={plannedRr}
                onChange={(e) => setPlannedRr(e.target.value)}
                placeholder="2.0"
                className="num mt-1.5"
              />
            </Field>

            <Field label="RISK (%)" hint="Persen modal yang dipertaruhkan.">
              <input
                name="risk_percent"
                type="number"
                step="any"
                inputMode="decimal"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                placeholder="1.0"
                className="num mt-1.5"
              />
            </Field>

            <Field label="RISK AMOUNT ($)" hint="Nominal uang untuk kalkulasi R nyata.">
              <input
                name="risk_amount"
                type="number"
                step="any"
                inputMode="decimal"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                placeholder="50"
                className="num mt-1.5"
              />
            </Field>
          </div>
        </section>

        {/* STEP 4: Refleksi, Emosi & Alasan */}
        <section
          className={`space-y-4 rounded border border-line/60 bg-surface-2/20 p-4 sm:p-5 ${
            mode === "wizard" && step !== 4 ? "hidden" : ""
          }`}
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-brass uppercase">
              4. Alasan, Emosi & Evaluasi
            </h2>
            <span className="text-[11px] text-muted">Psikologi & Disiplin</span>
          </div>

          <div className="space-y-4">
            {/* Entry Model selector */}
            <div>
              <span className="num text-[11px] text-muted">MODEL ENTRY</span>
              <input type="hidden" name="entry_model" value={entryModel ?? ""} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ENTRY_MODELS.map((model) => {
                  const active = entryModel === model;
                  const icon =
                    model === "Continuation"
                      ? "➡"
                      : model === "Reversal"
                      ? "↩"
                      : "⚡";
                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setEntryModel(active ? null : model)}
                      className={`num flex items-center justify-center gap-1.5 cursor-pointer rounded border py-2.5 px-2 text-xs text-center transition-all ${
                        active
                          ? "border-brass bg-brass text-brass-ink font-semibold shadow-sm"
                          : "border-line text-muted hover:border-line-strong hover:text-paper"
                      }`}
                    >
                      <span className="text-base leading-none">{icon}</span>
                      <span>{model}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="ALASAN ENTRY" hint="Setup apa, level apa, konfirmasi apa.">
              <textarea
                name="reason_entry"
                rows={3}
                defaultValue={trade?.reason_entry ? cleanReasonText(trade.reason_entry) : ""}
                placeholder="Contoh: Rejection di support H4, konfirmasi candle engulfing M15."
                className="mt-1.5 text-sm"
              />
            </Field>

            {/* Emosi Selector */}
            <div>
              <span className="num text-[11px] text-muted">EMOSI SAAT EKSEKUSI</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOTIONS.map((emotion) => (
                  <label key={emotion} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="emotion"
                      value={emotion}
                      defaultChecked={trade?.emotion === emotion}
                      className="peer sr-only"
                    />
                    <span className="num inline-block rounded border border-line px-3 py-2 text-xs text-muted transition-all peer-checked:border-brass peer-checked:bg-brass peer-checked:text-brass-ink peer-checked:font-semibold">
                      {emotion}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Field label="CATATAN EMOSI / PSIKOLOGI">
              <textarea
                name="emotion_note"
                rows={2}
                defaultValue={trade?.emotion_note ?? ""}
                placeholder="Apa yang dirasakan saat posisi floating atau saat cut loss..."
                className="mt-1.5 text-sm"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="KESALAHAN (MISTAKES)">
                <textarea
                  name="mistakes"
                  rows={2}
                  defaultValue={trade?.mistakes ?? ""}
                  placeholder="Misal: Geser SL ke arah berlawanan, masuk terlalu cepat."
                  className="mt-1.5 text-sm"
                />
              </Field>
              <Field label="PELAJARAN (LESSONS)">
                <textarea
                  name="lessons"
                  rows={2}
                  defaultValue={trade?.lessons ?? ""}
                  placeholder="Pelajaran penting yang dipelajari untuk trade berikutnya."
                  className="mt-1.5 text-sm"
                />
              </Field>
            </div>

            {/* Plan adherence & Status */}
            <div className="grid gap-3 rounded border border-line bg-ink/50 p-3 sm:grid-cols-2 sm:items-center">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="followed_plan"
                  defaultChecked={trade?.followed_plan === true}
                  className="h-5 w-5 accent-brass"
                />
                <span className="text-sm font-medium">Mengikuti Trading Plan</span>
              </label>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="num text-xs text-muted">STATUS POSISI:</span>
                <select
                  name="status"
                  defaultValue={trade?.status ?? "Done"}
                  className="num w-auto py-1 px-3"
                >
                  <option value="Done">Done (Selesai)</option>
                  <option value="Open">Open (Masih Berjalan)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Buttons Footer */}
        <div className="border-t border-line pt-4">
          {mode === "wizard" ? (
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
              <div>
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    className="num w-full sm:w-auto border border-line px-4 py-2.5 text-sm text-muted hover:text-paper"
                  >
                    ← Sebelumnya
                  </button>
                ) : (
                  <Link
                    href="/trades"
                    className="num inline-block text-center w-full sm:w-auto border border-line px-4 py-2.5 text-sm text-muted"
                  >
                    Batal
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                    className="num w-full sm:w-auto bg-brass px-5 py-2.5 text-sm font-semibold text-brass-ink"
                  >
                    Lanjut →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="num w-full sm:w-auto bg-brass px-6 py-2.5 text-sm font-semibold text-brass-ink"
                  >
                    {submitLabel}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <Link
                href="/trades"
                className="num text-center border border-line px-5 py-2.5 text-sm text-muted hover:text-paper"
              >
                Batal
              </Link>
              <button
                type="submit"
                className="num w-full sm:w-auto bg-brass px-6 py-3 text-sm font-semibold text-brass-ink shadow-md"
              >
                {submitLabel}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
