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

    const ticketsData = [];
    const mahasiswaIds = ["22010001", "22010002", "22010003"];
    const priorities = ["Rendah", "Sedang", "Tinggi", "Kritis"];
    const statuses = ["Masuk", "Diproses", "Pending Verifikasi", "Tertunda", "Dikonfirmasi", "Ditolak", "Selesai", "Dibatalkan"];
    
    // Pemetaan data dinamis berdasarkan service
    const serviceTemplates = {
      "DEPT-KEAMANAN": {
        dynamicData: { nama_barang: "Laptop Asus ROG Hitam", lokasi_terakhir: "Kantin Utama Area Timur", waktu_kejadian: "12:30 WIB", deskripsi: "Tertinggal setelah makan siang bareng teman." },
      },
      "DEPT-BAAK": {
        dynamicData: { alasan: "Keperluan Pemberkasan CPNS 2026", jumlah_lembar: "4", tujuan_kirim: "Dikirim via Email" },
      },
      "DEPT-KEBERSIHAN": {
        dynamicData: { area_ruangan: "Toilet Lantai 2 Gedung 3", tingkat_kotor: "Sangat Parah", catatan: "Air dari wastafel meluap dan membuat lantai sangat licin." },
      },
      "DEPT-TEKNISI": {
        dynamicData: { nomor_ruangan: "Lab Jaringan Lt. 4", jenis_kerusakan: "Suara Tidak Keluar", deskripsi_kerusakan: "HDMI nyambung gambar bagus tapi suara hilang saat play video materi." },
      }
    };

    const servicesArr = [svcBAAK, svcTeknisi, svcKebersihan, svcKeamanan];

    for (let i = 0; i < 50; i++) {
      const generatedDate = new Date();
      // mundur secara acak antara 0 hingga 45 hari
      const delayHours = Math.floor(Math.random() * 24 * 45);
      generatedDate.setHours(generatedDate.getHours() - delayHours);

      const svc = servicesArr[Math.floor(Math.random() * servicesArr.length)];
      const template = serviceTemplates[svc.departmentId as keyof typeof serviceTemplates];
      
      const mhsId = mahasiswaIds[Math.floor(Math.random() * mahasiswaIds.length)];
      const prioritas = priorities[Math.floor(Math.random() * priorities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const history = [{ status: "Masuk", timestamp: new Date(generatedDate.getTime() - 3600000 * 24), actor: "sistem", note: "Laporan berhasil dibuat otomatis oleh Seed Script." }];
      if (status !== "Masuk") {
        history.push({ status: status, timestamp: generatedDate, actor: `Admin ${svc.departmentId.split('-')[1]}`, note: "Diupdate secara otomatis via script bulk dummy." });
      }

      ticketsData.push({
        ticketId: generateTicketId(),
        mahasiswaId: mhsId,
        serviceId: new mongoose.Types.ObjectId(String(svc._id)),
        departmentId: svc.departmentId,
        status: status,
        prioritas: prioritas,
        dynamicData: template.dynamicData,
        formSnapshot: svc.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: history,
        createdAt: new Date(generatedDate.getTime() - 3600000 * 24),
        updatedAt: generatedDate
      });
    }

    // Menggunakan timestamps: false di override agar createdAt dan updatedAt bisa kita tentukan secara random
    await Ticket.insertMany(ticketsData, { timestamps: false });

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
