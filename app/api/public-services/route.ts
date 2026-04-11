import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Service from "@/models/Service";

/**
 * GET /api/public-services
 *
 * Mengembalikan daftar layanan yang:
 *   - isActive = true
 *   - isPublic = true
 *
 * Endpoint ini dipanggil oleh LandingClient (client component)
 * untuk mengisi dropdown layanan pada modal Form Publik.
 *
 * Keamanan:
 * - tidak mengembalikan departmentId atau field internal sensitif
 * - hanya namaLayanan + formBuilder yang diekspos
 */
export async function GET() {
  try {
    await dbConnect();

    const services = await Service.find({
      isActive: true,
      isPublic: true,
    })
      .select("_id namaLayanan departmentId formBuilder")
      .sort({ namaLayanan: 1 })
      .lean();

    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    console.error("[api/public-services] GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar layanan." },
      { status: 500 }
    );
  }
}
