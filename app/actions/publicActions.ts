"use server";

import { revalidatePath } from "next/cache";

import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Service from "@/models/Service";
import Ticket from "@/models/Ticket";
import Department from "@/models/Department";

// ============================================================
// Generator: Custom Ticket ID (sama dengan ticketActions.ts)
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
// Tipe Data: PublicFeedItem
// dynamicData TIDAK pernah diekspos ke client (privasi pelapor)
// ============================================================
export interface PublicFeedItem {
  _id: string;
  ticketId: string;
  namaLayanan: string;
  departmentName: string;
  status: string;
  createdAt: string;
  dynamicData?: Record<string, unknown>;
  formSnapshot?: any[];
}

// ============================================================
// 1. getPublicFeed()
//
//    Mengambil 10 tiket terbaru yang statusnya bukan
//    "Pending Verifikasi" (karantina) & bukan "Dibatalkan".
//    Hanya field publik-safe yang di-return — dynamicData
//    & mahasiswaId TIDAK diikutsertakan untuk mencegah
//    kebocoran privasi.
// ============================================================
export async function getPublicFeed(): Promise<PublicFeedItem[]> {
  try {
    await dbConnect();

    const tickets = await Ticket.find({
      // Sembunyikan tiket karantina & tiket yang dibatalkan dari feed publik
      status: { $nin: ["Pending Verifikasi", "Dibatalkan"] },
      isDeleted: { $ne: true }
    })
      // Hanya ambil field yang aman untuk publik — TANPA dynamicData!
      .select("ticketId serviceId namaLayanan status createdAt")
      .populate("serviceId", "namaLayanan") // join nama layanan saja
      .sort({ createdAt: -1 })              // indeks createdAt-1 aktif di sini
      .limit(10)
      .lean();

    return tickets.map((t) => ({
      _id: String(t._id),
      ticketId: (t as any).ticketId || "",
      namaLayanan: (t as any).namaLayanan || (t.serviceId as any)?.namaLayanan || "Layanan Umum",
      departmentName: (t as any).departmentName || "General",
      status: (t as any).status || "Masuk",
      createdAt: t.createdAt
        ? new Date(t.createdAt as any).toISOString()
        : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("[publicActions] getPublicFeed error:", error);
    return [];
  }
}

// ============================================================
// 2. getPublicServices()
//
//    Mengambil daftar layanan yang boleh diakses publik (isPublic: true)
//    dan berstatus Aktif untuk digunakan di form tamu.
// ============================================================
export async function getPublicServices(): Promise<any[]> {
  try {
    await dbConnect();
    const services = await Service.find({ 
      isPublic: true, 
      isActive: true,
      isDeleted: { $ne: true } 
    })
      .select("namaLayanan departmentId formBuilder")
      .lean();

    return services.map((s) => ({
      _id: String(s._id),
      namaLayanan: s.namaLayanan,
      departmentId: s.departmentId,
      formBuilder: s.formBuilder || [],
    }));
  } catch (error) {
    console.error("[publicActions] getPublicServices error:", error);
    return [];
  }
}


// ============================================================
// 2. submitPublicTicket()
//
//    Memproses submit form dari tamu/publik (tanpa login).
//    Dua perbedaan utama dari submitTicketFormData biasa:
//
//    a. mahasiswaId = "PUBLIC_GUEST"  (tidak dari session)
//    b. status      = "Pending Verifikasi"  (harus disetujui
//       admin sebelum masuk antrian normal)
// ============================================================
export async function submitPublicTicket(formData: FormData): Promise<{
  success?: boolean;
  ticketId?: string;
  guestPin?: string;
  message?: string;
  error?: string;
}> {
  try {
    await dbConnect();

    // 1. Ambil serviceId dari form
    const serviceId = formData.get("serviceId") as string | null;
    if (!serviceId) {
      return { error: "Pilih kategori layanan terlebih dahulu." };
    }

    // 2. Validasi service: harus ada, aktif, DAN isPublic === true
    const service = await Service.findById(serviceId).lean();
    if (!service) {
      return { error: "Layanan tidak ditemukan." };
    }
    if (!service.isActive) {
      return { error: "Layanan ini sedang tidak aktif." };
    }
    if (!service.isPublic) {
      // Keamanan: cegah submit ke layanan non-publik via manipulasi form
      return { error: "Layanan ini tidak tersedia untuk pelaporan publik." };
    }

    const guestName = (formData.get("guestName") as string)?.trim();
    const guestContact = (formData.get("guestContact") as string)?.trim();

    if (!guestName || !guestContact) {
      return { error: "Nama dan Kontak Pelapor wajib diisi." };
    }

    // 3. Buat upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // 4. Loop formBuilder -> bangun dynamicData
    const dynamicData: Record<string, unknown> = {};

    for (const field of service.formBuilder) {
      if (field.type === "file") {
        const file = formData.get(field.id) as File | null;

        if (field.isRequired && (!file || file.size === 0)) {
          return { error: `File "${field.label}" wajib diunggah.` };
        }

        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const ext = path.extname(file.name) || ".bin";
          const safeName = `pub-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}${ext}`;
          await fs.writeFile(path.join(uploadDir, safeName), buffer);
          dynamicData[field.id] = `/uploads/${safeName}`;
        }
      } else {
        const value = formData.get(field.id) as string | null;

        if (field.isRequired && (!value || !value.trim())) {
          return { error: `Field "${field.label}" wajib diisi.` };
        }

        if (value !== null && value !== "") {
          dynamicData[field.id] = value.trim();
        }
      }
    }

    // 5. Generate Ticket ID & PIN
    const ticketId = generateTicketId();
    
    // Generate 6 digit angka acak (misal: 102938)
    const guestPin = Math.floor(100000 + Math.random() * 900000).toString();

    const prioritas = service.defaultPrioritas || "Sedang";

    // 5b. Fetch nama departemen untuk snapshot Self-Contained
    const dept = await Department.findOne({ departmentId: service.departmentId }).lean();

    // 6. Simpan tiket dengan modifikasi keamanan:
    //    - mahasiswaId  = "PUBLIC_GUEST"
    //    - status       = "Pending Verifikasi" (karantina admin)
    await Ticket.create({
      ticketId,
      mahasiswaId: "PUBLIC_GUEST",             // ← injeksi paksa
      departmentId: service.departmentId,
      departmentName: dept?.namaDepartemen || service.departmentId, // ← Snapshot
      serviceId: new mongoose.Types.ObjectId(serviceId),
      namaLayanan: service.namaLayanan,         // ← Snapshot
      status: "Pending Verifikasi",             // ← karantina
      prioritas,
      isGuest: true,
      guestName,
      guestContact,
      guestPin,
      dynamicData,
      formSnapshot: service.formBuilder.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        isRequired: f.isRequired,
        ...(f.options ? { options: f.options } : {}),
      })),
      statusHistory: [
        {
          status: "Pending Verifikasi",
          timestamp: new Date(),
          actor: "sistem",
          note: "Laporan masuk dari pelaporan publik — menunggu verifikasi admin.",
        },
      ],
    });

    return {
      success: true,
      ticketId,
      guestPin,
      message: "Laporan berhasil dikirim!",
    };
  } catch (error) {
    console.error("[publicActions] submitPublicTicket error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}

// ============================================================
// 3. trackPublicTicket()
//
//    Fitur Self-Service Guest Tracking menggunakan PIN Rahasia
// ============================================================
export async function trackPublicTicket(ticketId: string, guestPin: string) {
  try {
    await dbConnect();
    
    // Cari berdsrkan ID & PIN
    const ticket = await Ticket.findOne({
      ticketId: ticketId.trim(),
      guestPin: guestPin.trim(),
      isGuest: true,
      isDeleted: { $ne: true }
    }).populate("serviceId", "namaLayanan").lean();

    if (!ticket) {
      // ── Anti Brute-Force: delay artifisial saat gagal ──
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { error: "ID Tiket atau PIN tidak valid." };
    }

    const t = ticket as any;
    return {
      success: true,
      ticket: {
        ticketId: t.ticketId,
        guestName: t.guestName,
        namaLayanan: t.namaLayanan || t.serviceId?.namaLayanan || "Layanan Umum",
        status: t.status,
        prioritas: t.prioritas,
        waktuMasuk: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        // Sanitasi: Sembunyikan catatan yang ditandai sebagai internal
        statusHistory: (t.statusHistory || [])
          .filter((h: any) => !h.note?.startsWith("[Internal]"))
          .map((h: any) => ({
            status: h.status,
            timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : new Date().toISOString(),
            note: h.note || ""
          }))
      }
    };
  } catch (error) {
    console.error("[publicActions] trackPublicTicket error:", error);
    // Anti Brute-Force juga saat error server
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { error: "ID Tiket atau PIN tidak valid." };
  }
}

// ============================================================
// 4. guestConfirmTicketClosed()
//    Menutup tiket tamu ketika mereka menekan Terima Resolusi
// ============================================================
export async function guestConfirmTicketClosed(ticketId: string, guestPin: string) {
  try {
    await dbConnect();
    const result = await Ticket.findOneAndUpdate(
      { ticketId: ticketId.trim(), guestPin: guestPin.trim(), isGuest: true, status: "Selesai" },
      {
        $set: { status: "Ditutup" },
        $push: {
          statusHistory: {
            status: "Ditutup",
            timestamp: new Date(),
            actor: "Tamu Publik",
            note: "Laporan telah diverifikasi dan ditutup oleh tamu pelapor.",
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { error: "ID Tiket atau PIN tidak valid." };
    }
    return { success: true, message: "Resolusi diterima. Laporan berhasil ditutup." };
  } catch (error) {
    console.error("Guest confirm ticket closed error:", error);
    return { error: "Terjadi kesalahan server." };
  }
}

// ============================================================
// 5. guestReopenTicket()
//    Mengirim status komplain dengan PIN tamu
// ============================================================
export async function guestReopenTicket(ticketId: string, guestPin: string, complaintNote: string) {
  try {
    if (!complaintNote.trim()) return { error: "Alasan komplain wajib diisi." };

    await dbConnect();
    const result = await Ticket.findOneAndUpdate(
      { ticketId: ticketId.trim(), guestPin: guestPin.trim(), isGuest: true, status: "Selesai" },
      {
        $set: { status: "Komplain" },
        $push: {
          statusHistory: {
            status: "Komplain",
            timestamp: new Date(),
            actor: "Tamu Publik",
            note: `[Komplain] ${complaintNote}`,
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { error: "ID Tiket atau PIN tidak valid." };
    }
    return { success: true, message: "Komplain dikirim. Laporan akan diproses kembali." };
  } catch (error) {
    console.error("Guest reopen ticket error:", error);
    return { error: "Terjadi kesalahan server." };
  }
}

// ============================================================
// 6. getTransparencyTickets()
//
//    Fitur Inti: Papan Transparansi Publik 
    //    - Menampilkan 50 tiket terbaru
    //    - Filter by Service.publishToTransparencyBoard: true
    //    - Filter by Ticket.isForcePrivate: false
// ============================================================
export async function getTransparencyTickets(): Promise<PublicFeedItem[]> {
  try {
    await dbConnect();

    // 1. Ambil Layanan yang membolehkan transparansi
    const publicServices = await Service.find({ 
      publishToTransparencyBoard: true,
      isDeleted: { $ne: true }
    }).select("_id").lean();
    
    const publicServiceIds = publicServices.map(s => s._id);

    // 2. Fetch Tiket
    const tickets = await Ticket.find({
      serviceId: { $in: publicServiceIds },
      isForcePrivate: { $ne: true },
      status: { $nin: ["Pending Verifikasi", "Dibatalkan"] },
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    // 3. Sanitasi Ketat (PII Masking)
    return tickets.map((t: any) => {
      const sanitizedData: Record<string, unknown> = {};
      const formSnapshot = t.formSnapshot || [];
      const rawData = t.dynamicData instanceof Map 
        ? Object.fromEntries(t.dynamicData) 
        : (t.dynamicData || {});

      // Hanya masukkan field yang BUKAN file dan bukan PII
      formSnapshot.forEach((field: any) => {
        if (field.type !== "file") {
          sanitizedData[field.id] = rawData[field.id] || "-";
        } else {
          sanitizedData[field.id] = "[Lampiran Disembunyikan]";
        }
      });

      return {
        _id: String(t._id),
        ticketId: t.ticketId,
        namaLayanan: t.namaLayanan,
        departmentName: t.departmentName,
        status: t.status,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        dynamicData: sanitizedData,
        formSnapshot: formSnapshot.map((f: any) => ({
          id: f.id,
          label: f.label,
          type: f.type
        }))
      };
    });
  } catch (error) {
    console.error("[publicActions] getTransparencyTickets error:", error);
    return [];
  }
}
