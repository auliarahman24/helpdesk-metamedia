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
    const servicesData = [
      {
        namaLayanan: "Legalisir Transkrip Nilai",
        departmentId: "DEPT-BAAK",
        defaultPrioritas: "Sedang",
        isActive: true,
        formBuilder: [
          { id: "alasan",        label: "Alasan Permohonan",        type: "textarea", isRequired: true },
          { id: "jumlah_lembar", label: "Jumlah Lembar",            type: "text",     isRequired: true },
          { id: "tujuan_kirim",  label: "Tujuan Pengiriman",        type: "select",   isRequired: true, options: ["Ambil di Loket", "Dikirim via Email", "Dikirim via Pos"] },
        ],
      },
      {
        namaLayanan: "Surat Keterangan Aktif Kuliah",
        departmentId: "DEPT-BAAK",
        defaultPrioritas: "Rendah",
        isActive: true,
        formBuilder: [
          { id: "keperluan",     label: "Keperluan Surat",          type: "text", isRequired: true },
          { id: "semester",      label: "Semester Saat Ini",        type: "text", isRequired: true },
        ],
      },
      {
        namaLayanan: "Perbaikan Proyektor Kelas",
        departmentId: "DEPT-TEKNISI",
        defaultPrioritas: "Tinggi",
        isActive: true,
        formBuilder: [
          { id: "nomor_ruangan",   label: "Nomor Ruangan",   type: "text",   isRequired: true },
          { id: "jenis_kerusakan", label: "Jenis Kerusakan", type: "select", isRequired: true, options: ["Mati Total", "Warna Pudar", "Tidak Konek Laptop", "Suara Tidak Keluar", "Lainnya"] },
          { id: "deskripsi_kerusakan", label: "Deskripsi Kerusakan", type: "textarea", isRequired: true },
          { id: "foto_kondisi",   label: "Foto Kondisi Proyektor",  type: "file",     isRequired: false },
        ],
      },
      {
        namaLayanan: "Gangguan Internet Terpusat",
        departmentId: "DEPT-TEKNISI",
        defaultPrioritas: "Kritis",
        isActive: true,
        formBuilder: [
          { id: "lokasi_jaringan", label: "Lokasi Jaringan (Gedung/Lantai)", type: "text",   isRequired: true },
          { id: "waktu_mati",      label: "Sejak Kapan Mati",                type: "text", isRequired: true },
        ],
      },
      {
        namaLayanan: "Pembersihan Kelas / Area",
        departmentId: "DEPT-KEBERSIHAN",
        defaultPrioritas: "Rendah",
        isActive: true,
        formBuilder: [
          { id: "area_ruangan",  label: "Area / Ruangan",     type: "text",   isRequired: true },
          { id: "tingkat_kotor", label: "Tingkat Keparahan",  type: "select", isRequired: true, options: ["Ringan", "Sedang", "Parah", "Sangat Parah"] },
          { id: "catatan",       label: "Catatan Tambahan",   type: "textarea", isRequired: false },
        ],
      },
      {
        namaLayanan: "Lapor Barang Hilang",
        departmentId: "DEPT-KEAMANAN",
        defaultPrioritas: "Tinggi",
        isActive: true,
        formBuilder: [
          { id: "nama_barang",     label: "Nama Barang",              type: "text",     isRequired: true },
          { id: "lokasi_terakhir", label: "Lokasi Terakhir Dilihat",  type: "text",     isRequired: true },
          { id: "waktu_kejadian",  label: "Perkiraan Waktu Kejadian", type: "text",     isRequired: false },
          { id: "deskripsi",       label: "Deskripsi Barang",         type: "textarea", isRequired: true },
          { id: "foto_barang",     label: "Foto Barang Hilang",       type: "file",     isRequired: false },
        ],
      },
      {
        namaLayanan: "Laporan Keadaan Darurat",
        departmentId: "DEPT-KEAMANAN",
        defaultPrioritas: "Kritis",
        isActive: true,
        formBuilder: [
          { id: "jenis_darurat",  label: "Jenis Keadaan Darurat", type: "select", isRequired: true, options: ["Kecelakaan Fisik", "Kebakaran", "Pertikaian", "Lainnya"] },
          { id: "lokasi_darurat", label: "Lokasi Kejadian",       type: "text",   isRequired: true },
        ],
      },
    ];

    const services = await Service.insertMany(servicesData);

    // 5. Seed Tickets — ARSITEKTUR FULLY DYNAMIC (tanpa field statis lama)
    console.log("Menyemai data Tickets...");

    const ticketsData = [];
    const mahasiswaIds = ["22010001", "22010002", "22010003"];
    const statuses = ["Masuk", "Diproses", "Pending Verifikasi", "Tertunda", "Dikonfirmasi", "Ditolak", "Selesai", "Dibatalkan"];
    
    // Pemetaan data dinamis berdasarkan nama layanan
    const serviceTemplates: Record<string, any> = {
      "Legalisir Transkrip Nilai": {
        dynamicData: { alasan: "Pemberkasan Beasiswa Unggulan", jumlah_lembar: "4", tujuan_kirim: "Ambil di Loket" },
      },
      "Surat Keterangan Aktif Kuliah": {
        dynamicData: { keperluan: "Persyaratan Lomba Tingkat Nasional", semester: "Semester 6" },
      },
      "Perbaikan Proyektor Kelas": {
        dynamicData: { nomor_ruangan: "Lab Jaringan Lt. 4", jenis_kerusakan: "Suara Tidak Keluar", deskripsi_kerusakan: "Kabel HDMI longgar." },
      },
      "Gangguan Internet Terpusat": {
        dynamicData: { lokasi_jaringan: "Gedung A Seluruh Lantai 2", waktu_mati: "Sejak pukul 14:00 WIB" },
      },
      "Pembersihan Kelas / Area": {
        dynamicData: { area_ruangan: "Toilet Lantai 2", tingkat_kotor: "Sangat Parah", catatan: "Air dari wastafel meluap." },
      },
      "Lapor Barang Hilang": {
        dynamicData: { nama_barang: "Dompet Kulit Coklat", lokasi_terakhir: "Kantin Utama Area Timur", waktu_kejadian: "12:30 WIB", deskripsi: "Tertinggal pas makan siang." },
      },
      "Laporan Keadaan Darurat": {
        dynamicData: { jenis_darurat: "Kecelakaan Fisik", lokasi_darurat: "Parkiran Motor Gerbang Timur" },
      },
    };

    for (let i = 0; i < 70; i++) {
      const generatedDate = new Date();
      // mundur secara acak antara 0 hingga 45 hari
      const delayHours = Math.floor(Math.random() * 24 * 45);
      generatedDate.setHours(generatedDate.getHours() - delayHours);

      // Pilih secara acak dari list services
      const svc = services[Math.floor(Math.random() * services.length)];
      const template = serviceTemplates[svc.namaLayanan] || { dynamicData: {} };
      
      const isPublicGuest = Math.random() < 0.25; // 25% probabilitas tamu
      const mhsId = isPublicGuest ? "PUBLIC_GUEST" : mahasiswaIds[Math.floor(Math.random() * mahasiswaIds.length)];
      
      let guestData: any = { isGuest: false };
      if (isPublicGuest) {
        guestData = {
          isGuest: true,
          guestName: ["Ahmad Zulkarnain", "Budi Santoso", "Siti Aminah", "Joko Widodo"][Math.floor(Math.random() * 4)],
          guestContact: ["08123456789", "0856000000", "0819999999", "tamu@contoh.com"][Math.floor(Math.random() * 4)],
          guestPin: `MET-${Math.floor(1000 + Math.random() * 9000).toString()}`
        };
      }
      const prioritas = svc.defaultPrioritas || "Sedang";
      let status;
      if (isPublicGuest) {
        status = "Pending Verifikasi"; // Semua tamu masuk karantina
      } else {
        const mhsStatuses = ["Masuk", "Diproses", "Tertunda", "Dikonfirmasi", "Ditolak", "Selesai", "Dibatalkan"];
        status = mhsStatuses[Math.floor(Math.random() * mhsStatuses.length)];
      }

      const initialStatus = isPublicGuest ? "Pending Verifikasi" : "Masuk";
      const history = [{ status: initialStatus, timestamp: new Date(generatedDate.getTime() - 3600000 * 24), actor: "sistem", note: "Laporan berhasil dibuat otomatis oleh Seed Script." }];
      
      if (!isPublicGuest && status !== "Masuk") {
        history.push({ status: status, timestamp: generatedDate, actor: `Admin ${svc.departmentId.split('-')[1]}`, note: "Diupdate secara otomatis via script bulk dummy." });
      }

      ticketsData.push({
        ticketId: generateTicketId(),
        mahasiswaId: mhsId,
        serviceId: new mongoose.Types.ObjectId(String(svc._id)),
        departmentId: svc.departmentId,
        status: status,
        prioritas: prioritas,
        ...guestData,
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
