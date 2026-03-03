# Setup Database untuk IKM Survey

## Langkah 1: Buat Database dan Tabel

Jalankan file `admin/database.sql` pada phpMyAdmin atau MySQL command line:

```bash
mysql -u root -p < admin/database.sql
```

Atau melalui phpMyAdmin:
1. Buka http://localhost/phpmyadmin
2. Klik "SQL" di menu atas
3. Copy-paste isi file `admin/database.sql`
4. Klik "Execute"

## Langkah 2: Konfigurasi Database di API

Edit file `admin/api.php` dan sesuaikan credential database (baris 30-36):

```php
$host = 'localhost';
$username = 'root';      // Sesuai username MySQL Anda
$password = '';          // Sesuai password MySQL Anda
$database = 'ikm_survey'; // Nama database
```

## Langkah 3: Verifikasi Koneksi

1. Buka http://localhost/ikm-survey/statistik/
2. Cek console browser (F12 -> Console)
3. Jika melihat error JSON, cek pesan error di console
4. Jika masih error, verifikasi:
   - Username dan password database
   - Database `ikm_survey` sudah dibuat
   - Tabel `votes` sudah ada
   - User MySQL memiliki akses ke database ini

## Database Structure

Table `votes`:
- `id` (INT, Primary Key, Auto Increment)
- `loket_id` (INT)
- `rating` (DECIMAL)
- `answers` (LONGTEXT, JSON format)
- `respondent` (LONGTEXT, JSON format)
- `created_at` (TIMESTAMP)

## Troubleshooting

**Error: "Tabel votes tidak ditemukan"**
- Jalankan ulang `admin/database.sql` di phpMyAdmin

**Error: "Gagal terhubung ke database"**
- Periksa username, password, dan nama database di `admin/api.php`
- Pastikan MySQL service berjalan
- Cek detail error di F12 -> Console

**Data tidak tampil di statistik**
- Pastikan sudah ada survei yang disimpan terlebih dahulu
- Survei disimpan otomatis saat user submit form di halaman utama

## Default Credentials (XAMPP)

Biasanya XAMPP menggunakan:
- Host: `localhost`
- Username: `root`
- Password: (kosong)
- Database: `ikm_survey` (dibuat dari database.sql)
