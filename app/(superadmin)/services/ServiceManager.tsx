"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  createService,
  updateService,
  toggleServiceActive,
  type ServiceRow,
  type CreateServiceInput,
} from "@/app/actions/serviceActions";
import { type DepartmentRow } from "@/app/actions/departmentActions";

// ============================================================
// Helper: Auto-slug label → snake_case
// ============================================================
function toSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
}

// ============================================================
// Tipe form internal (dengan options sebagai string comma-separated)
// ============================================================
interface FormFieldInput {
  id: string;         // Auto-computed dari label
  label: string;
  // Tipe baru: text, textarea, select, file
  type: "text" | "textarea" | "select" | "file";
  isRequired: boolean;
  optionsRaw: string; // comma-separated, hanya dipakai saat type === 'select'
}

interface FormValues {
  namaLayanan: string;
  departmentId: string;
  formBuilder: FormFieldInput[];
}

// ============================================================
// Props
// ============================================================
interface ServiceManagerProps {
  initialServices: ServiceRow[];
  initialDepartments: DepartmentRow[];
}

// ============================================================
// Helper: format tanggal
// ============================================================
function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// Komponen Utama
// ============================================================
export default function ServiceManager({
  initialServices,
  initialDepartments,
}: ServiceManagerProps) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [departments] = useState<DepartmentRow[]>(initialDepartments);
  const [showModal, setShowModal] = useState(false);
  const [editModeId, setEditModeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      namaLayanan: "",
      departmentId: "",
      formBuilder: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "formBuilder",
  });

  // Watch semua formBuilder untuk conditional rendering
  const watchedSchema = watch("formBuilder");

  function openModal() {
    setEditModeId(null);
    reset({
      namaLayanan: "",
      departmentId: "",
      formBuilder: [],
    });
    setResult(null);
    setShowModal(true);
  }

  function openEditModal(service: ServiceRow) {
    setEditModeId(service._id);
    reset({
      namaLayanan: service.namaLayanan,
      departmentId: service.departmentId,
      formBuilder: (service.formBuilder || []).map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type as "text" | "textarea" | "select" | "file",
        isRequired: f.isRequired,
        optionsRaw: f.options ? f.options.join(", ") : "",
      })),
    });
    setResult(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditModeId(null);
    setResult(null);
  }

  function onSubmit(data: FormValues) {
    setResult(null);

    // Auto-compute slug ID dari label setiap field
    const enriched = data.formBuilder.map((f) => ({
      ...f,
      id: toSlug(f.label),
    }));

    // Validasi anti-duplikat slug
    const slugs = enriched.map((f) => f.id);
    const hasDuplicate = slugs.some((slug, i) => slugs.indexOf(slug) !== i);
    if (hasDuplicate) {
      const dup = slugs.find((s, i) => slugs.indexOf(s) !== i);
      setResult({ type: "error", message: `Duplikat ID field ditemukan: "${dup}". Ubah label agar unik.` });
      return;
    }

    // Transform: convert optionsRaw → options array
    const payload: CreateServiceInput = {
      namaLayanan: data.namaLayanan,
      departmentId: data.departmentId,
      formBuilder: enriched.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        isRequired: f.isRequired,
        ...(f.type === "select"
          ? {
              options: f.optionsRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
      })),
    };

    startTransition(async () => {
      if (editModeId) {
        const res = await updateService(editModeId, payload);
        if (res.error) {
          setResult({ type: "error", message: res.error });
        } else {
          setResult({ type: "success", message: res.message || "Berhasil diupdate!" });
          setServices((prev) =>
            prev.map((s) =>
              s._id === editModeId
                ? { ...s, namaLayanan: data.namaLayanan, departmentId: data.departmentId, formBuilderCount: data.formBuilder.length, formBuilder: payload.formBuilder }
                : s
            )
          );
          setTimeout(() => closeModal(), 1500);
        }
      } else {
        const res = await createService(payload);
        if (res.error) {
          setResult({ type: "error", message: res.error });
        } else {
          setResult({ type: "success", message: res.message || "Layanan berhasil dibuat!" });
          setServices((prev) => [
            {
              _id: res.serviceId || Date.now().toString(),
              namaLayanan: data.namaLayanan,
              departmentId: data.departmentId,
              isActive: true,
              formBuilderCount: data.formBuilder.length,
              formBuilder: payload.formBuilder,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          setTimeout(() => closeModal(), 1500);
        }
      }
    });
  }

  function handleToggle(serviceId: string) {
    startTransition(async () => {
      const res = await toggleServiceActive(serviceId);
      if (res.success) {
        setServices((prev) =>
          prev.map((s) =>
            s._id === serviceId ? { ...s, isActive: !s.isActive } : s
          )
        );
      }
    });
  }

  // Delete functionality removed entirely for Advanced MVP constraint

  // ============================================================
  // Shared input classes
  // ============================================================
  const inputClass = `w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm
                      outline-none transition-all duration-200
                      focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:bg-white/[0.06]
                      hover:border-white/[0.15]`;

  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="p-8 space-y-8">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Manajemen Layanan
          </h1>
          <p className="text-sm text-slate-400">
            Kelola jenis layanan dan form builder input dinamis
          </p>
        </div>

        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-semibold rounded-xl
                     shadow-lg shadow-orange-500/25 transition-all duration-200
                     hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-500/30 hover:scale-[1.02]
                     active:scale-[0.98] cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Tambah Layanan Baru
        </button>
      </div>

      {/* ========== TABEL LAYANAN ========== */}
      {services.length === 0 ? (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12 text-slate-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17l-5.1-3.06a.75.75 0 010-1.22l5.1-3.06a.75.75 0 01.76 0l5.1 3.06a.75.75 0 010 1.22l-5.1 3.06a.75.75 0 01-.76 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M23.03 6.67L18.16 3.5a.75.75 0 00-.76 0L2.97 6.67a.75.75 0 000 1.22l14.43 8.67a.75.75 0 00.76 0l4.87-2.93a.75.75 0 000-1.22l-4.87-2.93"
            />
          </svg>
          <p className="text-slate-400 text-sm">Belum ada layanan terdaftar.</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nama Layanan
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Departemen
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Field
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {services.map((service) => (
                  <tr
                    key={service._id}
                    className="hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">
                        {service.namaLayanan}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Dibuat {formatTanggal(service.createdAt)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {service.departmentId}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 text-xs font-medium">
                        {service.formBuilderCount} field
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(service._id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all duration-200 ${
                          service.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25"
                            : "bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            service.isActive ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                        {service.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(service)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L5.319 18q.491-1.748 1.13-1.897l10.413-10.413z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 7.125L16.862 4.487M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== MODAL ========== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
          onClick={closeModal}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative w-full max-w-2xl bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editModeId ? "Edit Layanan" : "Tambah Layanan Baru"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editModeId ? "Perbarui informasi layanan dan form dinamisnya" : "Buat layanan beserta form input dinamisnya"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto">
                {/* === Info Dasar === */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-orange-500/20 text-orange-400 text-xs font-bold">
                      1
                    </span>
                    Informasi Layanan
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="namaLayanan"
                        className="block text-xs font-medium text-slate-400"
                      >
                        Nama Layanan <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="namaLayanan"
                        type="text"
                        placeholder="Contoh: Perbaikan AC"
                        {...register("namaLayanan", {
                          required: "Nama layanan wajib diisi",
                        })}
                        className={inputClass}
                      />
                      {errors.namaLayanan && (
                        <p className="text-xs text-red-400">
                          {errors.namaLayanan.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="departmentId"
                        className="block text-xs font-medium text-slate-400"
                      >
                        Departemen <span className="text-red-400">*</span>
                      </label>
                      <Controller
                        name="departmentId"
                        control={control}
                        rules={{ required: "Departemen wajib dipilih" }}
                        render={({ field }) => (
                          <select
                            {...field}
                            id="departmentId"
                            className={`${inputClass} appearance-none cursor-pointer`}
                          >
                            <option value="">— Pilih Departemen —</option>
                            {departments.map((dept) => (
                              <option
                                key={dept._id}
                                value={dept.departmentId}
                              >
                                {dept.namaDepartemen} — {dept.departmentId}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.departmentId && (
                        <p className="text-xs text-red-400">
                          {errors.departmentId.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-white/[0.06]" />

                {/* === Form Builder === */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-orange-500/20 text-orange-400 text-xs font-bold">
                        2
                      </span>
                      Form Builder
                      <span className="text-xs font-normal text-slate-500">
                        ({fields.length} field)
                      </span>
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        append({
                          id: "",
                          label: "",
                          type: "text",
                          isRequired: false,
                          optionsRaw: "",
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20
                                 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                      Tambah Field Input
                    </button>
                  </div>

                  {fields.length === 0 && (
                    <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-xl p-6 text-center">
                      <p className="text-xs text-slate-500">
                        Belum ada field input.
                        Klik &quot;+ Tambah Field Input&quot; untuk menambah
                        field dinamis.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3"
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            Field #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Hapus
                          </button>
                        </div>

                        {/* Fields grid: Label | Tipe | Wajib? */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Label + Auto-slug preview */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-medium text-slate-500 uppercase">
                              Label <span className="text-orange-400">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Nomor Inventaris AC"
                              {...register(`formBuilder.${index}.label`, {
                                required: "Label wajib diisi",
                              })}
                              className={inputClass}
                            />
                            {/* Auto-slug preview */}
                            {watchedSchema[index]?.label && (
                              <p className="text-[10px] text-slate-600">
                                ID:&nbsp;
                                <code className="text-orange-400 font-mono">
                                  {toSlug(watchedSchema[index].label)}
                                </code>
                              </p>
                            )}
                          </div>

                          {/* Type */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-medium text-slate-500 uppercase">
                              Tipe Input
                            </label>
                            <Controller
                              name={`formBuilder.${index}.type`}
                              control={control}
                              render={({ field: f }) => (
                                 <select {...f} className={selectClass}>
                                   <option value="text">📝 Text (Teks Pendek)</option>
                                   <option value="textarea">📄 Textarea (Teks Panjang)</option>
                                   <option value="select">🔽 Select (Pilihan Dropdown)</option>
                                   <option value="file">📎 File (Unggah Foto/Dokumen)</option>
                                 </select>
                              )}
                            />
                          </div>

                          {/* Required checkbox */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-medium text-slate-500 uppercase">
                              Wajib Diisi?
                            </label>
                            <div className="flex items-center h-[46px]">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    {...register(`formBuilder.${index}.isRequired`)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-white/[0.08] rounded-full peer-checked:bg-orange-500/60 transition-colors border border-white/[0.12]"></div>
                                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white/50 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all"></div>
                                </div>
                                <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                                  {watchedSchema[index]?.isRequired ? "Wajib" : "Opsional"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Opsi input (hanya untuk tipe 'select') */}
                        {watchedSchema[index]?.type === "select" && (
                          <div className="space-y-1 pt-1">
                            <label className="block text-[10px] font-medium text-slate-500 uppercase">
                              Opsi Pilihan{" "}
                              <span className="normal-case text-slate-600">
                                (pisahkan dengan koma)
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder="Ringan, Sedang, Parah"
                              {...register(`formBuilder.${index}.optionsRaw`, {
                                required:
                                  watchedSchema[index]?.type === "select"
                                    ? "Opsi wajib diisi untuk tipe Select"
                                    : false,
                              })}
                              className={inputClass}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Result Alert */}
                {result && (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
                      result.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    <span>{result.message}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-create-service"
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-semibold rounded-xl
                             shadow-lg shadow-orange-500/25 transition-all duration-200
                             hover:from-orange-500 hover:to-amber-500 hover:scale-[1.02]
                             active:scale-[0.98]
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                             cursor-pointer"
                >
                  {isPending ? (
                    <span className="inline-flex items-center gap-2">
                       <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Menyimpan...
                    </span>
                  ) : editModeId ? (
                    "Simpan Perubahan"
                  ) : (
                    "Simpan Layanan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
