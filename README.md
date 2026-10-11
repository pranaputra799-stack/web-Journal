# Jurnal Trading

Jurnal trading pribadi untuk satu orang. Catat trade, tinjau statistik, jaga
disiplin. Rencana lengkapnya ada di `rencana-website-jurnal-trading.txt`.

Tumpukan: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4,
Supabase (Postgres, Auth, Storage privat), dengan Vercel sebagai hosting.

Bahasa antarmuka Indonesia. Zona waktu WIB. Mata uang USD.

## Yang harus dilakukan sebelum menjalankan

1. Buat project di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Buka SQL Editor, tempel seluruh isi `supabase/schema.sql`, lalu jalankan.
   Skrip ini membuat tabel, menyalakan Row Level Security, dan menyiapkan
   bucket `screenshots` yang privat.
3. Buka Project Settings > API, salin Project URL dan anon public key.
4. Buat file `.env.local` di root:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   Kunci anon aman dipakai di browser karena RLS membatasi datanya. Jangan
   pernah menaruh service_role key di sini.

5. Buat akun login di Authentication > Users. Pendaftaran publik sebaiknya
   dimatikan setelah akunmu ada.
6. Jalankan `npm run dev`, lalu buka http://localhost:3000.

Sebelum langkah 4 selesai, aplikasi menampilkan halaman petunjuk setup alih-alih
error.

## Perintah

```
npm run dev      # server pengembangan
npm run build    # build produksi
npm start        # jalankan hasil build
npx tsc --noEmit # cek tipe
npm run lint     # eslint
```

### Mode pratinjau (tanpa Supabase)

```
DEMO_MODE=1 npm run dev
```

Halaman terbuka dengan data contoh dari `lib/demo.ts`, tanpa login dan tanpa
koneksi database. Gunanya untuk menilai tata letak sebelum Supabase
disambungkan. Datanya deterministik, jadi tampilannya sama di setiap run.

Selama mode ini hidup:

- Setiap pembacaan data dilayani dari `lib/demo.ts`, bukan dari Supabase.
- Setiap penulisan diabaikan, jadi database asli tidak pernah tersentuh.
- Ada bilah peringatan di atas halaman supaya data contoh tidak dikira datamu.

Matikan dengan menjalankan `npm run dev` seperti biasa. Mode ini tidak aktif di
produksi karena `DEMO_MODE` tidak di-set di sana, dan flag-nya sengaja bukan
`NEXT_PUBLIC_` supaya tidak pernah ikut ke bundle browser.

## Struktur

```
app/
  (app)/            halaman yang butuh login, memakai satu kerangka layout
    dashboard/      kartu ringkasan, kurva equity, drawdown, P/L harian
    trades/         daftar, detail, dan edit trade
    input/          form catat trade
    calendar/       kalender bulanan dengan ringkasan mingguan
    statistik/      seluruh breakdown dan analisis emosi
    catatan/        catatan harian
    pengaturan/     akun trading dan ekspor
  actions/          server actions untuk trade, catatan, akun
  api/export/       unduh semua trade sebagai CSV
  login/            masuk dengan password atau tautan email
lib/
  stats.ts          mesin statistik, fungsi murni
  queries.ts        pembacaan data dari Supabase
  format.ts         format uang, tanggal, dan konversi WIB
  supabase/         klien browser, klien server, penyegar sesi
supabase/schema.sql skema database
proxy.ts            penyegar sesi (pengganti middleware di Next.js 16)
```

## Keputusan teknis

**Cache Components dimatikan.** Setiap halaman terikat ke pengguna yang sedang
masuk, jadi tidak ada shell statis yang berguna. Menyalakannya hanya menambah
kewajiban membungkus setiap pembacaan runtime dengan Suspense. Nyalakan lagi
kalau nanti ada halaman publik.

**`proxy.ts`, bukan `middleware.ts`.** Next.js 16 mengganti nama konvensi itu.

**Zona waktu.** Database menyimpan UTC. Antarmuka menampilkan WIB, yaitu UTC+7
tanpa daylight saving, jadi offset tetap dipakai dan tidak perlu pustaka zona
waktu. Trade masuk ke hari berdasarkan waktu EXIT, sesuai default di rencana,
dan ini bisa diubah nanti.

**R aktual.** Kalau `risk_amount` terisi, R dihitung dari P/L dibagi risk.
Kalau kosong, dipakai perkiraan SL = -1R dan TP = +R:R rencana, dan angkanya
ditandai sebagai perkiraan.

**Sampel kecil.** Statistik dari kurang dari 30 trade diberi label, supaya
angka yang belum stabil tidak disalahartikan sebagai tren.

**Screenshot.** Disimpan di bucket privat dan ditampilkan lewat tautan
bertanda tangan yang berlaku satu jam.

## Sudah jadi dan belum

Sudah jalan: skema, login, kerangka aplikasi, input trade, daftar dan detail
trade, screenshot, catatan harian, kalender, dasbor, statistik lengkap,
pengaturan akun, ekspor CSV.

Belum: form wizard ala Google Form, duplikat trade, impor dari Notion, PWA
yang dipoles, fitur akun funded (pelacak limit harian dan target profit), review
mingguan, dan bot Telegram.

## Lisensi

MIT.
