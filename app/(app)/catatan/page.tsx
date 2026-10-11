import Link from "next/link";

import { saveDailyNote, saveWeeklyReview } from "@/app/actions/trades";
import { Empty, Field, PageHeader, Panel, PanelHead } from "@/components/ui";
import { dayKeyWib, formatDateWib, formatSignedMoney, pnlClass } from "@/lib/format";
import { getDailyNote, listDailyNotes, listTrades } from "@/lib/queries";
import { summarise } from "@/lib/stats";

type SearchParams = Promise<{ hari?: string; tab?: string; minggu?: string }>;

const MOODS = [
  { label: "Tenang", icon: "🧘" },
  { label: "Netral", icon: "⚖️" },
  { label: "Tergesa-gesa", icon: "⚡" },
  { label: "Frustrasi", icon: "🌧️" },
  { label: "Percaya diri", icon: "🎯" },
];

function getWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function shiftDay(currentDayStr: string, deltaDays: number): string {
  const parts = currentDayStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function CatatanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const currentTab = params.tab === "mingguan" ? "mingguan" : "harian";
  const today = dayKeyWib(new Date().toISOString());
  const day = params.hari ?? today;
  const currentWeek = params.minggu ?? getWeekKey(new Date());

  const prevDay = shiftDay(day, -1);
  const nextDay = shiftDay(day, 1);
  const isToday = day === today;

  const [note, notes, dayTrades, allTrades, weeklyNote] = await Promise.all([
    getDailyNote(day),
    listDailyNotes(50),
    listTrades({ from: day, to: day }),
    listTrades({}),
    currentTab === "mingguan" ? getDailyNote(`W-${currentWeek}`) : Promise.resolve(null),
  ]);

  const pnlByDay = new Map<string, number>();
  for (const trade of allTrades) {
    if (trade.status !== "Done") continue;
    const key = dayKeyWib(trade.exit_time ?? trade.entry_time);
    pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + trade.profit_loss);
  }

  const daySummary = summarise(dayTrades);
  const dailyJournalled = notes.filter(
    (entry) => !entry.day?.startsWith("W-") && (entry.morning_plan || entry.evening_review || entry.notes),
  );
  const weeklyJournalled = notes.filter((entry) => Boolean(entry.day?.startsWith("W-")));

  // Calculate stats for current week
  const weekTrades = allTrades.filter((t) => {
    const d = new Date(t.exit_time ?? t.entry_time);
    return getWeekKey(d) === currentWeek && t.status === "Done";
  });
  const weekSummary = summarise(weekTrades);

  return (
    <>
      <PageHeader
        title="Catatan & Review"
        lead="Refleksi harian dan evaluasi mingguan untuk mengasah psikologi & disiplin trading."
        action={
          <div className="grid grid-cols-2 w-full sm:w-auto border border-line p-0.5 text-xs bg-ink/50">
            <Link
              href="/catatan?tab=harian"
              className={`num py-2 px-3 text-center transition-colors ${
                currentTab === "harian"
                  ? "bg-raised text-brass font-medium"
                  : "text-muted hover:text-paper"
              }`}
            >
              Catatan Harian
            </Link>
            <Link
              href="/catatan?tab=mingguan"
              className={`num py-2 px-3 text-center transition-colors ${
                currentTab === "mingguan"
                  ? "bg-raised text-brass font-medium"
                  : "text-muted hover:text-paper"
              }`}
            >
              Review Mingguan
            </Link>
          </div>
        }
      />

      <div className="space-y-5 px-3 py-4 sm:px-6 md:space-y-6 md:px-8 pb-16">
        {currentTab === "harian" ? (
          <>
            {/* PANEL INPUT CATATAN HARIAN */}
            <Panel>
              {/* Header Tanggal & Navigasi Cepat */}
              <div className="border-b border-line px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-medium">
                    Catatan Harian · <span className="text-brass">{formatDateWib(`${day}T00:00:00+07:00`)}</span>
                  </h2>
                  <span className="num text-xs text-muted">
                    {isToday ? "Hari Ini" : day}
                  </span>
                </div>

                {/* Date Navigator Bar */}
                <div className="flex items-center gap-1 border border-line p-0.5 text-xs bg-ink/40">
                  <Link
                    href={`/catatan?tab=harian&hari=${prevDay}`}
                    className="num px-2.5 py-1 text-muted hover:text-paper transition-colors"
                    title="Hari sebelumnya"
                  >
                    ← Kemarin
                  </Link>
                  {!isToday && (
                    <Link
                      href={`/catatan?tab=harian&hari=${today}`}
                      className="num px-2.5 py-1 text-brass font-medium bg-brass/10 hover:bg-brass/20 transition-colors"
                      title="Kembali ke hari ini"
                    >
                      Hari Ini
                    </Link>
                  )}
                  <Link
                    href={`/catatan?tab=harian&hari=${nextDay}`}
                    className="num px-2.5 py-1 text-muted hover:text-paper transition-colors"
                    title="Hari berikutnya"
                  >
                    Besok →
                  </Link>
                </div>
              </div>

              <form action={saveDailyNote} className="space-y-5 px-4 py-5">
                <input type="hidden" name="day" value={day} />

                {/* Banner Hasil Trading Hari Terpilih */}
                <div className="rounded border border-line bg-surface-2/30 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="num text-xs text-muted tracking-wider">HASIL HARI INI:</span>
                    <span className={`num font-semibold text-base ${dayTrades.length ? pnlClass(daySummary.netPnl) : "text-muted"}`}>
                      {dayTrades.length ? formatSignedMoney(daySummary.netPnl) : "Belum ada trade"}
                    </span>
                    <span className="num text-xs text-muted">
                      ({dayTrades.length} trade)
                    </span>
                  </div>

                  <Link
                    href={`/input?tanggal=${day}`}
                    className="num text-xs rounded border border-brass/40 px-3 py-1.5 text-brass transition-colors hover:bg-brass/15 hover:border-brass"
                  >
                    + Catat trade tanggal ini
                  </Link>
                </div>

                <Field
                  label="RENCANA PAGI (MORNING PLAN)"
                  hint="Bias arah, level support/resistance kunci, batas resiko hari ini."
                >
                  <textarea
                    name="morning_plan"
                    rows={3}
                    defaultValue={note?.morning_plan ?? ""}
                    placeholder="Contoh: Fokus XAUUSD di sesi London. Hanya ambil buy jika breakout 2650 bertahan."
                    className="mt-1.5 text-sm"
                  />
                </Field>

                <Field
                  label="REVIEW MALAM (EVENING REVIEW)"
                  hint="Apa yang berjalan baik, apa kesalahan disiplin yang terjadi."
                >
                  <textarea
                    name="evening_review"
                    rows={3}
                    defaultValue={note?.evening_review ?? ""}
                    placeholder="Contoh: Disiplin cut loss di trade pertama. Namun sempat terpancing fomo di sesi New York."
                    className="mt-1.5 text-sm"
                  />
                </Field>

                {/* Mood Selector Mobile-Optimized */}
                <div>
                  <span className="num text-[11px] text-muted">KONDISI PSIKOLOGI (MOOD)</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MOODS.map((item) => (
                      <label key={item.label} className="cursor-pointer select-none">
                        <input
                          type="radio"
                          name="mood"
                          value={item.label}
                          defaultChecked={note?.mood === item.label}
                          className="peer sr-only"
                        />
                        <span className="num flex items-center gap-1.5 rounded border border-line px-3 py-2 text-xs text-muted transition-all peer-checked:border-brass peer-checked:bg-brass peer-checked:text-brass-ink peer-checked:font-semibold">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Field label="CATATAN BEBAS">
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={note?.notes ?? ""}
                    placeholder="Catatan tambahan, kondisi pasar, berita penting..."
                    className="mt-1.5 text-sm"
                  />
                </Field>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="num w-full sm:w-auto bg-brass py-3 px-6 text-sm font-semibold text-brass-ink shadow-md transition-opacity hover:opacity-90"
                  >
                    Simpan Catatan Harian
                  </button>
                </div>
              </form>
            </Panel>

            {/* RIWAYAT CATATAN HARIAN */}
            <Panel>
              <PanelHead
                title="Riwayat Catatan Harian"
                note={`${dailyJournalled.length} hari tercatat`}
              />
              {dailyJournalled.length === 0 ? (
                <Empty
                  title="Belum ada catatan"
                  hint="Catatan harian adalah bagian jurnal yang paling sering dilewatkan, padahal paling efektif untuk memperbaiki psikologi."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {dailyJournalled.map((entry) => {
                    const isSelected = entry.day === day;
                    return (
                      <li key={entry.id} className="transition-colors hover:bg-raised">
                        <Link
                          href={`/catatan?tab=harian&hari=${entry.day}`}
                          className={`block p-4 ${
                            isSelected ? "border-l-2 border-l-brass bg-brass/5" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="num text-sm font-medium">
                              {formatDateWib(`${entry.day}T00:00:00+07:00`)}
                              {entry.mood && (
                                <span className="ml-2.5 rounded bg-line px-2 py-0.5 text-[10px] text-paper">
                                  {entry.mood}
                                </span>
                              )}
                            </span>
                            <span className={`num text-sm font-semibold ${pnlClass(pnlByDay.get(entry.day) ?? 0)}`}>
                              {pnlByDay.has(entry.day)
                                ? formatSignedMoney(pnlByDay.get(entry.day) ?? 0)
                                : "tidak trading"}
                            </span>
                          </div>
                          {entry.morning_plan && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted leading-relaxed">
                              <span className="text-paper">Rencana:</span> {entry.morning_plan}
                            </p>
                          )}
                          {entry.evening_review && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                              <span className="text-paper">Evaluasi:</span> {entry.evening_review}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </>
        ) : (
          /* TAB MINGGUAN */
          <>
            <Panel>
              <PanelHead
                title={`Review Mingguan · Minggu ${currentWeek}`}
                note={`${weekTrades.length} trade dieksekusi`}
              />
              <form action={saveWeeklyReview} className="space-y-5 px-4 py-5">
                <input type="hidden" name="week_key" value={currentWeek} />

                {/* 3-Column Micro Cards for Week Stats */}
                <div className="grid grid-cols-3 gap-2 border-b border-line pb-4 text-center">
                  <div className="rounded border border-line bg-surface-2/30 p-2.5">
                    <span className="num text-[10px] text-muted block">TOTAL P/L</span>
                    <span className={`num text-sm sm:text-base font-semibold mt-0.5 block ${pnlClass(weekSummary.netPnl)}`}>
                      {formatSignedMoney(weekSummary.netPnl)}
                    </span>
                  </div>
                  <div className="rounded border border-line bg-surface-2/30 p-2.5">
                    <span className="num text-[10px] text-muted block">WIN RATE</span>
                    <span className="num text-sm sm:text-base font-semibold text-paper mt-0.5 block">
                      {weekSummary.winRate !== null ? `${weekSummary.winRate.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                  <div className="rounded border border-line bg-surface-2/30 p-2.5">
                    <span className="num text-[10px] text-muted block">TRADES</span>
                    <span className="num text-sm sm:text-base font-semibold text-paper mt-0.5 block">
                      {weekTrades.length}
                    </span>
                  </div>
                </div>

                <Field
                  label="HAL YANG BERJALAN BAIK (WINS)"
                  hint="Kepatuhan pada trading plan, eksekusi bersih, emosi terkontrol."
                >
                  <textarea
                    name="wins"
                    rows={3}
                    defaultValue={weeklyNote?.morning_plan ?? ""}
                    placeholder="Contoh: Disiplin cut loss sesuai rule, tidak ada revenge trade saat sesi London."
                    className="mt-1.5 text-sm"
                  />
                </Field>

                <Field
                  label="KESALAHAN & EVALUASI"
                  hint="Apa kesalahan terbesar minggu ini? Pola buruk apa yang berulang?"
                >
                  <textarea
                    name="mistakes"
                    rows={3}
                    defaultValue={weeklyNote?.evening_review ?? ""}
                    placeholder="Contoh: Terlalu cepat TP karena takut profit hilang, lot size sempat dinaikkan di Gold."
                    className="mt-1.5 text-sm"
                  />
                </Field>

                <Field
                  label="TARGET & FOKUS MINGGU DEPAN"
                  hint="Satu atau dua aturan disiplin yang harus ditaati tanpa kompromi."
                >
                  <textarea
                    name="goals"
                    rows={3}
                    defaultValue={weeklyNote?.notes ?? ""}
                    placeholder="Contoh: Maksimal 2 trade per hari, wajib tunggu candle close di H1."
                    className="mt-1.5 text-sm"
                  />
                </Field>

                <div>
                  <span className="num text-[11px] text-muted">RATING DISIPLIN MINGGU INI</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <label key={stars} className="cursor-pointer select-none">
                        <input
                          type="radio"
                          name="rating"
                          value={stars}
                          defaultChecked={weeklyNote?.mood?.includes(String(stars))}
                          className="peer sr-only"
                        />
                        <span className="num flex items-center justify-center rounded border border-line px-3 py-2 text-xs text-muted transition-all peer-checked:border-brass peer-checked:bg-brass peer-checked:text-brass-ink peer-checked:font-semibold">
                          {"★".repeat(stars)} {stars}/5
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="num w-full sm:w-auto bg-brass py-3 px-6 text-sm font-semibold text-brass-ink shadow-md transition-opacity hover:opacity-90"
                  >
                    Simpan Review Mingguan
                  </button>
                </div>
              </form>
            </Panel>

            <Panel>
              <PanelHead
                title="Riwayat Review Mingguan"
                note={`${weeklyJournalled.length} review`}
              />
              {weeklyJournalled.length === 0 ? (
                <Empty
                  title="Belum ada review mingguan"
                  hint="Luangkan 10 menit di akhir pekan untuk mengevaluasi minggu tradingmu."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {weeklyJournalled.map((entry) => (
                    <li key={entry.id} className="transition-colors hover:bg-raised">
                      <Link
                        href={`/catatan?tab=mingguan&minggu=${entry.day.replace("W-", "")}`}
                        className="block p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="num text-sm font-medium">
                            Minggu {entry.day.replace("W-", "")}
                          </span>
                          {entry.mood && (
                            <span className="num text-xs text-brass">{entry.mood}</span>
                          )}
                        </div>
                        {entry.morning_plan && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted leading-relaxed">
                            <span className="text-paper">Wins:</span> {entry.morning_plan}
                          </p>
                        )}
                        {entry.evening_review && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                            <span className="text-paper">Evaluasi:</span> {entry.evening_review}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
