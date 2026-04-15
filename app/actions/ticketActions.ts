"use server";

import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Service from "@/models/Service";
import Ticket from "@/models/Ticket";
import mongoose from "mongoose";
import { getSession } from "@/app/actions/authActions";

// ============================================================
// AUTO-CLOSE SLA (Lazy Evaluation)
// Menutup tiket "Selesai" jika sudah tidak ada respons selama > 72 jam
// ============================================================
async function applyAutoCloseSLA() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setHours(threeDaysAgo.getHours() - 72);

  await Ticket.updateMany(
    { status: "Selesai", updatedAt: { $lt: threeDaysAgo } },
    {
      $set: { status: "Ditutup" },
      $push: {
        statusHistory: {
          status: "Ditutup",
          timestamp: new Date(),
          actor: "sistem",
          note: "Ditutup otomatis oleh sistem karena tidak ada respons.",
        },
      },
    }
  );
}

// ============================================================
// Generator: Custom Ticket ID Format Enterprise
// Format: TKT-YYMMDD-XXXX (contoh: TKT-260411-A8B2)
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
// Tipe data FormField (Fully Dynamic — tipe baru)
// ============================================================
export interface FormFieldData {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "file";
  isRequired: boolean;
  options?: string[];
}

// ============================================================
// Tipe data ServiceData (untuk form pengajuan mahasiswa)
// ============================================================
export interface ServiceData {
  _id: string;
  namaLayanan: string;
  departmentId: string;
  formBuilder: FormFieldData[];
}

// ============================================================
// Fetch semua service AKTIF (untuk form pengajuan mahasiswa)
// Hanya menampilkan layanan dengan isActive === true
// ============================================================
export async function getActiveServices(): Promise<ServiceData[]> {
  await dbConnect();

  const services = await Service.find({ isActive: true, isDeleted: { $ne: true } })
    .select("namaLayanan departmentId formBuilder")
    .lean();

  return services.map((s) => ({
    _id: String(s._id),
    namaLayanan: s.namaLayanan,
    departmentId: s.departmentId,
    formBuilder: (s.formBuilder || []).map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type as "text" | "textarea" | "select" | "file",
      isRequired: f.isRequired,
      ...(f.options ? { options: f.options } : {}),
    })),
  }));
}

// ============================================================
// Submit Tiket Baru — Menerima FormData (multipart)
// Keamanan: mahasiswaId diambil dari session, BUKAN dari form
// ============================================================
export async function submitTicketFormData(formData: FormData) {
  try {
    await dbConnect();

    // 1. Ambil session dari cookie (mahasiswaId bukan dari input user)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("user_session");
    if (!sessionCookie) {
      return { error: "Anda belum login. Silakan login terlebih dahulu." };
    }
    const session = JSON.parse(sessionCookie.value) as {
      nim_nip: string;
      role: string;
      nama: string;
    };

    // 2. Ambil serviceId dari FormData
    const serviceId = formData.get("serviceId") as string;
    if (!serviceId) {
      return { error: "Pilih kategori layanan terlebih dahulu." };
    }

    // 3. Fetch service dari DB untuk validasi & snapshot
    const service = await Service.findById(serviceId).lean();
    if (!service) {
      return { error: "Layanan tidak ditemukan." };
    }
    if (!service.isActive) {
      return { error: "Layanan ini sedang tidak aktif." };
    }

    // 4. Buat upload directory jika belum ada
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // 5. Loop formSnapshot untuk membangun dynamicData
    //    Pisahkan antara field teks biasa dan field file
    const dynamicData: Record<string, unknown> = {};

    for (const field of service.formBuilder) {
      if (field.type === "file") {
        // ── Penanganan File Upload ──
        const file = formData.get(field.id) as File | null;

        if (field.isRequired && (!file || file.size === 0)) {
          return { error: `File "${field.label}" wajib diunggah.` };
        }

        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const ext = path.extname(file.name) || ".bin";
          const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
          await fs.writeFile(path.join(uploadDir, safeName), buffer);
          // Simpan URL relatif ke dynamicData
          dynamicData[field.id] = `/uploads/${safeName}`;
        }
      } else {
        // ── Penanganan Field Teks / Select ──
        const value = formData.get(field.id) as string | null;

        if (field.isRequired && (!value || !value.trim())) {
          return { error: `Field "${field.label}" wajib diisi.` };
        }

        if (value !== null && value !== "") {
          dynamicData[field.id] = value.trim();
        }
      }
    }

    // 6. Generate custom ticketId
    const ticketId = generateTicketId();

    // Ambil prioritas auto-inherit dari Master Layanan
    const prioritas = service.defaultPrioritas || "Sedang";

    // 7. Simpan tiket ke database
    const ticket = await Ticket.create({
      ticketId,
      mahasiswaId: session.nim_nip,   // ← injeksi dari session, bukan form input
      mahasiswaNama: session.nama,    // ← denormalized: nama pelapor disimpan langsung
      departmentId: service.departmentId,
      serviceId: new mongoose.Types.ObjectId(serviceId),
      status: "Masuk",
      prioritas,
      dynamicData,
      // Point-in-Time Snapshot: rekam form persis saat tiket dibuat
      formSnapshot: service.formBuilder.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        isRequired: f.isRequired,
        ...(f.options ? { options: f.options } : {}),
      })),
      statusHistory: [
        {
          status: "Masuk",
          actor: "sistem",
          note: "",
          timestamp: new Date(),
        },
      ],
    });

    return {
      success: true,
      ticketId: ticket.ticketId,
      message: "Laporan berhasil diajukan!",
    };
  } catch (error) {
    console.error("Submit ticket error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}

// ============================================================
// Tipe TicketRow — untuk tabel admin & dashboard mahasiswa
// ============================================================
export interface TicketRow {
  _id: string;
  ticketId: string;
  mahasiswaId: string;
  mahasiswaNama: string;
  departmentId: string;
  serviceId: string;
  namaLayanan: string;           // dari populate Service
  status: string;
  prioritas: string;
  assigneeId: string | null;
  isGuest?: boolean;
  guestName?: string;
  guestContact?: string;
  statusTerkini: string;         // alias status (backward compat UI)
  dynamicData: Record<string, unknown>;
  formSnapshot: FormFieldData[];
  statusHistory: {
    status: string;
    timestamp: string;
    actor: string;
    note: string;
  }[];
  waktuMasuk: string;            // dari createdAt
}

// Helper: konversi lean document ke TicketRow
function mapToTicketRow(t: any): TicketRow {
  const history: any[] = t.statusHistory || [];
  // dynamicData dari Map Mongoose → plain object saat lean()
  const dynData: Record<string, unknown> =
    t.dynamicData instanceof Map
      ? Object.fromEntries(t.dynamicData)
      : (t.dynamicData as Record<string, unknown>) || {};

  return {
    _id: String(t._id),
    ticketId: t.ticketId || "",
    mahasiswaId: t.mahasiswaId || "",
    mahasiswaNama: t.mahasiswaNama || "",
    departmentId: t.departmentId || "",
    serviceId: t.serviceId?._id
      ? String(t.serviceId._id)
      : String(t.serviceId),
    namaLayanan: t.serviceId?.namaLayanan || "",  // hasil populate
    status: t.status || "Masuk",
    prioritas: t.prioritas || "Sedang",
    assigneeId: t.assigneeId || null,
    isGuest: t.isGuest || false,
    guestName: t.guestName || "",
    guestContact: t.guestContact || "",
    statusTerkini: t.status || "Masuk",
    dynamicData: dynData,
    formSnapshot: (t.formSnapshot || []) as FormFieldData[],
    statusHistory: history.map((h) => ({
      status: h.status || "",
      timestamp: h.timestamp
        ? new Date(h.timestamp).toISOString()
        : new Date().toISOString(),
      actor: h.actor || "",
      note: h.note || "",
    })),
    waktuMasuk: t.createdAt
      ? new Date(t.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

// ============================================================
// Fetch tiket by departmentId (untuk Admin Departemen)
// ============================================================
export async function getTicketsByDepartment(
  departmentId: string
): Promise<TicketRow[]> {
  await dbConnect();
  await applyAutoCloseSLA();

  const tickets = await Ticket.find({ departmentId })
    .select("-dynamicData -formSnapshot")  // ← optimasi: exclude field berat dari tabel
    .populate("serviceId", "namaLayanan")  // join service name
    .sort({ createdAt: -1 })
    .lean();

  return tickets.map(mapToTicketRow);
}

// ============================================================
// Fetch semua tiket (untuk Super Admin Monitoring)
// ============================================================
export async function getAllTickets(): Promise<TicketRow[]> {
  await dbConnect();
  await applyAutoCloseSLA();

  const tickets = await Ticket.find({})
    .populate("serviceId", "namaLayanan")
    .sort({ createdAt: -1 })
    .lean();

  return tickets.map(mapToTicketRow);
}

// ============================================================
// Fetch tiket milik mahasiswa yang login (untuk dashboard mahasiswa)
// ============================================================
export async function getMyTickets(): Promise<TicketRow[]> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  if (!sessionCookie) return [];

  const session = JSON.parse(sessionCookie.value) as { nim_nip: string };
  await dbConnect();
  await applyAutoCloseSLA();

  const tickets = await Ticket.find({ mahasiswaId: session.nim_nip })
    .select("-dynamicData -formSnapshot -statusHistory")
    .populate("serviceId", "namaLayanan")
    .sort({ createdAt: -1 })
    .lean();

  return tickets.map(mapToTicketRow);
}

// ============================================================
// Tipe TicketDetail — untuk halaman tracking detail
// ============================================================
export interface TicketDetail {
  _id: string;
  ticketId: string;
  mahasiswaId: string;
  departmentId: string;
  serviceId: string;
  namaLayanan: string;           // dari populate
  status: string;
  prioritas: string;
  dynamicData: Record<string, unknown>;
  formSnapshot: FormFieldData[];
  statusHistory: {
    status: string;
    timestamp: string;
    actor: string;
    note: string;
  }[];
  createdAt: string;
}

// ============================================================
// Fetch 1 tiket by MongoDB _id (untuk halaman tracking)
// ============================================================
export async function getTicketById(id: string): Promise<TicketDetail | null> {
  try {
    // ── Security: Validasi sesi pengguna (IDOR Patch) ──
    const session = await getSession();
    if (!session) return null; // Unauthorized — tidak ada sesi aktif

    await dbConnect();

    const ticket = await Ticket.findById(id)
      .populate("serviceId", "namaLayanan")
      .lean();
    if (!ticket) return null;

    // ── Security: Ownership check untuk mahasiswa ──
    // Mahasiswa hanya bisa melihat tiket miliknya sendiri
    if (session.role === "mahasiswa" && ticket.mahasiswaId !== session.nim_nip) {
      return null; // Forbidden — triggers notFound() di halaman pemanggil
    }
    // admin_departemen & superadmin: akses penuh ke semua tiket

    const dynData: Record<string, unknown> =
      ticket.dynamicData instanceof Map
        ? Object.fromEntries(ticket.dynamicData)
        : (ticket.dynamicData as Record<string, unknown>) || {};

    return {
      _id: String(ticket._id),
      ticketId: ticket.ticketId || "",
      mahasiswaId: ticket.mahasiswaId || "",
      departmentId: ticket.departmentId || "",
      serviceId: (ticket.serviceId as any)?._id
        ? String((ticket.serviceId as any)._id)
        : String(ticket.serviceId),
      namaLayanan: (ticket.serviceId as any)?.namaLayanan || "",
      status: ticket.status || "Masuk",
      prioritas: ticket.prioritas || "Sedang",
      dynamicData: dynData,
      formSnapshot: (ticket.formSnapshot || []) as FormFieldData[],
      statusHistory: (ticket.statusHistory || []).map((h: any) => ({
        status: h.status || "",
        timestamp: h.timestamp
          ? new Date(h.timestamp).toISOString()
          : new Date().toISOString(),
        actor: h.actor || "",
        note: h.note || "",
      })),
      createdAt: ticket.createdAt
        ? new Date(ticket.createdAt).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Get ticket by id error:", error);
    return null;
  }
}

// ============================================================
// Update status tiket (oleh Admin Departemen)
// Update KEDUA field: status (direct) + $push statusHistory
// ============================================================
export async function updateTicketStatus(
  ticketId: string,
  statusBaru: string,
  catatan: string,
  namaAdmin: string
) {
  try {
    if (statusBaru === "Tertunda" && !catatan.trim()) {
      return { error: "Catatan wajib diisi saat menunda tiket." };
    }

    // ── Security: Validasi sesi admin ──
    const session = await getSession();
    if (!session) return { error: "Sesi tidak valid. Silakan login ulang." };

    await dbConnect();

    // ── Guardrail: Cek kepemilikan tiket (assignee) ──
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return { error: "Tiket tidak ditemukan." };

    if (ticket.assigneeId && ticket.assigneeId !== session.nim_nip) {
      return {
        error: `Akses ditolak. Tiket ini sedang ditangani oleh admin lain.`,
      };
    }

    const result = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        $set: { status: statusBaru },
        $push: {
          statusHistory: {
            status: statusBaru,
            timestamp: new Date(),
            actor: namaAdmin,
            note: catatan,
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return { error: "Tiket tidak ditemukan." };
    }

    return {
      success: true,
      message: `Status tiket berhasil diperbarui ke "${statusBaru}".`,
    };
  } catch (error) {
    console.error("Update ticket status error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}

// ============================================================
// Claim Tiket — Admin "Ambil Alih" tiket dari antrian
// Menggunakan atomic findOneAndUpdate untuk mencegah race condition
// ============================================================
export async function claimTicket(ticketId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin_departemen") {
      return { error: "Hanya admin departemen yang dapat mengambil alih tiket." };
    }

    await dbConnect();

    // Atomic operation: hanya berhasil jika assigneeId masih null
    const result = await Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        assigneeId: null,           // ← guard: hanya jika belum di-claim
        status: "Masuk",            // ← guard: hanya tiket baru
      },
      {
        $set: {
          assigneeId: session.nim_nip,
          status: "Diproses",
        },
        $push: {
          statusHistory: {
            status: "Diproses",
            timestamp: new Date(),
            actor: session.nama,
            note: `Tiket diambil alih oleh ${session.nama}.`,
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      // Cek alasan gagal untuk pesan error yang informatif
      const existing = await Ticket.findById(ticketId).lean();
      if (!existing) {
        return { error: "Tiket tidak ditemukan." };
      }
      if (existing.assigneeId) {
        return { error: "Tiket sudah diambil alih oleh admin lain." };
      }
      if (existing.status !== "Masuk") {
        return { error: `Tiket tidak bisa diambil karena berstatus "${existing.status}".` };
      }
      return { error: "Gagal mengambil tiket. Silakan coba lagi." };
    }

    return {
      success: true,
      message: `Tiket berhasil diambil alih oleh ${session.nama}.`,
    };
  } catch (error) {
    console.error("Claim ticket error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}

// ============================================================
// Konfirmasi Tiket Selesai (oleh Mahasiswa)
// ============================================================
export async function confirmTicketClosed(ticketId: string) {
  try {
    await dbConnect();

    const result = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        $set: { status: "Ditutup" },
        $push: {
          statusHistory: {
            status: "Ditutup",
            timestamp: new Date(),
            actor: "Mahasiswa",
            note: "Laporan telah diverifikasi dan ditutup oleh pelapor.",
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return { error: "Tiket tidak ditemukan." };
    }

    return {
      success: true,
      message: "Tiket berhasil dikonfirmasi dan ditutup.",
    };
  } catch (error) {
    console.error("Confirm ticket closed error:", error);
    return { error: "Terjadi kesalahan server." };
  }
}

// ============================================================
// Batalkan Tiket (oleh Mahasiswa, hanya saat status "Masuk")
// ============================================================
export async function cancelTicket(ticketId: string) {
  try {
    await dbConnect();

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { error: "Tiket tidak ditemukan." };
    }
    if (ticket.status !== "Masuk") {
      return { error: "Hanya tiket berstatus 'Masuk' yang bisa dibatalkan." };
    }

    await Ticket.findByIdAndUpdate(ticketId, {
      $set: { status: "Dibatalkan" },
      $push: {
        statusHistory: {
          status: "Dibatalkan",
          timestamp: new Date(),
          actor: "Mahasiswa",
          note: "Tiket dibatalkan oleh pelapor.",
        },
      },
    });

    return { success: true, message: "Tiket berhasil dibatalkan." };
  } catch (error) {
    console.error("Cancel ticket error:", error);
    return { error: "Terjadi kesalahan server." };
  }
}

// ============================================================
// Reopen Tiket (oleh Mahasiswa, hanya saat status "Selesai")
// ============================================================
export async function reopenTicket(ticketId: string, complaintNote: string) {
  try {
    if (!complaintNote.trim()) {
      return { error: "Alasan komplain wajib diisi." };
    }

    await dbConnect();

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { error: "Tiket tidak ditemukan." };
    }
    if (ticket.status !== "Selesai") {
      return { error: "Hanya tiket berstatus 'Selesai' yang bisa dikomplain." };
    }

    await Ticket.findByIdAndUpdate(ticketId, {
      $set: { status: "Komplain" },
      $push: {
        statusHistory: {
          status: "Komplain",
          timestamp: new Date(),
          actor: "Mahasiswa",
          note: `[Komplain] ${complaintNote}`,
        },
      },
    });

    return { success: true, message: "Laporan berhasil dibuka kembali." };
  } catch (error) {
    console.error("Reopen ticket error:", error);
    return { error: "Terjadi kesalahan server." };
  }
}
