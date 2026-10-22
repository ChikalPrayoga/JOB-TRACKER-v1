# Job Application Tracker

Aplikasi web pelacak lamaran pekerjaan yang dibangun di atas **Google Apps Script (GAS)**. Aplikasi ini membantu Anda mencatat, memantau, dan mengelola seluruh proses lamaran kerja — mulai dari mengirim lamaran, screening, interview, hingga menerima tawaran (offer) atau ditolak (rejected).

Seluruh antarmuka (frontend) berada dalam satu file `index.html`, sementara `Kode.js` berfungsi sebagai tempat untuk kode backend Google Apps Script (`doGet` / `doPost`) yang terhubung ke Google Spreadsheet sebagai basis data.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Proyek](#struktur-proyek)
- [Data Model / Struktur Field](#data-model--struktur-field)
- [Status Lamaran](#status-lamaran)
- [API Backend (Google Apps Script)](#api-backend-google-apps-script)
- [Konfigurasi](#konfigurasi)
- [Cara Deployment](#cara-deployment)
- [Panduan Penggunaan](#panduan-penggunaan)
- [Catatan](#catatan)

---

## Fitur Utama

- **Dashboard Metrik** — Menampilkan ringkasan jumlah lamaran: Total, Aktif, Interview, Offered, dan Rejected secara real-time.
- **CRUD Lamaran** — Tambah, ubah, dan hapus data lamaran pekerjaan melalui modal form.
- **Pencarian & Filter** — Cari berdasarkan nama perusahaan atau posisi, saring berdasarkan status, serta opsi "Hanya Aktif".
- **Tampilan Responsif** — Tabel untuk tampilan desktop dan kartu (card) untuk tampilan mobile.
- **Toggle Tema** — Mode gelap (dark) dan mode terang (light) dengan penyimpanan preferensi di `localStorage`.
- **Pengingat Follow-up** — Memberi penanda "Perlu follow up" otomatis bila status masih aktif namun sudah lebih dari 14 hari sejak pembaruan terakhir.
- **Ekspor Laporan** — Unduh laporan dalam format **PDF** (jsPDF) dan **DOCX** (docx.js) berdasarkan data yang sedang difilter.
- **Deteksi Duplikat** — Memberi peringatan konfirmasi saat mencoba menambah lamaran dengan kombinasi perusahaan, posisi, dan tanggal yang sama.
- **Keamanan API Token** — Setiap permintaan ke backend divalidasi menggunakan token sederhana.

---

## Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Frontend | HTML, JavaScript (vanilla), Tailwind CSS (CDN) |
| Ikon | Lucide Icons |
| Ekspor PDF | jsPDF 2.5.1 |
| Ekspor DOCX | docx.js 8.5.0 |
| Backend | Google Apps Script (GAS) |
| Basis Data | Google Spreadsheet |

---

## Struktur Proyek

```
JOB-TRACKER-v1/
├── index.html      # Seluruh antarmuka & logika frontend
├── Kode.js         # Tempat kode backend Google Apps Script (doGet/doPost)
└── README.md       # Dokumentasi proyek ini
```

---

## Data Model / Struktur Field

Setiap lamaran pekerjaan direpresentasikan sebagai objek dengan field berikut:

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `idUnik` | string | Otomatis | ID unik lamaran (dibuat backend) |
| `namaPerusahaan` | string | Ya | Nama perusahaan yang dilamar |
| `posisi` | string | Ya | Jabatan/posisi yang dilamar |
| `tanggalMelamar` | string (YYYY-MM-DD) | Ya | Tanggal mengirim lamaran |
| `status` | string | Ya | Status lamaran (lihat daftar di bawah) |
| `tautanLowongan` | string (URL) | Tidak | Tautan ke lowongan pekerjaan |
| `sumberLowongan` | string | Tidak | Sumber lowongan (mis. LinkedIn, Glints) |
| `gaji` | number (IDR) | Tidak | Nominal gaji yang ditawarkan |
| `catatan` | string | Tidak | Catatan terkait proses rekrutmen |
| `terakhirDiperbarui` | string (timestamp) | Otomatis | Tanggal terakhir data diperbarui |

---

## Status Lamaran

Aplikasi mengenali 7 jenis status dengan kode warna berbeda:

| Status | Keterangan | Termasuk "Aktif"? |
|---|---|---|
| `Applied` | Sudah mengirim lamaran | Ya |
| `Screening` | Sedang dalam tahap seleksi administrasi | Ya |
| `Interview` | Diundang untuk wawancara | Ya |
| `Offered` | Menerima tawaran kerja | Tidak |
| `Rejected` | Ditolak | Tidak |
| `Withdrawn` | Menarik diri secara sukarela | Tidak |
| `Ghosted` | Tidak ada kabar dari perusahaan | Tidak |

Status "Aktif" mencakup `Applied`, `Screening`, dan `Interview`. Lamaran dengan status aktif yang belum diperbarui lebih dari 14 hari akan diberi penanda **"Perlu follow up"**.

---

## API Backend (Google Apps Script)

Frontend berkomunikasi dengan backend melalui satu endpoint (`API_URL`) dengan dua metode HTTP:

### 1. `GET` — Mengambil daftar lamaran

```
GET {API_URL}?action=list&token={API_TOKEN}
```

Response:
```json
{
  "success": true,
  "data": [ { "idUnik": "...", "namaPerusahaan": "...", ... } ]
}
```

### 2. `POST` — Membuat, memperbarui, atau menghapus lamaran

Body dikirim sebagai `text/plain` berisi JSON:

**Create:**
```json
{
  "token": "JobTracker2026Key",
  "action": "create",
  "data": { "namaPerusahaan": "...", "posisi": "...", "tanggalMelamar": "...", "status": "..." }
}
```

**Update:**
```json
{
  "token": "JobTracker2026Key",
  "action": "update",
  "idUnik": "ID_LAMARAN",
  "data": { "...field yang diperbarui..." }
}
```

**Delete:**
```json
{
  "token": "JobTracker2026Key",
  "action": "delete",
  "idUnik": "ID_LAMARAN"
}
```

> Catatan: Backend (`Kode.js`) saat ini masih kosong. Anda perlu menulis fungsi `doGet(e)` dan `doPost(e)` di Google Apps Script yang menangani ketiga action di atas, dengan Google Spreadsheet sebagai penyimpanan data.

---

## Konfigurasi

Sebelum aplikasi dapat berjalan, sesuaikan konfigurasi berikut di dalam blok `<script>` pada `index.html`:

```javascript
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
  API_TOKEN: "JobTracker2026Key"
};
```

- **`API_URL`** — URL Web App hasil deployment Google Apps Script.
- **`API_TOKEN`** — Token rahasia yang harus cocok antara frontend dan backend. Ganti nilai default dengan token Anda sendiri demi keamanan.

---

## Cara Deployment

1. **Buat Google Spreadsheet** baru yang akan digunakan sebagai basis data. Buat satu sheet dengan baris header sesuai field pada tabel [Data Model](#data-model--struktur-field).

2. **Buka Google Apps Script Editor** melalui menu `Extensions → Apps Script` pada Spreadsheet tersebut.

3. **Salin kode backend** dari `Kode.js` ke editor Apps Script. Implementasikan `doGet(e)` untuk action `list` dan `doPost(e)` untuk action `create`, `update`, serta `delete`.

4. **Deploy sebagai Web App:**
   - Klik **Deploy → New deployment**
   - Pilih tipe **Web app**
   - Atur **Execute as**: Me (akun Anda)
   - Atur **Who has access**: Anyone
   - Salin URL Web App yang dihasilkan

5. **Perbarui konfigurasi** di `index.html`:
   - Masukkan URL Web App ke `CONFIG.API_URL`
   - Pastikan `CONFIG.API_TOKEN` cocok dengan token di backend

6. **Hosting frontend:** Anda dapat menyajikan `index.html` melalui hosting statis apa pun (GitHub Pages, Netlify, Vercel, dll.) atau langsung dideploy lewat GAS dengan `HtmlService`.

---

## Panduan Penggunaan

- **Menambah lamaran:** Klik tombol "Tambah Lamaran", isi form (nama perusahaan, posisi, tanggal, dan status wajib diisi), lalu klik "Simpan".
- **Mengedit lamaran:** Klik ikon pensil (edit) pada baris/kartu lamaran, ubah data, lalu simpan.
- **Menghapus lamaran:** Klik ikon tempat sampah, lalu konfirmasi penghapusan.
- **Mencari & menyaring:** Gunakan kotak pencarian untuk mencari perusahaan/posisi, pilih filter status, atau centang "Hanya Aktif" untuk menyembunyikan lamaran yang sudah selesai.
- **Mengganti tema:** Klik ikon matahari/bulan di pojok kanan atas navbar.
- **Ekspor laporan:** Klik tombol "Ekspor" lalu pilih format PDF atau DOCX. Data yang diekspor mengikuti hasil filter saat ini.

---

## Catatan

- File `Kode.js` pada proyek ini saat ini **masih kosong**. File ini ditujukan untuk menampung kode backend Google Apps Script. Backend perlu diimplementasikan agar aplikasi dapat menyimpan dan membaca data dari Google Spreadsheet.
- Token `API_TOKEN` bersifat sederhana dan tidak menggantikan mekanisme autentikasi yang lebih kuat. Untuk penggunaan produksi, pertimbangkan metode keamanan yang lebih baik (mis. OAuth2 atau validasi token yang lebih ketat di sisi server).
- Aplikasi menggunakan `Content-Type: text/plain` pada permintaan POST untuk menghindari preflight CORS yang sering memblokir koneksi ke GAS.
- Preferensi tema disimpan di `localStorage` dengan key `jobtracker.theme`.
