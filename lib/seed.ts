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

// ============================================================
// Helper: Generate PIN 6 digit numerik (sinkron dengan publicActions.ts)
// ============================================================
function generateGuestPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================
// Helper: Random date mundur N hari dari sekarang
// ============================================================
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 14) + 7); // jam 07-20
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
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

    // ══════════════════════════════════════════════════════════
    // 2. Seed Departments
    // ══════════════════════════════════════════════════════════
    console.log("Menyemai data Departments...");
    await Department.insertMany([
      { departmentId: "DEPT-BAAK",       namaDepartemen: "Biro Administrasi Akademik", isDeleted: false },
      { departmentId: "DEPT-TEKNISI",    namaDepartemen: "Teknisi Sarana Prasarana",    isDeleted: false },
      { departmentId: "DEPT-KEBERSIHAN", namaDepartemen: "Tim Kebersihan Kampus",       isDeleted: false },
      { departmentId: "DEPT-KEAMANAN",   namaDepartemen: "Keamanan (Satpam)",           isDeleted: false },
    ]);

    // ══════════════════════════════════════════════════════════
    // 3. Seed Users
    // ══════════════════════════════════════════════════════════
    console.log("Menyemai data Users...");
    await User.insertMany([
      // Super Admin
      { nim_nip: "999999",   nama: "Super Admin Pusat", password: "123456", role: "superadmin", isDeleted: false },
      // Admin Departemen (1 per departemen — sesuai arsitektur Clean & Focused)
      { nim_nip: "100001", nama: "Admin BAAK",       password: "123456", role: "admin_departemen", departmentId: "DEPT-BAAK",       isDeleted: false },
      { nim_nip: "100002", nama: "Admin Teknisi",    password: "123456", role: "admin_departemen", departmentId: "DEPT-TEKNISI",    isDeleted: false },
      { nim_nip: "100003", nama: "Admin Kebersihan", password: "123456", role: "admin_departemen", departmentId: "DEPT-KEBERSIHAN", isDeleted: false },
      { nim_nip: "100004", nama: "Admin Keamanan",   password: "123456", role: "admin_departemen", departmentId: "DEPT-KEAMANAN",   isDeleted: false },
      // Mahasiswa
      { nim_nip: "22010001", nama: "Andi Pratama",    password: "123456", role: "mahasiswa", isDeleted: false },
      { nim_nip: "22010002", nama: "Siti Nurhaliza",  password: "123456", role: "mahasiswa", isDeleted: false },
      { nim_nip: "22010003", nama: "Budi Santoso",    password: "123456", role: "mahasiswa", isDeleted: false },
      { nim_nip: "22010004", nama: "Dewi Lestari",    password: "123456", role: "mahasiswa", isDeleted: false },
      { nim_nip: "22010005", nama: "Rizky Ramadhan",  password: "123456", role: "mahasiswa", isDeleted: false },
    ]);

    // ══════════════════════════════════════════════════════════
    // 4. Seed Services — isPublic diaktifkan pada layanan tertentu
    // ══════════════════════════════════════════════════════════
    console.log("Menyemai data Services...");
    const servicesData = [
      {
        namaLayanan: "Legalisir Transkrip Nilai",
        departmentId: "DEPT-BAAK",
        defaultPrioritas: "Sedang",
        isActive: true,
        isPublic: true,   // ← Tamu bisa mengajukan
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
        isPublic: true,   // ← Tamu bisa mengajukan
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
        isPublic: false,  // ← Khusus internal
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
        isPublic: true,   // ← Tamu bisa lapor gangguan internet
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
        isPublic: true,   // ← Tamu bisa lapor area kotor
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
        isPublic: true,   // ← Tamu bisa lapor barang hilang
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
        isPublic: false,  // ← Khusus internal (darurat hanya pegawai)
        formBuilder: [
          { id: "jenis_darurat",  label: "Jenis Keadaan Darurat", type: "select", isRequired: true, options: ["Kecelakaan Fisik", "Kebakaran", "Pertikaian", "Lainnya"] },
          { id: "lokasi_darurat", label: "Lokasi Kejadian",       type: "text",   isRequired: true },
        ],
      },
    ];

    const services = await Service.insertMany(servicesData);
    const svcMap: Record<string, any> = {};
    services.forEach(s => { svcMap[s.namaLayanan] = s; });

    // ══════════════════════════════════════════════════════════
    // 5. Seed Tickets — Data Dummy Bervariasi & Realistis
    //
    //    Semua skenario lifecycle di-cover:
    //    - Mahasiswa: Masuk → Diproses → Selesai → Ditutup
    //    - Tamu:      Pending Verifikasi → Masuk → Diproses → Selesai → Komplain
    //    - Edge Case: Dibatalkan
    // ══════════════════════════════════════════════════════════
    console.log("Menyemai data Tickets...");

    const mahasiswaNameMap: Record<string, string> = {
      "22010001": "Andi Pratama",
      "22010002": "Siti Nurhaliza",
      "22010003": "Budi Santoso",
      "22010004": "Dewi Lestari",
      "22010005": "Rizky Ramadhan",
    };

    const adminNameMap: Record<string, string> = {
      "DEPT-BAAK":       "Admin BAAK",
      "DEPT-TEKNISI":    "Admin Teknisi",
      "DEPT-KEBERSIHAN": "Admin Kebersihan",
      "DEPT-KEAMANAN":   "Admin Keamanan",
    };

    const adminIdMap: Record<string, string> = {
      "DEPT-BAAK":       "100001",
      "DEPT-TEKNISI":    "100002",
      "DEPT-KEBERSIHAN": "100003",
      "DEPT-KEAMANAN":   "100004",
    };

    // Peta departemen → nama (untuk snapshot Self-Contained)
    const departmentNameMap: Record<string, string> = {
      "DEPT-BAAK":       "Biro Administrasi Akademik",
      "DEPT-TEKNISI":    "Teknisi Sarana Prasarana",
      "DEPT-KEBERSIHAN": "Tim Kebersihan Kampus",
      "DEPT-KEAMANAN":   "Keamanan (Satpam)",
    };

    // ── Nama tamu bervariasi ──
    const guestNames = [
      "Ahmad Zulkarnain", "Maria Ulfa", "Joko Susilo", "Rina Wati",
      "Bambang Hermawan", "Lina Marlina", "Doni Saputra", "Fitri Handayani",
    ];
    const guestContacts = [
      "081234567890", "085612340000", "081999888777", "tamu@gmail.com",
      "082111222333", "089677788899", "087612345678", "pengunjung@email.id",
    ];

    // ── Variasi data dinamis per layanan ──
    const dynamicVariants: Record<string, any[]> = {
      "Legalisir Transkrip Nilai": [
        { alasan: "Pemberkasan Beasiswa Unggulan", jumlah_lembar: "4", tujuan_kirim: "Ambil di Loket" },
        { alasan: "Syarat Melamar Kerja", jumlah_lembar: "2", tujuan_kirim: "Dikirim via Email" },
        { alasan: "Pendaftaran S2 Dalam Negeri", jumlah_lembar: "6", tujuan_kirim: "Dikirim via Pos" },
      ],
      "Surat Keterangan Aktif Kuliah": [
        { keperluan: "Persyaratan Lomba Nasional", semester: "6" },
        { keperluan: "Klaim Asuransi Orang Tua", semester: "4" },
        { keperluan: "Syarat Magang di Perusahaan", semester: "5" },
      ],
      "Perbaikan Proyektor Kelas": [
        { nomor_ruangan: "Lab Jaringan Lt. 4", jenis_kerusakan: "Suara Tidak Keluar", deskripsi_kerusakan: "Kabel HDMI longgar sehingga audio tidak muncul." },
        { nomor_ruangan: "Ruang Sidang Lt. 3", jenis_kerusakan: "Mati Total", deskripsi_kerusakan: "Proyektor tidak mau hidup sama sekali setelah mati listrik." },
        { nomor_ruangan: "Kelas A201", jenis_kerusakan: "Warna Pudar", deskripsi_kerusakan: "Gambar buram dan warna kekuningan." },
      ],
      "Gangguan Internet Terpusat": [
        { lokasi_jaringan: "Gedung A Seluruh Lantai 2", waktu_mati: "Sejak pukul 14:00 WIB" },
        { lokasi_jaringan: "Perpustakaan Utama", waktu_mati: "Sejak pagi jam 08:00" },
        { lokasi_jaringan: "Lab Komputer Gedung C", waktu_mati: "Hilang timbul sejak 3 hari lalu" },
      ],
      "Pembersihan Kelas / Area": [
        { area_ruangan: "Toilet Lantai 2 Gedung A", tingkat_kotor: "Sangat Parah", catatan: "Air dari wastafel meluap ke lantai." },
        { area_ruangan: "Kantin Area Selatan", tingkat_kotor: "Sedang", catatan: "Meja dan lantai berminyak." },
        { area_ruangan: "Ruang Dosen Lt. 5", tingkat_kotor: "Ringan", catatan: "" },
      ],
      "Lapor Barang Hilang": [
        { nama_barang: "Dompet Kulit Coklat", lokasi_terakhir: "Kantin Utama Area Timur", waktu_kejadian: "12:30 WIB", deskripsi: "Dompet coklat berisi KTM dan uang tunai." },
        { nama_barang: "Laptop ASUS VivoBook", lokasi_terakhir: "Perpustakaan Lantai 2", waktu_kejadian: "15:00 WIB", deskripsi: "Laptop warna silver, ada stiker logo kampus." },
        { nama_barang: "Kunci Motor Honda Beat", lokasi_terakhir: "Parkiran Motor Gerbang Utama", waktu_kejadian: "Tidak tahu pasti", deskripsi: "Gantungan kunci warna biru." },
      ],
      "Laporan Keadaan Darurat": [
        { jenis_darurat: "Kecelakaan Fisik", lokasi_darurat: "Parkiran Motor Gerbang Timur" },
        { jenis_darurat: "Kebakaran", lokasi_darurat: "Dapur Kantin Utama" },
      ],
    };

    function pickRandom<T>(arr: T[]): T {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    // ── Fungsi builder tiket individual ──
    function buildTicket(config: {
      svc: any;
      mahasiswaId: string;
      mahasiswaNama?: string;
      isGuest: boolean;
      guestName?: string;
      guestContact?: string;
      guestPin?: string;
      status: string;
      assigneeId: string | null;
      statusHistory: any[];
      createdAt: Date;
      updatedAt: Date;
    }) {
      const variants = dynamicVariants[config.svc.namaLayanan] || [{}];
      return {
        ticketId: generateTicketId(),
        mahasiswaId: config.mahasiswaId,
        mahasiswaNama: config.mahasiswaNama,
        serviceId: new mongoose.Types.ObjectId(String(config.svc._id)),
        departmentId: config.svc.departmentId,
        // ── Snapshot Fields (Self-Contained Document) ──
        namaLayanan: config.svc.namaLayanan,
        departmentName: departmentNameMap[config.svc.departmentId] || config.svc.departmentId,
        status: config.status,
        prioritas: config.svc.defaultPrioritas || "Sedang",
        assigneeId: config.assigneeId,
        isGuest: config.isGuest,
        guestName: config.guestName,
        guestContact: config.guestContact,
        guestPin: config.guestPin,
        dynamicData: pickRandom(variants),
        formSnapshot: config.svc.formBuilder.map((f: any) => ({
          id: f.id, label: f.label, type: f.type, isRequired: f.isRequired,
          ...(f.options ? { options: f.options } : {}),
        })),
        statusHistory: config.statusHistory,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    }

    const ticketsData: any[] = [];

    // ──────────────────────────────────────────────────────────
    // SKENARIO A: Tiket Mahasiswa dengan berbagai status
    // ──────────────────────────────────────────────────────────
    const mahasiswaIds = Object.keys(mahasiswaNameMap);

    // A1: Tiket baru masuk (belum diklaim admin) — 8 tiket
    for (let i = 0; i < 8; i++) {
      const mhsId = pickRandom(mahasiswaIds);
      const svc = pickRandom(services.filter(s => s.namaLayanan !== "Laporan Keadaan Darurat"));
      const created = daysAgo(Math.floor(Math.random() * 3));
      ticketsData.push(buildTicket({
        svc, mahasiswaId: mhsId, mahasiswaNama: mahasiswaNameMap[mhsId],
        isGuest: false, status: "Masuk", assigneeId: null,
        statusHistory: [
          { status: "Masuk", timestamp: created, actor: "sistem", note: "Laporan baru diterima oleh sistem." },
        ],
        createdAt: created, updatedAt: created,
      }));
    }

    // A2: Tiket sedang diproses oleh admin — 10 tiket
    for (let i = 0; i < 10; i++) {
      const mhsId = pickRandom(mahasiswaIds);
      const svc = pickRandom(services);
      const created = daysAgo(5 + Math.floor(Math.random() * 10));
      const processed = new Date(created.getTime() + 3600000 * (2 + Math.floor(Math.random() * 48)));
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: mhsId, mahasiswaNama: mahasiswaNameMap[mhsId],
        isGuest: false, status: "Diproses", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Masuk", timestamp: created, actor: "sistem", note: "Laporan baru diterima oleh sistem." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Laporan sedang ditangani." },
        ],
        createdAt: created, updatedAt: processed,
      }));
    }

    // A3: Tiket selesai (menunggu konfirmasi pelapor) — 6 tiket
    for (let i = 0; i < 6; i++) {
      const mhsId = pickRandom(mahasiswaIds);
      const svc = pickRandom(services);
      const created = daysAgo(15 + Math.floor(Math.random() * 15));
      const processed = new Date(created.getTime() + 3600000 * 24);
      const finished = new Date(processed.getTime() + 3600000 * 48);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: mhsId, mahasiswaNama: mahasiswaNameMap[mhsId],
        isGuest: false, status: "Selesai", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Masuk", timestamp: created, actor: "sistem", note: "Laporan baru diterima oleh sistem." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Sedang ditindaklanjuti oleh tim." },
          { status: "Selesai", timestamp: finished, actor: admin, note: "Perbaikan/Layanan telah selesai dilakukan." },
        ],
        createdAt: created, updatedAt: finished,
      }));
    }

    // A4: Tiket sudah ditutup (konfirmasi oleh pelapor) — 5 tiket
    for (let i = 0; i < 5; i++) {
      const mhsId = pickRandom(mahasiswaIds);
      const svc = pickRandom(services);
      const created = daysAgo(25 + Math.floor(Math.random() * 15));
      const processed = new Date(created.getTime() + 3600000 * 12);
      const finished = new Date(processed.getTime() + 3600000 * 36);
      const closed = new Date(finished.getTime() + 3600000 * 24);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: mhsId, mahasiswaNama: mahasiswaNameMap[mhsId],
        isGuest: false, status: "Ditutup", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Masuk", timestamp: created, actor: "sistem", note: "Laporan baru diterima oleh sistem." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Proses pengerjaan dimulai." },
          { status: "Selesai", timestamp: finished, actor: admin, note: "Layanan telah selesai." },
          { status: "Ditutup", timestamp: closed, actor: mahasiswaNameMap[mhsId], note: "Pelapor mengonfirmasi resolusi. Laporan ditutup." },
        ],
        createdAt: created, updatedAt: closed,
      }));
    }

    // A5: Tiket dibatalkan oleh admin — 3 tiket
    for (let i = 0; i < 3; i++) {
      const mhsId = pickRandom(mahasiswaIds);
      const svc = pickRandom(services);
      const created = daysAgo(10 + Math.floor(Math.random() * 20));
      const cancelled = new Date(created.getTime() + 3600000 * 6);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: mhsId, mahasiswaNama: mahasiswaNameMap[mhsId],
        isGuest: false, status: "Dibatalkan", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Masuk", timestamp: created, actor: "sistem", note: "Laporan baru diterima oleh sistem." },
          { status: "Dibatalkan", timestamp: cancelled, actor: admin, note: "Laporan duplikat / tidak relevan." },
        ],
        createdAt: created, updatedAt: cancelled,
      }));
    }

    // ──────────────────────────────────────────────────────────
    // SKENARIO B: Tiket Tamu (Guest) — Berbagai tahap lifecycle
    // ──────────────────────────────────────────────────────────
    const publicServices = services.filter(s => s.isPublic === true);

    // B1: Tamu — Pending Verifikasi (baru masuk, belum diverifikasi) — 5 tiket
    for (let i = 0; i < 5; i++) {
      const svc = pickRandom(publicServices);
      const gName = pickRandom(guestNames);
      const gContact = pickRandom(guestContacts);
      const pin = generateGuestPin();
      const created = daysAgo(Math.floor(Math.random() * 3));
      ticketsData.push(buildTicket({
        svc, mahasiswaId: "PUBLIC_GUEST", isGuest: true,
        guestName: gName, guestContact: gContact, guestPin: pin,
        status: "Pending Verifikasi", assigneeId: null,
        statusHistory: [
          { status: "Pending Verifikasi", timestamp: created, actor: "sistem", note: "Laporan masuk dari pelaporan publik — menunggu verifikasi admin." },
        ],
        createdAt: created, updatedAt: created,
      }));
      console.log(`   🎫 Tamu (Pending): ${gName} | PIN: ${pin}`);
    }

    // B2: Tamu — Sudah diverifikasi / Masuk ke antrean — 4 tiket
    for (let i = 0; i < 4; i++) {
      const svc = pickRandom(publicServices);
      const gName = pickRandom(guestNames);
      const gContact = pickRandom(guestContacts);
      const pin = generateGuestPin();
      const created = daysAgo(5 + Math.floor(Math.random() * 5));
      const verified = new Date(created.getTime() + 3600000 * 4);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: "PUBLIC_GUEST", isGuest: true,
        guestName: gName, guestContact: gContact, guestPin: pin,
        status: "Masuk", assigneeId: null,
        statusHistory: [
          { status: "Pending Verifikasi", timestamp: created, actor: "sistem", note: "Laporan masuk dari pelaporan publik — menunggu verifikasi admin." },
          { status: "Masuk", timestamp: verified, actor: admin, note: "Laporan tamu telah diverifikasi dan masuk antrean." },
        ],
        createdAt: created, updatedAt: verified,
      }));
      console.log(`   🎫 Tamu (Masuk): ${gName} | PIN: ${pin}`);
    }

    // B3: Tamu — Sedang diproses admin — 3 tiket
    for (let i = 0; i < 3; i++) {
      const svc = pickRandom(publicServices);
      const gName = pickRandom(guestNames);
      const gContact = pickRandom(guestContacts);
      const pin = generateGuestPin();
      const created = daysAgo(8 + Math.floor(Math.random() * 7));
      const verified = new Date(created.getTime() + 3600000 * 3);
      const processed = new Date(verified.getTime() + 3600000 * 12);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: "PUBLIC_GUEST", isGuest: true,
        guestName: gName, guestContact: gContact, guestPin: pin,
        status: "Diproses", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Pending Verifikasi", timestamp: created, actor: "sistem", note: "Laporan masuk dari pelaporan publik — menunggu verifikasi admin." },
          { status: "Masuk", timestamp: verified, actor: admin, note: "Laporan tamu telah diverifikasi." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Sedang ditindaklanjuti oleh admin." },
        ],
        createdAt: created, updatedAt: processed,
      }));
      console.log(`   🎫 Tamu (Diproses): ${gName} | PIN: ${pin}`);
    }

    // B4: Tamu — Selesai (menunggu konfirmasi tamu = uji Self-Service Resolution) — 3 tiket
    for (let i = 0; i < 3; i++) {
      const svc = pickRandom(publicServices);
      const gName = pickRandom(guestNames);
      const gContact = pickRandom(guestContacts);
      const pin = generateGuestPin();
      const created = daysAgo(12 + Math.floor(Math.random() * 10));
      const verified = new Date(created.getTime() + 3600000 * 2);
      const processed = new Date(verified.getTime() + 3600000 * 8);
      const finished = new Date(processed.getTime() + 3600000 * 24);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: "PUBLIC_GUEST", isGuest: true,
        guestName: gName, guestContact: gContact, guestPin: pin,
        status: "Selesai", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Pending Verifikasi", timestamp: created, actor: "sistem", note: "Laporan masuk dari pelaporan publik." },
          { status: "Masuk", timestamp: verified, actor: admin, note: "Laporan tamu valid dan masuk antrean." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Pengerjaan dimulai." },
          { status: "Selesai", timestamp: finished, actor: admin, note: "Pekerjaan selesai. Silakan pelapor konfirmasi via pelacakan." },
        ],
        createdAt: created, updatedAt: finished,
      }));
      console.log(`   🎫 Tamu (Selesai — UJI TERIMA/KOMPLAIN): ${gName} | PIN: ${pin}`);
    }

    // B5: Tamu — Komplain (uji siklus umpan balik) — 2 tiket
    for (let i = 0; i < 2; i++) {
      const svc = pickRandom(publicServices);
      const gName = pickRandom(guestNames);
      const gContact = pickRandom(guestContacts);
      const pin = generateGuestPin();
      const created = daysAgo(18 + Math.floor(Math.random() * 10));
      const verified = new Date(created.getTime() + 3600000 * 2);
      const processed = new Date(verified.getTime() + 3600000 * 6);
      const finished = new Date(processed.getTime() + 3600000 * 24);
      const complained = new Date(finished.getTime() + 3600000 * 12);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: "PUBLIC_GUEST", isGuest: true,
        guestName: gName, guestContact: gContact, guestPin: pin,
        status: "Komplain", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Pending Verifikasi", timestamp: created, actor: "sistem", note: "Laporan masuk dari pelaporan publik." },
          { status: "Masuk", timestamp: verified, actor: admin, note: "Laporan tamu diverifikasi." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Sedang ditangani." },
          { status: "Selesai", timestamp: finished, actor: admin, note: "Pekerjaan selesai." },
          { status: "Komplain", timestamp: complained, actor: "Tamu Publik", note: "[Komplain] Masalah belum teratasi. Internet masih sering putus." },
        ],
        createdAt: created, updatedAt: complained,
      }));
      console.log(`   🎫 Tamu (Komplain): ${gName} | PIN: ${pin}`);
    }

    // B6: Tamu — Ditutup (resolusi diterima) — 2 tiket
    for (let i = 0; i < 2; i++) {
      const svc = pickRandom(publicServices);
      const gName = pickRandom(guestNames);
      const gContact = pickRandom(guestContacts);
      const pin = generateGuestPin();
      const created = daysAgo(25 + Math.floor(Math.random() * 15));
      const verified = new Date(created.getTime() + 3600000 * 3);
      const processed = new Date(verified.getTime() + 3600000 * 10);
      const finished = new Date(processed.getTime() + 3600000 * 36);
      const closed = new Date(finished.getTime() + 3600000 * 12);
      const admin = adminNameMap[svc.departmentId];
      ticketsData.push(buildTicket({
        svc, mahasiswaId: "PUBLIC_GUEST", isGuest: true,
        guestName: gName, guestContact: gContact, guestPin: pin,
        status: "Ditutup", assigneeId: adminIdMap[svc.departmentId],
        statusHistory: [
          { status: "Pending Verifikasi", timestamp: created, actor: "sistem", note: "Laporan masuk dari pelaporan publik." },
          { status: "Masuk", timestamp: verified, actor: admin, note: "Laporan tamu terverifikasi." },
          { status: "Diproses", timestamp: processed, actor: admin, note: "Pengerjaan dimulai." },
          { status: "Selesai", timestamp: finished, actor: admin, note: "Layanan telah selesai dilaksanakan." },
          { status: "Ditutup", timestamp: closed, actor: "Tamu Publik", note: "Laporan telah diverifikasi dan ditutup oleh tamu pelapor." },
        ],
        createdAt: created, updatedAt: closed,
      }));
      console.log(`   🎫 Tamu (Ditutup): ${gName} | PIN: ${pin}`);
    }

    // ══════════════════════════════════════════════════════════
    // Insert semua tiket sekaligus
    // ══════════════════════════════════════════════════════════
    await Ticket.insertMany(ticketsData, { timestamps: false });

    console.log(`\n✅ Seed selesai!`);
    console.log(`   📦 ${ticketsData.length} tiket total`);
    console.log(`   👤 ${ticketsData.filter(t => !t.isGuest).length} tiket mahasiswa`);
    console.log(`   🌐 ${ticketsData.filter(t => t.isGuest).length} tiket tamu`);
    console.log(`\n   ⚠  Catat PIN tamu di atas untuk testing fitur Lacak Laporan!`);
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
