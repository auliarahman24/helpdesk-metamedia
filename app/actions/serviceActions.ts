"use server";

import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Service from "@/models/Service";
import { getSession } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";

// ============================================================
// Zod Schema — validasi struktur form service (tipe baru)
// ============================================================
const FormFieldSchema = z.object({
  id: z
    .string()
    .min(1, "ID field wajib diisi")
    .regex(/^[a-zA-Z0-9_]+$/, "ID hanya boleh huruf, angka, dan underscore"),
  label: z.string().min(1, "Label field wajib diisi"),
  // Tipe baru: text, textarea, select, file (hapus number & dropdown)
  type: z.enum(["text", "textarea", "select", "file"]).refine(
    (v) => ["text", "textarea", "select", "file"].includes(v),
    { message: "Tipe harus text, textarea, select, atau file" }
  ),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

const CreateServiceSchema = z.object({
  namaLayanan: z.string().min(1, "Nama layanan wajib diisi"),
  departmentId: z.string().min(1, "Department ID wajib diisi"),
  isPublic: z.boolean().default(false),
  defaultPrioritas: z.enum(["Rendah", "Sedang", "Tinggi", "Kritis"]).default("Sedang"),
  formBuilder: z.array(FormFieldSchema).default([]),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

// ============================================================
// Tipe data untuk client (serialized)
// ============================================================
export interface ServiceRow {
  _id: string;
  namaLayanan: string;
  departmentId: string;
  defaultPrioritas: "Rendah" | "Sedang" | "Tinggi" | "Kritis";
  isActive: boolean;
  isPublic: boolean;
  formBuilderCount: number;
  formBuilder: Array<{
    id: string;
    label: string;
    type: "text" | "textarea" | "select" | "file";
    isRequired: boolean;
    options?: string[];
  }>;
  createdAt: string;
}

// ============================================================
// Fetch semua services (untuk tabel Super Admin)
// ============================================================
export async function getAllServices(): Promise<ServiceRow[]> {
  await dbConnect();

  const services = await Service.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();

  return services.map((s) => ({
    _id: String(s._id),
    namaLayanan: s.namaLayanan,
    departmentId: s.departmentId,
    defaultPrioritas: (s.defaultPrioritas as "Rendah" | "Sedang" | "Tinggi" | "Kritis") || "Sedang",
    isActive: s.isActive,
    isPublic: s.isPublic || false,
    formBuilderCount: s.formBuilder?.length || 0,
    formBuilder: (s.formBuilder || []).map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type as "text" | "textarea" | "select" | "file",
      isRequired: f.isRequired,
      ...(f.options ? { options: f.options } : {}),
    })),
    createdAt: s.createdAt
      ? new Date(s.createdAt).toISOString()
      : new Date().toISOString(),
  }));
}

// ============================================================
// Buat service baru (dengan validasi Zod)
// ============================================================
export async function createService(data: CreateServiceInput) {
  const parsed = CreateServiceSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError =
      Object.values(errors.fieldErrors).flat()[0] ||
      errors.formErrors[0] ||
      "Data tidak valid";
    return { error: String(firstError) };
  }

  try {
    await dbConnect();

    // Validasi: type 'select' WAJIB punya options
    for (const field of parsed.data.formBuilder) {
      if (field.type === "select") {
        if (!field.options || field.options.length === 0) {
          return {
            error: `Field "${field.label}" bertipe Select harus memiliki minimal 1 opsi.`,
          };
        }
      }
    }

    const service = await Service.create({
      namaLayanan: parsed.data.namaLayanan,
      departmentId: parsed.data.departmentId,
      defaultPrioritas: parsed.data.defaultPrioritas,
      isActive: true,
      isPublic: parsed.data.isPublic,
      formBuilder: parsed.data.formBuilder.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        isRequired: f.isRequired,
        // Simpan options hanya jika tipenya select
        ...(f.type === "select" && f.options ? { options: f.options } : {}),
      })),
    });

    return {
      success: true,
      serviceId: String(service._id),
      message: `Layanan "${parsed.data.namaLayanan}" berhasil dibuat!`,
    };
  } catch (error) {
    console.error("Create service error:", error);
    return { error: "Terjadi kesalahan server. Silakan coba lagi." };
  }
}

// ============================================================
// Toggle status aktif service (enable/disable oleh Super Admin)
// ============================================================
export async function toggleServiceActive(serviceId: string) {
  try {
    await dbConnect();

    const service = await Service.findById(serviceId);
    if (!service) {
      return { error: "Layanan tidak ditemukan." };
    }

    service.isActive = !service.isActive;
    await service.save();

    return {
      success: true,
      message: `Layanan "${service.namaLayanan}" ${service.isActive ? "diaktifkan" : "dinonaktifkan"}.`,
    };
  } catch (error) {
    console.error("Toggle service error:", error);
    return { error: "Terjadi kesalahan server." };
  }
}

// ============================================================
// Update service (termasuk form builder schema)
// ============================================================
export async function updateService(serviceId: string, data: CreateServiceInput) {
  const parsed = CreateServiceSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstError =
      Object.values(errors.fieldErrors).flat()[0] ||
      errors.formErrors[0] ||
      "Data tidak valid";
    return { error: String(firstError) };
  }

  try {
    await dbConnect();

    // Validasi: type 'select' WAJIB punya options
    for (const field of parsed.data.formBuilder) {
      if (field.type === "select") {
        if (!field.options || field.options.length === 0) {
          return {
            error: `Field "${field.label}" bertipe Select harus memiliki minimal 1 opsi.`,
          };
        }
      }
    }

    const service = await Service.findById(serviceId);
    if (!service) return { error: "Layanan tidak ditemukan." };

    service.namaLayanan = parsed.data.namaLayanan;
    service.departmentId = parsed.data.departmentId;
    service.defaultPrioritas = parsed.data.defaultPrioritas;
    service.isPublic = parsed.data.isPublic;
    service.formBuilder = parsed.data.formBuilder.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      isRequired: f.isRequired,
      ...(f.type === "select" && f.options ? { options: f.options } : {}),
    })) as typeof service.formBuilder;

    await service.save();

    return {
      success: true,
      message: `Layanan "${parsed.data.namaLayanan}" berhasil diperbarui!`,
    };
  } catch (error) {
    console.error("Update service error:", error);
    return { error: "Terjadi kesalahan server saat memperbarui layanan." };
  }
}

// ============================================================
// Soft Delete Service — dengan jejak audit
//
// Logika:
// - Layanan berhenti muncul di form pengajuan.
// - Tiket lama TIDAK terpengaruh (formSnapshot sudah menyimpan
//   layout form saat tiket dibuat).
// ============================================================
export async function softDeleteService(serviceId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return { error: "Hanya Super Admin yang dapat menghapus layanan." };
    }

    await dbConnect();

    const service = await Service.findOne({ _id: serviceId, isDeleted: { $ne: true } });
    if (!service) {
      return { error: "Layanan tidak ditemukan." };
    }

    service.isDeleted = true;
    service.isActive = false;
    service.deletedAt = new Date();
    service.deletedBy = session.nim_nip;
    await service.save();

    revalidatePath("/services");

    return {
      success: true,
      message: `Layanann "${service.namaLayanan}" berhasil dihapus. Tiket lama tidak terpengaruh.`,
    };
  } catch (error) {
    console.error("Soft delete service error:", error);
    return { error: "Terjadi kesalahan server saat menghapus layanan." };
  }
}
