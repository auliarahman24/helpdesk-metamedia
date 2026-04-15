"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import { getSession } from "@/app/actions/authActions";

// ============================================================
// Tipe data untuk client (serialized)
// ============================================================
export interface UserRow {
  _id: string;
  nim_nip: string;
  nama: string;
  role: "mahasiswa" | "admin_departemen" | "superadmin";
  departmentId?: string;
  createdAt: string;
}

// ============================================================
// Fetch semua user aktif (untuk tabel Super Admin)
// Hanya menampilkan user dengan isDeleted !== true
// ============================================================
export async function getUsers(): Promise<UserRow[]> {
  try {
    await dbConnect();

    const users = await User.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    return users.map((u) => ({
      _id: String(u._id),
      nim_nip: u.nim_nip,
      nama: u.nama,
      role: u.role as "mahasiswa" | "admin_departemen" | "superadmin",
      departmentId: u.departmentId || undefined,
      createdAt: u.createdAt
        ? new Date(u.createdAt).toISOString()
        : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Get users error:", error);
    return [];
  }
}

export async function createUser(payload: { nim_nip: string; nama: string; role: string; password?: string; departmentId?: string }) {
  try {
    await dbConnect();
    
    // Validasi duplikat (termasuk user yang sudah soft-deleted)
    const existing = await User.findOne({ nim_nip: payload.nim_nip }).lean();
    if (existing) {
      if ((existing as any).isDeleted) {
        return { success: false, error: `NIM/NIP "${payload.nim_nip}" pernah terdaftar dan telah dihapus. Hubungi administrator untuk mengaktifkan kembali.` };
      }
      return { success: false, error: `Pengguna dengan NIM/NIP "${payload.nim_nip}" sudah terdaftar.` };
    }

    const userData: any = {
      nim_nip: payload.nim_nip,
      nama: payload.nama,
      role: payload.role,
      password: payload.password || "metamedia2026", // default password if empty
    };

    if (payload.role === "admin_departemen" && payload.departmentId) {
      userData.departmentId = payload.departmentId;
    }

    await User.create(userData);

    revalidatePath("/users");

    return { success: true, message: "Pengguna berhasil ditambahkan." };
  } catch (error) {
    console.error("Create user error:", error);
    return { success: false, error: "Terjadi kesalahan server saat menambahkan pengguna." };
  }
}

export async function updateUser(
  nim_nip: string,
  payload: {
    nama: string;
    role: "mahasiswa" | "admin_departemen" | "superadmin";
    password?: string;
    departmentId?: string;
  }
) {
  try {
    await dbConnect();

    const user = await User.findOne({ nim_nip, isDeleted: { $ne: true } });
    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    user.nama = payload.nama;
    user.role = payload.role;

    if (payload.password) {
      user.password = payload.password;
    }

    if (payload.role === "admin_departemen" && payload.departmentId) {
      user.departmentId = payload.departmentId;
    } else {
      user.departmentId = undefined; // hapus jika mahasiswa / superadmin
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

// ============================================================
// Soft Delete User — dengan logika cascade & safeguard
//
// Aturan:
// 1. Super Admin TIDAK bisa menghapus dirinya sendiri.
// 2. Jika menghapus Super Admin lain, minimal 1 SA harus tetap ada.
// 3. Jika admin yang dihapus punya tiket "Diproses",
//    tiket tersebut di-re-pool (assigneeId → null).
// 4. Jejak audit: deletedAt + deletedBy dicatat.
// ============================================================
export async function softDeleteUser(nim_nip: string) {
  try {
    // ── Autentikasi: Hanya Super Admin yang boleh menghapus ──
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return { success: false, error: "Hanya Super Admin yang dapat menghapus pengguna." };
    }

    await dbConnect();

    // ── Safeguard 1: Tidak boleh hapus diri sendiri ──
    if (session.nim_nip === nim_nip) {
      return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
    }

    const user = await User.findOne({ nim_nip, isDeleted: { $ne: true } });
    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    // ── Safeguard 2: Minimal 1 Super Admin tetap aktif ──
    if (user.role === "superadmin") {
      const activeSuperAdminCount = await User.countDocuments({
        role: "superadmin",
        isDeleted: { $ne: true },
      });
      if (activeSuperAdminCount <= 1) {
        return {
          success: false,
          error: "Tidak dapat menghapus. Minimal harus ada 1 Super Admin aktif di sistem.",
        };
      }
    }

    // ── Cascade: Re-pool tiket aktif milik admin yang dihapus ──
    let rePooledCount = 0;
    if (user.role === "admin_departemen") {
      const rePoolResult = await Ticket.updateMany(
        {
          assigneeId: nim_nip,
          status: { $in: ["Diproses", "Komplain"] },
        },
        {
          $set: { assigneeId: null },
          $push: {
            statusHistory: {
              status: "Masuk",
              timestamp: new Date(),
              actor: "sistem",
              note: `[Internal] Admin ${user.nama} telah dinonaktifkan. Tiket dikembalikan ke antrean.`,
            },
          },
        }
      );
      rePooledCount = rePoolResult.modifiedCount;
    }

    // ── Eksekusi Soft Delete dengan jejak audit ──
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = session.nim_nip;
    await user.save();

    revalidatePath("/users");
    revalidatePath("/workspace");

    const rePoolMsg = rePooledCount > 0
      ? ` ${rePooledCount} tiket aktif dikembalikan ke antrean.`
      : "";

    return {
      success: true,
      message: `Pengguna "${user.nama}" (${nim_nip}) berhasil dihapus.${rePoolMsg}`,
    };
  } catch (error: any) {
    console.error("Soft delete user error:", error);
    return { success: false, error: "Terjadi kesalahan server saat menghapus pengguna." };
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
