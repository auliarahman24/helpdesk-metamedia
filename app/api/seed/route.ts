export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

export async function GET() {
  try {
    await seedDatabase();

    return NextResponse.json({
      success: true,
      message: "Database berhasil di-reset dengan data produksi terbaru"
    });
  } catch (error: any) {
    console.error("API Seed Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
