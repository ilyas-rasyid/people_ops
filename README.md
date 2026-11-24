# PeopleOps HRIS

Sistem Informasi Manajemen Sumber Daya Manusia (_Human Resource Information System_) untuk perusahaan internal. Berfungsi untuk mengelola direktori karyawan, pencatatan absensi harian berbasis server, pengajuan dan manajemen saldo cuti (_annual_ dan _unpaid leave_), persetujuan (_approval_) manajerial, serta audit _history_ seluruh perubahan data kepegawaian.

---

## Prasyarat

- [Bun](https://bun.sh/) (v1.2+)
- [Docker & Docker Compose](https://docs.docker.com/compose/)

---

## Cara Menjalankan

### 1. Install Dependensi

```bash
bun install
```

### 2. Setup Environment Variables

Salin file template `.env`:

```bash
cp .env.example .env
```

_(Opsional: sesuaikan kredensial database dan `SESSION_SECRET` di dalam file `.env` jika dibutuhkan)._

### 3. Jalankan Database

Nyalakan container PostgreSQL:

```bash
bun run infra:up
```

### 4. Setup Database & Seeding Data

Jalankan migrasi schema, generate client Prisma, terapkan custom constraints, dan masukkan data awal:

```bash
bun run db:migrate
bun run db:generate
bun run db:constraints
bun run db:seed
```

### 5. Jalankan Aplikasi

Jalankan backend API dan frontend web secara bersamaan:

```bash
bun run dev
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173) (atau port sesuai konfigurasi di `.env`)
- **Backend API**: [http://localhost:3001](http://localhost:3001) (atau port sesuai konfigurasi di `.env`)

---

## Akun Demo Login

Password untuk seluruh akun demo di bawah ini adalah: **`PeopleOpsDemo!2026`**

| Role             | Email                  | Nama Karyawan | Keterangan                                               |
| ---------------- | ---------------------- | ------------- | -------------------------------------------------------- |
| **HR Admin**     | `hr@example.com`       | Alex Morgan   | Akses penuh manajemen karyawan, cuti, dan pengaturan HR  |
| **Manager**      | `manager@example.com`  | Jordan Chen   | Akses review & persetujuan (_approval_) cuti anggota tim |
| **Employee**     | `employee@example.com` | Taylor Brooks | Akses mandiri absensi, pengajuan cuti, dan saldo cuti    |
| **HR Admin (2)** | `hr2@example.com`      | Avery Patel   | Akun cadangan admin HR                                   |
