"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function loginUser(formData: FormData) {
  const nim_nip = formData.get("nim_nip") as string;
  const password = formData.get("password") as string;

  // Validasi input
  if (!nim_nip || !password) {
    return { error: "NIM/NIP dan Password wajib diisi." };
  }

  try {
    await dbConnect();

    // Cari user berdasarkan nim_nip
    const user = await User.findOne({ nim_nip });

    if (!user) {
      return { error: "NIM/NIP tidak ditemukan." };
    }

    // Blokir login untuk user yang sudah dinonaktifkan (soft deleted)
    if (user.isDeleted) {
      return { error: "Akun Anda telah dinonaktifkan. Hubungi administrator." };
    }

    // Cek password (plain text untuk demo MVP)
    if (user.password !== password) {
      return { error: "Password salah." };
    }

    // Set cookie session
    const sessionData = JSON.stringify({
      nim_nip: user.nim_nip,
      role: user.role,
      nama: user.nama,
      departmentId: user.departmentId || null,
    });

    const cookieStore = await cookies();
    cookieStore.set("user_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    // Redirect berdasarkan role
    if (user.role === "superadmin") {
      redirect("/sa-dashboard");
    } else if (user.role === "admin_departemen") {
      redirect("/workspace");
    } else {
      redirect("/dashboard");
    }
  } catch (error) {
    // redirect() throws NEXT_REDIRECT — harus di-throw ulang
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Login error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value) as { nim_nip: string; role: string; nama: string; departmentId?: string };
  } catch {
    return null;
  }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  try {
    const session = await getSession();
    if (!session || !session.nim_nip) {
      return { success: false, error: "Sesi tidak valid." };
    }

    await dbConnect();
    const user = await User.findOne({ nim_nip: session.nim_nip });
    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    // Untuk MVP kita menggunakan plain text perbandingan, kedepannya bcrypt.compare
    if (user.password !== oldPassword) {
      return { success: false, error: "Password lama tidak sesuai." };
    }

    user.password = newPassword;
    await user.save();

    return { success: true, message: "Password berhasil diubah!" };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error: "Terjadi kesalahan server." };
  }
}
