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
  const inputClass = `w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium
                      outline-none transition-all duration-200
                      focus:border-campus-primary focus:ring-4 focus:ring-campus-primary/10 shadow-sm`;

  const selectClass = `${inputClass} appearance-none cursor-pointer pr-10`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-campus-primary/10 text-campus-primary rounded-xl shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Layanan</h1>
            <p className="text-xs sm:text-sm text-slate-500">Kelola jenis layanan dan form builder input dinamis.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between sm:justify-start gap-3 shadow-inner mr-0 sm:mr-3">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-slate-900">{services.length}</span>
          </div>
          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Layanan Baru
          </button>
        </div>
      </div>

      {/* ========== TABEL LAYANAN ========== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-slate-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Layanan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Departemen</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Form Input</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status Visibility</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-16 h-16 mx-auto bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                      </div>
                      <p className="text-slate-600 font-medium text-sm">Belum ada layanan terdaftar.</p>
                      <p className="text-slate-400 text-xs mt-1">Silakan tambahkan layanan pertama Anda beserta formnya.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-campus-primary transition-colors">{service.namaLayanan}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Dibuat {formatTanggal(service.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-bold tracking-widest border border-slate-200/60">
                        {service.departmentId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold shadow-sm">
                        {service.formBuilderCount} field
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggle(service._id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer shadow-sm transition-all duration-200 ${
                          service.isActive
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${service.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {service.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(service)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        Edit Form
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== MODAL ========== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
          onClick={closeModal}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editModeId ? "Edit Layanan" : "Tambah Layanan Baru"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editModeId ? "Perbarui informasi layanan dan form dinamisnya." : "Daftarkan layanan beserta form input dinamisnya."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
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
              <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto bg-white">
                {/* === Info Dasar === */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-l-4 border-campus-primary pl-3">
                    Informasi Layanan
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="namaLayanan"
                        className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                      >
                        Nama Layanan <span className="text-rose-500">*</span>
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
                        <p className="text-xs text-rose-500 font-medium">{errors.namaLayanan.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="departmentId"
                        className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                      >
                        Departemen <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Controller
                          name="departmentId"
                          control={control}
                          rules={{ required: "Departemen wajib dipilih" }}
                          render={({ field }) => (
                            <select
                              {...field}
                              id="departmentId"
                              className={selectClass}
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
                        <div className="absolute top-[10px] right-3 flex items-center pointer-events-none text-slate-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
                        </div>
                      </div>
                      {errors.departmentId && (
                        <p className="text-xs text-rose-500 font-medium">{errors.departmentId.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* === Form Builder === */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-l-4 border-campus-primary pl-3">
                      Form Builder
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-1 border border-slate-200">
                        {fields.length} Field
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700
                                 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
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
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                      </svg>
                      <p className="text-sm font-semibold text-slate-600">
                        Belum ada field input pada layanan ini.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Form pendaftaran tiket akan kosong. Klik "Tambah Field Input" untuk membangun form.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4 relative group hover:border-campus-primary/30 transition-colors shadow-sm"
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Field #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-500 hover:text-white hover:bg-rose-500 border border-transparent hover:border-rose-600 rounded-lg text-xs transition-all cursor-pointer font-semibold shadow-sm hover:shadow"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Hapus
                          </button>
                        </div>

                        {/* Fields grid: Label | Tipe | Wajib? */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Label + Auto-slug preview */}
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Label Form <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Nomor Inventaris AC"
                              {...register(`formBuilder.${index}.label`, {
                                required: "Label wajib diisi",
                              })}
                              className={inputClass}
                            />
                            {/* Auto-slug preview */}
                            {watchedSchema[index]?.label && (
                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                ID Basis Data:
                                <code className="text-blue-600 font-mono bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                                  {toSlug(watchedSchema[index].label)}
                                </code>
                              </p>
                            )}
                          </div>

                          {/* Type */}
                          <div className="space-y-1.5 relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Format
                            </label>
                            <div className="relative">
                              <Controller
                                name={`formBuilder.${index}.type`}
                                control={control}
                                render={({ field: f }) => (
                                   <select {...f} className={selectClass}>
                                     <option value="text">📝 Singkat (Text)</option>
                                     <option value="textarea">📄 Panjang (Textarea)</option>
                                     <option value="select">🔽 Pilihan (Dropdown)</option>
                                     <option value="file">📎 Unggahan (File)</option>
                                   </select>
                                )}
                              />
                              <div className="absolute top-[10px] right-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
                              </div>
                            </div>
                          </div>

                          {/* Required checkbox */}
                          <div className="space-y-1.5 flex flex-col justify-start">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Wajib Diisi?
                            </label>
                            <div className="flex items-center h-[42px] px-2">
                              <label className="flex items-center gap-3 cursor-pointer group w-full">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    {...register(`formBuilder.${index}.isRequired`)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-campus-primary transition-colors border border-slate-300 peer-checked:border-blue-700 shadow-inner"></div>
                                  <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full peer-checked:translate-x-4 transition-all shadow-sm"></div>
                                </div>
                                <span className={`text-xs font-bold transition-colors ${watchedSchema[index]?.isRequired ? "text-campus-primary" : "text-slate-500"}`}>
                                  {watchedSchema[index]?.isRequired ? "Ya, Wajib Diisi" : "Boleh Kosong"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Opsi input (hanya untuk tipe 'select') */}
                        {watchedSchema[index]?.type === "select" && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/50 mt-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Daftar Opsi Pilihan{" "}
                              <span className="normal-case text-slate-400 font-medium">
                                (pisahkan setiap opsi dengan tanda koma)
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Ringan, Sedang, Sangat Parah"
                              {...register(`formBuilder.${index}.optionsRaw`, {
                                required:
                                  watchedSchema[index]?.type === "select"
                                    ? "Opsi wajib diisi untuk tipe Dropdown"
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
                    className={`flex items-start gap-2.5 p-4 rounded-xl text-sm font-medium border shadow-sm ${
                      result.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                     {result.type === "error" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <span>{result.message}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-create-service"
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center min-w-[140px] px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
