"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/mongodb";
import Department from "@/models/Department";
import Service from "@/models/Service";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import { getSession } from "@/app/actions/authActions";

export interface DepartmentRow {
  _id: string;
  departmentId: string;
  namaDepartemen: string;
  createdAt: string;
}

export async function getDepartments(): Promise<DepartmentRow[]> {
  try {
    await dbConnect();

    const departments = await Department.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    return departments.map((d) => ({
      _id: String(d._id),
      departmentId: d.departmentId,
      namaDepartemen: d.namaDepartemen,
      createdAt: d.createdAt
        ? new Date(d.createdAt).toISOString()
        : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Get departments error:", error);
    return [];
  }
}

export async function createDepartment(payload: { departmentId: string; namaDepartemen: string }) {
  try {
    await dbConnect();

    // Check uniqueness
    const existing = await Department.findOne({ departmentId: payload.departmentId }).lean();
    if (existing) {
      return { success: false, error: `Departemen dengan ID "${payload.departmentId}" sudah ada.` };
    }

    const dept = await Department.create({
      departmentId: payload.departmentId,
      namaDepartemen: payload.namaDepartemen,
    });

    revalidatePath("/departments");

    return {
      success: true,
      message: "Departemen berhasil ditambahkan.",
      department: {
        _id: String(dept._id),
      },
    };
  } catch (error: any) {
    console.error("Create department error:", error);
    if (error.code === 11000) {
      return { success: false, error: "Department ID sudah digunakan." };
    }
    return { success: false, error: "Terjadi kesalahan server saat menambahkan departemen." };
  }
}

export async function updateDepartment(id: string, payload: { namaDepartemen: string }) {
  try {
    await dbConnect();

    // Pastikan ID departemen tidak diedit! Hanya namaDepartemen.
    const dept = await Department.findById(id);
    if (!dept) {
      return { success: false, error: "Departemen tidak ditemukan." };
    }

    dept.namaDepartemen = payload.namaDepartemen;
    await dept.save();

    revalidatePath("/departments");

    return {
      success: true,
      message: "Nama departemen berhasil diperbarui.",
    };
  } catch (error: any) {
    console.error("Update department error:", error);
    return { success: false, error: "Terjadi kesalahan server saat memperbarui departemen." };
  }
}

// ============================================================
// Soft Delete Departemen — CASCADE Logic:
//
// 1. Soft-delete semua layanan di departemen ini.
// 2. Soft-delete semua admin di departemen ini.
// 3. Re-pool tiket aktif (assigneeId → null) milik admin dept.
// 4. Tiket lama TIDAK disentuh (historis aman).
// 5. Jejak audit: deletedAt + deletedBy dicatat.
// ============================================================
export async function softDeleteDepartment(departmentId: string) {
  try {
    // ── Autentikasi: Hanya Super Admin ──
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return { success: false, error: "Hanya Super Admin yang dapat menghapus departemen." };
    }

    await dbConnect();

    const dept = await Department.findOne({ departmentId, isDeleted: { $ne: true } });
    if (!dept) {
      return { success: false, error: "Departemen tidak ditemukan." };
    }

    const now = new Date();
    const deletedBy = session.nim_nip;

    // ── CASCADE 1: Soft-delete semua layanan di departemen ini ──
    const svcResult = await Service.updateMany(
      { departmentId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, isActive: false, deletedAt: now, deletedBy } }
    );

    // ── CASCADE 2: Soft-delete semua admin di departemen ini ──
    const adminResult = await User.updateMany(
      { departmentId, role: "admin_departemen", isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: now, deletedBy } }
    );

    // ── CASCADE 3: Re-pool tiket aktif milik admin departemen ini ──
    const rePoolResult = await Ticket.updateMany(
      {
        departmentId,
        assigneeId: { $ne: null },
        status: { $in: ["Diproses", "Komplain"] },
      },
      {
        $set: { assigneeId: null },
        $push: {
          statusHistory: {
            status: "Masuk",
            timestamp: now,
            actor: "sistem",
            note: `[Internal] Departemen "${dept.namaDepartemen}" dinonaktifkan. Tiket dikembalikan ke antrean.`,
          },
        },
      }
    );

    // ── Eksekusi Soft Delete departemen ──
    dept.isDeleted = true;
    dept.deletedAt = now;
    dept.deletedBy = deletedBy;
    await dept.save();

    revalidatePath("/departments");
    revalidatePath("/services");
    revalidatePath("/users");
    revalidatePath("/workspace");

    return {
      success: true,
      message: `Departemen "${dept.namaDepartemen}" berhasil dihapus. ${svcResult.modifiedCount} layanan dinonaktifkan, ${adminResult.modifiedCount} admin dinonaktifkan, ${rePoolResult.modifiedCount} tiket dikembalikan ke antrean.`,
    };
  } catch (error: any) {
    console.error("Soft delete department error:", error);
    return { success: false, error: "Terjadi kesalahan server saat menghapus departemen." };
  }
}
