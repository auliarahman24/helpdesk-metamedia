"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/mongodb";
import Department from "@/models/Department";

export interface DepartmentRow {
  _id: string;
  departmentId: string;
  namaDepartemen: string;
  createdAt: string;
}

export async function getDepartments(): Promise<DepartmentRow[]> {
  try {
    await dbConnect();

    const departments = await Department.find({})
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
