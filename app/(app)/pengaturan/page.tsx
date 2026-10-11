import { createAccount, deleteAccount, updateAccount } from "@/app/actions/accounts";
import { CsvImporter } from "@/components/csv-importer";
import { Field, PageHeader, Panel, PanelHead } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { listAccounts } from "@/lib/queries";
import { ACCOUNT_TYPES } from "@/lib/types";

export default async function PengaturanPage() {
  const accounts = await listAccounts();

  return (
    <>
      <PageHeader
        title="Pengaturan"
        lead="Akun trading, saldo awal, dan batas aturan prop firm. Saldo awal dipakai untuk menghitung drawdown persen dan R aktual."
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        <Panel>
          <PanelHead title="Akun trading" note={`${accounts.length} akun`} />
          {accounts.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted">
              Belum ada akun. Tambahkan satu di bawah supaya statistik berbasis
              persen dan R bisa dihitung.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {accounts.map((account) => {
                const save = updateAccount.bind(null, account.id);
                const remove = deleteAccount.bind(null, account.id);
                return (
          <form key={account.id} action={save} className="grid gap-3 px-4 py-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    <Field label="NAMA">
                      <input name="name" defaultValue={account.name} className="num mt-1.5" />
                    </Field>
                    <Field label="TIPE">
                      <select name="type" defaultValue={account.type} className="num mt-1.5">
                        {ACCOUNT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="SALDO AWAL" hint={formatMoney(account.starting_balance)}>
                      <input
                        name="starting_balance"
                        type="number"
                        step="any"
                        defaultValue={account.starting_balance}
                        className="num mt-1.5"
                      />
                    </Field>
                    <Field label="MATA UANG">
                      <input name="currency" defaultValue={account.currency} className="num mt-1.5" />
                    </Field>
                    <Field label="TARGET PROFIT">
                      <input name="profit_target" type="number" step="any" defaultValue={account.profit_target ?? ""} className="num mt-1.5" />
                    </Field>
                    <Field label="MAX DAILY LOSS">
                      <input name="max_daily_loss" type="number" step="any" defaultValue={account.max_daily_loss ?? ""} className="num mt-1.5" />
                    </Field>
                    <Field label="MAX TOTAL LOSS">
                      <input name="max_total_loss" type="number" step="any" defaultValue={account.max_total_loss ?? ""} className="num mt-1.5" />
                    </Field>
                    <Field label="TANGGAL MULAI">
                      <input name="start_date" type="date" defaultValue={account.start_date ?? ""} className="num mt-1.5" />
                    </Field>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="active" defaultChecked={account.active} className="h-4 w-4" />
                      <span className="text-sm">Aktif</span>
                    </label>
                    <div className="flex items-end gap-2 md:col-span-3 md:justify-end">
                      <button type="submit" className="num border border-brass px-4 py-2 text-sm text-brass">
                        Simpan
                      </button>
                      <button
                        type="submit"
                        formAction={remove}
                        className="num border border-line px-4 py-2 text-sm text-muted hover:border-loss hover:text-loss"
                      >
                        Hapus
                      </button>
                    </div>
                  </form>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead title="Tambah akun" />
          <form action={createAccount} className="grid gap-3 px-4 py-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            <Field label="NAMA" hint="Contoh: Funded 50K.">
              <input name="name" required className="num mt-1.5" />
            </Field>
            <Field label="TIPE">
              <select name="type" defaultValue="funded" className="num mt-1.5">
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SALDO AWAL">
              <input name="starting_balance" type="number" step="any" defaultValue={50000} className="num mt-1.5" />
            </Field>
            <Field label="MATA UANG">
              <input name="currency" defaultValue="USD" className="num mt-1.5" />
            </Field>
            <Field label="TARGET PROFIT">
              <input name="profit_target" type="number" step="any" className="num mt-1.5" />
            </Field>
            <Field label="MAX DAILY LOSS">
              <input name="max_daily_loss" type="number" step="any" className="num mt-1.5" />
            </Field>
            <Field label="MAX TOTAL LOSS">
              <input name="max_total_loss" type="number" step="any" className="num mt-1.5" />
            </Field>
            <div className="flex items-end">
              <button type="submit" className="num w-full bg-brass px-4 py-2.5 text-sm font-medium text-brass-ink">
                Tambah akun
              </button>
            </div>
          </form>
        </Panel>

        <Panel>
          <PanelHead
            title="Backup dan Ekspor Data"
            note="Simpan salinan offline data tradingmu"
          />
          <div className="space-y-4 px-4 py-5 md:px-6">
            <p className="text-sm text-muted">
              File cadangan disimpan secara mandiri dan terpisah dari server cloud. Disarankan untuk mengekspor atau membuat cadangan rutin setiap minggu atau akhir bulan.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1: Trades CSV */}
              <div className="flex flex-col justify-between rounded border border-line bg-surface-2/40 p-4 transition-colors hover:border-line-strong">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="num text-xs font-semibold tracking-wider text-brass">
                      CSV SPREADSHEET
                    </span>
                    <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-mono text-brass">
                      .CSV
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-medium text-paper">
                    Ekspor Riwayat Trades
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Rekapan seluruh transaksi lengkap dengan nama akun, harga, lot, P/L, R:R aktual, emosi, dan catatan evaluasi. Siap diolah di Excel / Google Sheets.
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <a
                    href="/api/export?type=trades"
                    className="num flex w-full items-center justify-center gap-2 rounded border border-line px-3 py-2 text-xs font-medium text-paper transition-colors hover:border-brass hover:text-brass"
                  >
                    <span>Unduh CSV Trades</span>
                    <span className="font-mono text-[10px] text-muted">↓</span>
                  </a>
                </div>
              </div>

              {/* Card 2: Notes CSV */}
              <div className="flex flex-col justify-between rounded border border-line bg-surface-2/40 p-4 transition-colors hover:border-line-strong">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="num text-xs font-semibold tracking-wider text-muted">
                      CSV JURNAL
                    </span>
                    <span className="rounded bg-line px-1.5 py-0.5 text-[10px] font-mono text-paper">
                      .CSV
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-medium text-paper">
                    Ekspor Catatan Harian
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Log harian psikologi trading: rating mood, rencana pagi (morning plan), evaluasi review sore, dan catatan harian per tanggal.
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <a
                    href="/api/export?type=notes"
                    className="num flex w-full items-center justify-center gap-2 rounded border border-line px-3 py-2 text-xs font-medium text-paper transition-colors hover:border-brass hover:text-brass"
                  >
                    <span>Unduh CSV Catatan</span>
                    <span className="font-mono text-[10px] text-muted">↓</span>
                  </a>
                </div>
              </div>

              {/* Card 3: Full JSON Backup */}
              <div className="flex flex-col justify-between rounded border border-brass/50 bg-brass/5 p-4 transition-colors hover:border-brass sm:col-span-2 lg:col-span-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="num text-xs font-semibold tracking-wider text-brass">
                      FULL BACKUP
                    </span>
                    <span className="rounded bg-brass px-1.5 py-0.5 text-[10px] font-mono font-medium text-brass-ink">
                      .JSON
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-medium text-paper">
                    Cadangan Lengkap Database
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Cadangan utuh seluruh database: seluruh akun, riwayat trade, dan catatan harian dalam format JSON terstruktur. Sangat disarankan untuk arsip utama.
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <a
                    href="/api/export?format=json"
                    className="num flex w-full items-center justify-center gap-2 rounded bg-brass px-3 py-2 text-xs font-semibold text-brass-ink transition-opacity hover:opacity-90"
                  >
                    <span>Cadangkan Penuh (JSON)</span>
                    <span className="font-mono text-[10px]">↓</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Impor dari Notion atau Spreadsheet" />
          <CsvImporter accounts={accounts} />
        </Panel>

        <Panel>
          <PanelHead title="Zona waktu dan mata uang" />
          <div className="px-4 py-5 text-sm text-muted">
            <p>
              Tampilan memakai <span className="num text-paper">Asia/Jakarta (WIB)</span> dan mata uang{" "}
              <span className="num text-paper">USD</span>, sesuai default di rencana.
              Trade masuk ke hari berdasarkan waktu <span className="num text-paper">EXIT</span>.
            </p>
            <p className="mt-3">
              Jam sesi pasar: Asia 06.00-15.00, London 14.00-23.00, New York
              19.00-04.00 WIB. Ini perkiraan kasar dan tumpang tindih
              diperbolehkan.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
