# SCH Tracker 📅

**SCH Tracker** (Schedule Tracker) adalah aplikasi manajemen jadwal instalasi yang dirancang untuk mengotomatisasi proses input data dari chat/teks mentah menjadi jadwal yang terstruktur. Aplikasi ini mengintegrasikan database Supabase dan Google Calendar untuk efisiensi tim.

## 🚀 Fitur Utama

- **📝 Smart Parser**: Mengubah teks mentah (copy-paste dari WhatsApp/Spreadsheet) menjadi data formulir terstruktur secara otomatis. Mendeteksi:
  - Nama Outlet & Owner
  - Nomor Telepon & Invoice
  - Jenis Layanan (Starter, Advance, Prime, dll)
  - Alamat & Tipe Outlet (Online/Offline)
- **📅 Integrasi Google Calendar**:
  - Otomatis membuat event di Google Calendar.
  - Generate link **Google Meet** instan untuk jadwal Online.
  - Notifikasi email & popup otomatis untuk peserta.
- **💾 Database Supabase**: Penyimpanan data jadwal yang aman dan realtime.
- **🔒 Autentikasi**: Login menggunakan Google OAuth untuk akses aman.
- **📊 Manajemen Data**: Validasi input otomatis untuk mencegah kesalahan data.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Calendar**: Google Calendar API
- **UI Components**: Radix UI & Lucide Icons

## ⚙️ Cara Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/zulvanavito/schtracker.git
   cd schtracker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # atau
   yarn install
   ```

3. **Konfigurasi Environment**
   Buat file `.env.local` dan isi dengan kredensial berikut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # Hati-hati, gunakan hanya di server
   ```

4. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser.

## 📝 Format Input Parser

Aplikasi ini dapat membaca format teks seperti berikut:

```text
Nama Outlet: Kopi Kenangan
Nama Owner: Budi Santoso
081234567890
INV/2024/001
SCH/LEADS/001
Jl. Sudirman No. 123, Jakarta
Tipe: Online
Langganan: Starter Basic
```

## 👥 Kontributor

- **Zulvan Avito Anwari** - *Initial Work*
