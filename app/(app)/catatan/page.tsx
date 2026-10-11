import Link from "next/link";

import { saveDailyNote, saveWeeklyReview } from "@/app/actions/trades";
import { Empty, Field, PageHeader, Panel, PanelHead } from "@/components/ui";
import { dayKeyWib, formatDateWib, formatSignedMoney, pnlClass } from "@/lib/format";
import { getDailyNote, listDailyNotes, listTrades } from "@/lib/queries";
import { summarise } from "@/lib/stats";

type SearchParams = Promise<{ hari?: string; tab?: string; minggu?: string }>;

const MOODS = ["Tenang", "Netral", "Tergesa-gesa", "Frustrasi", "Percaya diri"];

function getWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
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
        lead="Refleksi harian dan evaluasi mingguan untuk menjaga disiplin trading."
        action={
          <div className="flex items-center gap-1 border border-line p-0.5 text-xs">
            <Link
              href="/catatan?tab=harian"
              className={`num px-3 py-1.5 transition-colors ${
                currentTab === "harian"
                  ? "bg-raised text-brass font-medium"
                  : "text-muted hover:text-paper"
              }`}
            >
              Catatan Harian
            </Link>
            <Link
              href="/catatan?tab=mingguan"
              className={`num px-3 py-1.5 transition-colors ${
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

      <div className="space-y-6 px-5 py-6 md:px-8">
        {currentTab === "harian" ? (
          <>
            <Panel>
              <PanelHead
                title={`Catatan harian · ${formatDateWib(`${day}T00:00:00+07:00`)}`}
                note={params.hari ? undefined : "hari ini"}
              />
              <form action={saveDailyNote} className="space-y-5 px-4 py-5">
                <input type="hidden" name="day" value={day} />

                <div className="num flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4 text-sm">
                  <span className="text-[11px] text-muted">HASIL HARI INI</span>
                  <span className={dayTrades.length ? pnlClass(daySummary.netPnl) : "text-muted"}>
                    {dayTrades.length ? formatSignedMoney(daySummary.netPnl) : "belum ada trade"}
                  </span>
                  <span className="text-[11px] text-muted">
                    {dayTrades.length} trade
                  </span>
                  <Link
                    href={`/input?tanggal=${day}`}
                    className="ml-auto text-xs text-brass hover:underline"
                  >
                    + catat trade tanggal ini
                  </Link>
                </div>

                <Field label="RENCANA PAGI" hint="Bias, level penting, batas risk hari ini.">
                  <textarea
                    name="morning_plan"
                    rows={4}
                    defaultValue={note?.morning_plan ?? ""}
                    className="mt-1.5"
                  />
                </Field>

                <Field label="REVIEW MALAM" hint="Apa yang berjalan baik, apa yang tidak.">
                  <textarea
                    name="evening_review"
                    rows={4}
                    defaultValue={note?.evening_review ?? ""}
                    className="mt-1.5"
                  />
                </Field>

                <div>
                  <span className="num text-[11px] text-muted">MOOD</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {MOODS.map((mood) => (
                      <label key={mood}>
                        <input
                          type="radio"
                          name="mood"
                          value={mood}
                          defaultChecked={note?.mood === mood}
                          className="peer sr-only"
                        />
                        <span className="num block cursor-pointer border border-line px-2.5 py-1.5 text-xs text-muted peer-checked:border-brass peer-checked:text-brass">
                          {mood}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Field label="CATATAN BEBAS">
                  <textarea name="notes" rows={3} defaultValue={note?.notes ?? ""} className="mt-1.5" />
                </Field>

                <button
                  type="submit"
                  className="num bg-brass px-5 py-2.5 text-sm font-medium text-brass-ink"
                >
                  Simpan catatan harian
                </button>
              </form>
            </Panel>

            <Panel>
              <PanelHead title="Riwayat catatan harian" note={`${dailyJournalled.length} hari tercatat`} />
              {dailyJournalled.length === 0 ? (
                <Empty
                  title="Belum ada catatan"
                  hint="Catatan harian adalah bagian jurnal yang paling sering dilewatkan, dan yang paling berguna saat evaluasi."
                />
              ) : (
                <ul>
                  {dailyJournalled.map((entry) => (
                    <li key={entry.id} className="ledger-row last:border-0">
                      <Link
                        href={`/catatan?tab=harian&hari=${entry.day}`}
                        className="block px-4 py-4 hover:bg-raised transition-colors"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="num text-sm">
                            {formatDateWib(`${entry.day}T00:00:00+07:00`)}
                            {entry.mood && <span className="ml-3 text-[11px] text-muted">{entry.mood}</span>}
                          </span>
                          <span className={`num text-sm ${pnlClass(pnlByDay.get(entry.day) ?? 0)}`}>
                            {pnlByDay.has(entry.day)
                              ? formatSignedMoney(pnlByDay.get(entry.day) ?? 0)
                              : "tidak trading"}
                          </span>
                        </div>
                        {entry.morning_plan && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted">{entry.morning_plan}</p>
                        )}
                        {entry.evening_review && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{entry.evening_review}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        ) : (
          /* TAB MINGGUAN */
          <>
            <Panel>
              <PanelHead
                title={`Review mingguan · Minggu ${currentWeek}`}
                note={`${weekTrades.length} trade dieksekusi`}
              />
              <form action={saveWeeklyReview} className="space-y-5 px-4 py-5">
                <input type="hidden" name="week_key" value={currentWeek} />

                <div className="num flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4 text-sm">
                  <div>
                    <span className="text-[11px] text-muted">TOTAL P/L MINGGU: </span>
                    <span className={`font-semibold ${pnlClass(weekSummary.netPnl)}`}>
                      {formatSignedMoney(weekSummary.netPnl)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted">WIN RATE: </span>
                    <span>
                      {weekSummary.winRate !== null ? `${weekSummary.winRate.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted">TOTAL TRADE: </span>
                    <span>{weekTrades.length} trade</span>
                  </div>
                </div>

                <Field label="HAL YANG BERJALAN BAIK (WINS)" hint="Kepatuhan pada trading plan, eksekusi bersih, emosi terkontrol.">
                  <textarea
                    name="wins"
                    rows={4}
                    defaultValue={weeklyNote?.morning_plan ?? ""}
                    placeholder="Contoh: Disiplin cut loss sesuai rule, tidak ada revenge trade saat sesi London."
                    className="mt-1.5"
                  />
                </Field>

                <Field label="KESALAHAN & EVALUASI" hint="Apa kesalahan terbesar minggu ini? Pola buruk apa yang berulang?">
                  <textarea
                    name="mistakes"
                    rows={4}
                    defaultValue={weeklyNote?.evening_review ?? ""}
                    placeholder="Contoh: FOMO di hari Rabu karena melewatkan breakout Gold."
                    className="mt-1.5"
                  />
                </Field>

                <Field label="TARGET & FOKUS MINGGU DEPAN" hint="Satu atau dua aturan disiplin yang harus ditaati tanpa kompromi.">
                  <textarea
                    name="goals"
                    rows={3}
                    defaultValue={weeklyNote?.notes ?? ""}
                    placeholder="Contoh: Maksimal 2 trade per hari, wajib tunggu candle close di H1."
                    className="mt-1.5"
                  />
                </Field>

                <div>
                  <span className="num text-[11px] text-muted">RATING DISIPLIN MINGGU INI</span>
                  <div className="mt-1.5 flex gap-2">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <label key={stars}>
                        <input
                          type="radio"
                          name="rating"
                          value={stars}
                          defaultChecked={weeklyNote?.mood?.includes(String(stars))}
                          className="peer sr-only"
                        />
                        <span className="num block cursor-pointer border border-line px-3 py-1.5 text-xs text-muted peer-checked:border-brass peer-checked:text-brass peer-checked:bg-brass/5">
                          {"★".repeat(stars)} {stars}/5
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="num bg-brass px-5 py-2.5 text-sm font-medium text-brass-ink"
                >
                  Simpan review mingguan
                </button>
              </form>
            </Panel>

            <Panel>
              <PanelHead title="Riwayat review mingguan" note={`${weeklyJournalled.length} review`} />
              {weeklyJournalled.length === 0 ? (
                <Empty
                  title="Belum ada review mingguan"
                  hint="Luangkan 10 menit di akhir pekan untuk mengevaluasi minggu tradingmu."
                />
              ) : (
                <ul>
                  {weeklyJournalled.map((entry) => (
                    <li key={entry.id} className="ledger-row last:border-0">
                      <Link
                        href={`/catatan?tab=mingguan&minggu=${entry.day.replace("W-", "")}`}
                        className="block px-4 py-4 hover:bg-raised transition-colors"
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
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted">
                            <span className="text-paper">Wins:</span> {entry.morning_plan}
                          </p>
                        )}
                        {entry.evening_review && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">
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
