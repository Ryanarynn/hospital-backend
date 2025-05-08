# Hospital Backend

Backend untuk sistem informasi manajemen rawat inap rumah sakit, dibangun menggunakan Node.js dan Express.js. Sistem ini mendukung pengelolaan tempat tidur, mutasi pasien, monitoring real-time, laporan (Excel, PDF, Word), otentikasi pengguna, dan log aktivitas.

## Fitur
- **Bed Management**: Melihat dan memperbarui status tempat tidur.
- **Mutasi Pasien**: Mencatat dan melihat riwayat mutasi pasien.
- **Laporan**: Menghasilkan laporan ketersediaan tempat tidur dalam format Excel, PDF, dan Word.
- **Otentikasi**: Login pengguna dengan username dan password.
- **Log Aktivitas**: Mencatat perubahan untuk akuntabilitas.

## Teknologi
- Node.js
- Express.js
- SQLite (database)
- Bcrypt (untuk otentikasi)
- ExcelJS, PDFKit, Docx (untuk laporan)

## Prasyarat
- Node.js (versi LTS)
- Git
- DB Browser for SQLite (opsional, untuk mengelola database)

## Instalasi
1. Clone repositori:
   ```bash
   git clone https://github.com/Ryanarynn/hospital-backend.git
   cd hospital-backend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Buat database SQLite (`hospital.db`):
   - Gunakan DB Browser for SQLite untuk menjalankan `docs/database.sql`.
4. Jalankan server:
   ```bash
   npm start
   ```
5. Server berjalan di `http://localhost:5000`.

## Pengujian
- Gunakan Postman untuk menguji API.
- Endpoint utama:
  - `POST /api/login`: Otentikasi pengguna.
  - `GET /api/beds`: Daftar tempat tidur.
  - `PUT /api/beds/:id`: Perbarui status tempat tidur.
  - `GET /api/mutations`: Riwayat mutasi.
  - `POST /api/mutations`: Buat mutasi baru.
  - `GET /api/reports/bed-availability/{excel|pdf|word}`: Unduh laporan.
- Lihat `API_DOCUMENTATION.md` untuk detail.

## Struktur Proyek
```
hospital-backend/
├── docs/
│   └── database.sql    # Skema dan data dummy
├── src/
│   ├── routes/api.js   # Endpoint API
│   ├── db.js          # Koneksi database
├── index.js           # Server utama
├── package.json       # Dependensi
├── .gitignore         # File yang diabaikan
├── API_DOCUMENTATION.md # Dokumentasi API
├── README.md          # Dokumentasi ini
```

## Catatan
- File `hospital.db` harus dibuat ulang menggunakan `docs/database.sql`.
- Password di tabel `Users` harus di-hash dengan bcrypt (lihat `hash-password.js`).

## Kontribusi
Buka issue atau pull request untuk saran/perbaikan.

## Lisensi
MIT License