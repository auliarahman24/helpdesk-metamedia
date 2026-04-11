import mongoose from "mongoose";
import dbConnect from "./mongodb";
import User from "@/models/User";
import Service from "@/models/Service";
import Ticket from "@/models/Ticket";
import Department from "@/models/Department";

// ============================================================
// Generator: Custom Ticket ID Format Enterprise
// Format: TKT-YYMMDD-XXXX (contoh: TKT-260411-A8B2)
// Disinkronkan dengan logika di ticketActions.ts
// ============================================================
function generateTicketId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `TKT-${yy}${mm}${dd}-${rand}`;
}

export async function seedDatabase() {
  try {
    await dbConnect();

    // 1. Clear Data / Reset Database
    console.log("Memulai proses seed: Menghapus data lama...");
    await User.deleteMany({});
    await Department.deleteMany({});
    await Service.deleteMany({});
    await Ticket.deleteMany({});

    // 2. Seed Departments
    console.log("Menyemai data Departments...");
    await Department.insertMany([
      { departmentId: "DEPT-BAAK",       namaDepartemen: "Biro Administrasi Akademik" },
      { departmentId: "DEPT-TEKNISI",    namaDepartemen: "Teknisi Sarana Prasarana" },
      { departmentId: "DEPT-KEBERSIHAN", namaDepartemen: "Tim Kebersihan Kampus" },
      { departmentId: "DEPT-KEAMANAN",   namaDepartemen: "Keamanan (Satpam)" },
    ]);

    // 3. Seed Users
    console.log("Menyemai data Users...");
    await User.insertMany([
      // Super Admin
      { nim_nip: "999999",   nama: "Super Admin Pusat", password: "123456", role: "superadmin" },
      // Admin Departemen
      { nim_nip: "100001", nama: "Admin BAAK",       password: "123456", role: "admin_departemen", departmentId: "DEPT-BAAK" },
      { nim_nip: "100002", nama: "Admin Teknisi",    password: "123456", role: "admin_departemen", departmentId: "DEPT-TEKNISI" },
      { nim_nip: "100003", nama: "Admin Kebersihan", password: "123456", role: "admin_departemen", departmentId: "DEPT-KEBERSIHAN" },
      { nim_nip: "100004", nama: "Admin Keamanan",   password: "123456", role: "admin_departemen", departmentId: "DEPT-KEAMANAN" },
      // Mahasiswa
      { nim_nip: "22010001", nama: "Andi Pratama",   password: "123456", role: "mahasiswa" },
      { nim_nip: "22010002", nama: "Siti Nurhaliza", password: "123456", role: "mahasiswa" },
      { nim_nip: "22010003", nama: "Budi Santoso",   password: "123456", role: "mahasiswa" },
    ]);

    // 4. Seed Services — FULLY DYNAMIC: tipe baru (text, textarea, select, file)
    console.log("Menyemai data Services...");
    const services = await Service.insertMany([
      {
        namaLayanan: "Legalisir Transkrip Nilai",
        departmentId: "DEPT-BAAK",
        isActive: true,
        formBuilder: [
          { id: "alasan",        label: "Alasan Permohonan",        type: "textarea", isRequired: true },
          { id: "jumlah_lembar", label: "Jumlah Lembar",             type: "text",     isRequired: true },
          { id: "tujuan_kirim",  label: "Tujuan Pengiriman",         type: "select",   isRequired: true,
            options: ["Ambil di Loket", "Dikirim via Email", "Dikirim via Pos"] },
        ],
      },
      {
        namaLayanan: "Perbaikan Proyektor Kelas",
        departmentId: "DEPT-TEKNISI",
        isActive: true,
        formBuilder: [
          { id: "nomor_ruangan",   label: "Nomor Ruangan",   type: "text",   isRequired: true },
          { id: "jenis_kerusakan", label: "Jenis Kerusakan", type: "select", isRequired: true,
            options: ["Mati Total", "Warna Pudar", "Tidak Konek Laptop", "Suara Tidak Keluar", "Lainnya"] },
          { id: "deskripsi_kerusakan", label: "Deskripsi Kerusakan", type: "textarea", isRequired: true },
          { id: "foto_kondisi",   label: "Foto Kondisi Proyektor",  type: "file",     isRequired: false },
        ],
      },
      {
        namaLayanan: "Pembersihan Kelas / Area",
        departmentId: "DEPT-KEBERSIHAN",
        isActive: true,
        formBuilder: [
          { id: "area_ruangan",  label: "Area / Ruangan",     type: "text",   isRequired: true },
          { id: "tingkat_kotor", label: "Tingkat Keparahan",  type: "select", isRequired: true,
            options: ["Ringan", "Sedang", "Parah", "Sangat Parah"] },
          { id: "catatan",       label: "Catatan Tambahan",   type: "textarea", isRequired: false },
        ],
      },
      {
        namaLayanan: "Lapor Barang Hilang",
        departmentId: "DEPT-KEAMANAN",
        isActive: true,
        formBuilder: [
          { id: "nama_barang",     label: "Nama Barang",              type: "text",     isRequired: true },
          { id: "lokasi_terakhir", label: "Lokasi Terakhir Dilihat",  type: "text",     isRequired: true },
          { id: "waktu_kejadian",  label: "Perkiraan Waktu Kejadian", type: "text",     isRequired: false },
          { id: "deskripsi",       label: "Deskripsi Barang",         type: "textarea", isRequired: true },
          { id: "foto_barang",     label: "Foto Barang Hilang",       type: "file",     isRequired: false },
        ],
      },
    ]);

    // 5. Seed Tickets — ARSITEKTUR FULLY DYNAMIC (tanpa field statis lama)
    console.log("Menyemai data Tickets...");

    const [svcBAAK, svcTeknisi, svcKebersihan, svcKeamanan] = services;

    const today      = new Date();
    const yesterday  = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await Ticket.insertMany([
      // ── TIKET 1: MASUK — Lapor Barang Hilang ──
      {
        ticketId: generateTicketId(),
        mahasiswaId: "22010001",
        serviceId: new mongoose.Types.ObjectId(String(svcKeamanan._id)),
        departmentId: "DEPT-KEAMANAN",
        status: "Masuk",
        dynamicData: {
          nama_barang:     "Dompet Kulit Coklat",
          lokasi_terakhir: "Perpustakaan Lt 2, Pojok Baca",
          waktu_kejadian:  "Sekitar pukul 10:00 WIB",
          deskripsi:       "Saya meninggalkan dompet warna coklat di meja pojok perpustakaan. Saat kembali sudah tidak ada.",
        },
        formSnapshot: svcKeamanan.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: [
          { status: "Masuk", timestamp: today, actor: "sistem", note: "Laporan berhasil dibuat." },
        ],
      },

      // ── TIKET 2: MASUK — Legalisir Transkrip ──
      {
        ticketId: generateTicketId(),
        mahasiswaId: "22010003",
        serviceId: new mongoose.Types.ObjectId(String(svcBAAK._id)),
        departmentId: "DEPT-BAAK",
        status: "Masuk",
        dynamicData: {
          alasan:        "Pemberkasan Beasiswa Unggulan 2026",
          jumlah_lembar: "3",
          tujuan_kirim:  "Ambil di Loket",
        },
        formSnapshot: svcBAAK.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: [
          { status: "Masuk", timestamp: today, actor: "sistem", note: "Laporan berhasil dibuat." },
        ],
      },

      // ── TIKET 3: DIPROSES — Pembersihan Kelas ──
      {
        ticketId: generateTicketId(),
        mahasiswaId: "22010002",
        serviceId: new mongoose.Types.ObjectId(String(svcKebersihan._id)),
        departmentId: "DEPT-KEBERSIHAN",
        status: "Diproses",
        dynamicData: {
          area_ruangan:  "Kelas 402 Gedung 4 Lt 4",
          tingkat_kotor: "Parah",
          catatan:       "Air menetes dari AC mengenai kursi mahasiswa, lantai licin dan berbahaya.",
        },
        formSnapshot: svcKebersihan.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: [
          { status: "Masuk",    timestamp: yesterday, actor: "sistem",          note: "Laporan berhasil dibuat." },
          { status: "Diproses", timestamp: today,     actor: "Admin Kebersihan", note: "Tim CS sedang menuju ke lantai 4 membawa perlengkapan." },
        ],
      },

      // ── TIKET 4: DIPROSES — Perbaikan Proyektor ──
      {
        ticketId: generateTicketId(),
        mahasiswaId: "22010001",
        serviceId: new mongoose.Types.ObjectId(String(svcTeknisi._id)),
        departmentId: "DEPT-TEKNISI",
        status: "Diproses",
        dynamicData: {
          nomor_ruangan:       "Lab Komputer Terpadu C",
          jenis_kerusakan:     "Mati Total",
          deskripsi_kerusakan: "Proyektor mati tiba-tiba saat presentasi dosen, tidak bisa dihidupkan dengan remote maupun panel.",
        },
        formSnapshot: svcTeknisi.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: [
          { status: "Masuk",    timestamp: twoDaysAgo, actor: "sistem",        note: "Laporan berhasil dibuat." },
          { status: "Diproses", timestamp: yesterday,  actor: "Admin Teknisi", note: "Dalam tahap inspeksi. Diduga lampu proyektor putus." },
        ],
      },

      // ── TIKET 5: SELESAI — Proyektor Warna Pudar ──
      {
        ticketId: generateTicketId(),
        mahasiswaId: "22010003",
        serviceId: new mongoose.Types.ObjectId(String(svcTeknisi._id)),
        departmentId: "DEPT-TEKNISI",
        status: "Selesai",
        dynamicData: {
          nomor_ruangan:       "Ruang 101 Gedung 1",
          jenis_kerusakan:     "Warna Pudar",
          deskripsi_kerusakan: "Warna output sangat kuning, teks tidak terbaca oleh mahasiswa di kursi belakang.",
        },
        formSnapshot: svcTeknisi.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: [
          { status: "Masuk",    timestamp: twoDaysAgo, actor: "sistem",        note: "Laporan berhasil dibuat." },
          { status: "Diproses", timestamp: twoDaysAgo, actor: "Admin Teknisi", note: "Sedang mencoba kalibrasi warna via setting default." },
          { status: "Selesai",  timestamp: yesterday,  actor: "Admin Teknisi", note: "Penyolderan kabel VGA ulang telah dilakukan. Gambar normal." },
        ],
      },

      // ── TIKET 6: SELESAI — Legalisir Melamar Kerja ──
      {
        ticketId: generateTicketId(),
        mahasiswaId: "22010002",
        serviceId: new mongoose.Types.ObjectId(String(svcBAAK._id)),
        departmentId: "DEPT-BAAK",
        status: "Selesai",
        dynamicData: {
          alasan:        "Melamar Lowongan Pekerjaan BUMN, deadline besok jam 8 pagi.",
          jumlah_lembar: "5",
          tujuan_kirim:  "Dikirim via Email",
        },
        formSnapshot: svcBAAK.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: [
          { status: "Masuk",    timestamp: twoDaysAgo, actor: "sistem",    note: "Laporan berhasil dibuat." },
          { status: "Diproses", timestamp: yesterday,  actor: "Admin BAAK", note: "Dokumen telah dicetak dan menunggu tanda tangan Wakil Dekan." },
          { status: "Selesai",  timestamp: today,      actor: "Admin BAAK", note: "Legalisir sudah selesai. Silakan ambil di loket 2 BAAK." },
        ],
      },
    ]);

    console.log("✅ Seed selesai! Arsitektur Fully Dynamic siap diuji.");
  } catch (error) {
    console.error("❌ Gagal melakukan seed:", error);
    throw error;
  }
}

// Eksekusi jika dijalankan secara langsung
if (require.main === module || process.argv[1].includes("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
