"use server";

import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Service from "@/models/Service";
import Ticket from "@/models/Ticket";

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
  ticketId: string;
  namaLayanan: string;    // dari populate serviceId
  status: string;
  createdAt: string;      // ISO string (serializable)
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
    })
      // Hanya ambil field yang aman untuk publik — TANPA dynamicData!
      .select("ticketId serviceId status createdAt")
      .populate("serviceId", "namaLayanan") // join nama layanan saja
      .sort({ createdAt: -1 })              // indeks createdAt-1 aktif di sini
      .limit(10)
      .lean();

    return tickets.map((t) => ({
      ticketId: (t as any).ticketId || "",
      namaLayanan: (t.serviceId as any)?.namaLayanan || "Layanan Umum",
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

    // 5. Generate Ticket ID
    const ticketId = generateTicketId();

    // 6. Simpan tiket dengan 2 modifikasi keamanan utama:
    //    - mahasiswaId  = "PUBLIC_GUEST"  (bukan dari session)
    //    - status       = "Pending Verifikasi"  (karantina admin)
    await Ticket.create({
      ticketId,
      mahasiswaId: "PUBLIC_GUEST",             // ← injeksi paksa, bukan dari input
      departmentId: service.departmentId,
      serviceId: new mongoose.Types.ObjectId(serviceId),
      status: "Pending Verifikasi",             // ← karantina, bukan "Masuk"
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
      message:
        "Laporan berhasil dikirim! Nomor tiket Anda adalah " +
        ticketId +
        ". Simpan nomor ini untuk memantau status laporan Anda.",
    };
  } catch (error) {
    console.error("[publicActions] submitPublicTicket error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}
