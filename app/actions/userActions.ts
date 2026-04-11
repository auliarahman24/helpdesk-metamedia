"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function updateUser(
  nim_nip: string,
  payload: {
    nama: string;
    role: "mahasiswa" | "admin_departemen" | "superadmin";
    password?: string;
  }
) {
  try {
    await dbConnect();

    const user = await User.findOne({ nim_nip });
    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    user.nama = payload.nama;
    user.role = payload.role;

    if (payload.password) {
      user.password = payload.password;
    }

    await user.save();

    revalidatePath("/users");

    return {
      success: true,
      message: `Data pengguna ${nim_nip} berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("Update user error:", error);
    return { success: false, error: "Terjadi kesalahan server saat memperbarui pengguna." };
  }
}

export async function importUsersCsvMock() {
  try {
    // Simulasi delay pembacaan file
    await new Promise((resolve) => setTimeout(resolve, 1500));

    revalidatePath("/users");

    return {
      success: true,
      message: "Simulasi Import CSV berhasil! (Fitur backend belum diaktifkan seutuhnya di MVP)",
    };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan mockup import." };
  }
}
