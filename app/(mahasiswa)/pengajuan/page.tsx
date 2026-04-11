"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getActiveServices,
  submitTicketFormData,
  type ServiceData,
  type FormFieldData,
} from "@/app/actions/ticketActions";

// ============================================================
// Komponen Utama: Form Pengajuan Tiket (Fully Dynamic)
// ============================================================
export default function PengajuanPage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    ticketId?: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch services saat mount
  useEffect(() => {
    getActiveServices()
      .then(setServices)
      .catch(() => console.error("Gagal memuat layanan"))
      .finally(() => setIsLoading(false));
  }, []);

  // Update selectedService saat pilihan <select> berubah
  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const service = services.find((s) => s._id === e.target.value) || null;
    setSelectedService(service);
    setResult(null);
    // Reset file inputs agar tidak ada sisa dari layanan sebelumnya
    formRef.current?.querySelectorAll<HTMLInputElement>("input[type='file']").forEach((el) => {
      el.value = "";
    });
  }

  // Submit: buat FormData dari form native lalu kirim ke Server Action
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedService) {
      setResult({ type: "error", message: "Pilih kategori layanan terlebih dahulu." });
      return;
    }

    // Validasi client-side berdasarkan formSnapshot layanan
    const formData = new FormData(e.currentTarget);
    for (const field of selectedService.formBuilder) {
      if (field.isRequired) {
        const value = formData.get(field.id);
        if (field.type === "file") {
          const file = value as File;
          if (!file || file.size === 0) {
            setResult({ type: "error", message: `"${field.label}" wajib diunggah.` });
            return;
          }
        } else {
          if (!value || (typeof value === "string" && !value.trim())) {
            setResult({ type: "error", message: `"${field.label}" wajib diisi.` });
            return;
          }
        }
      }
    }

    setResult(null);
    startTransition(async () => {
      const res = await submitTicketFormData(formData);
      if (res.error) {
        setResult({ type: "error", message: res.error });
      } else {
        setResult({
          type: "success",
          message: res.message || "Laporan berhasil diajukan!",
          ticketId: res.ticketId,
        });
        formRef.current?.reset();
        setSelectedService(null);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-[350px] h-[350px] bg-blue-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Form Pengajuan Laporan</h1>
          <p className="text-sm text-slate-400">Pilih jenis layanan, lalu isi formulir yang muncul secara otomatis</p>
        </div>

        {/* ── SUCCESS STATE ── */}
        {result?.type === "success" && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl shadow-black/40 p-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/10 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Laporan Berhasil Dikirim!</h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">{result.message}</p>
              {result.ticketId && (
                <div className="inline-flex flex-col items-center gap-1 mt-3 px-5 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                  <span className="text-xs text-slate-500">Nomor Tiket Anda</span>
                  <span className="text-lg font-mono font-bold text-emerald-400 tracking-widest">
                    {result.ticketId}
                  </span>
                  <span className="text-[11px] text-slate-600">Simpan nomor ini untuk tracking status laporan</span>
                </div>
              )}
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Lihat Dasbor Saya
            </Link>

            <button
              onClick={() => { setResult(null); setSelectedService(null); formRef.current?.reset(); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              atau buat laporan baru
            </button>
          </div>
        )}

        {/* ── ERROR ALERT ── */}
        {result?.type === "error" && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm border bg-red-500/10 border-red-500/20 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{result.message}</span>
          </div>
        )}

        {/* ── FORM CARD ── */}
        {result?.type !== "success" && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-3 text-slate-400 text-sm">Memuat layanan...</span>
              </div>
            ) : (
              // encType penting agar browser siapkan multipart/form-data
              <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">

                {/* ── PILIH LAYANAN ── */}
                <div className="space-y-2">
                  <label htmlFor="serviceId" className="block text-sm font-medium text-slate-300">
                    Kategori Layanan <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    required
                    onChange={handleServiceChange}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm outline-none transition-all duration-200 appearance-none cursor-pointer focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-white/[0.15]"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">-- Pilih Layanan --</option>
                    {services.map((s) => (
                      <option key={s._id} value={s._id} className="bg-slate-900 text-white">
                        {s.namaLayanan} ({s.departmentId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── DYNAMIC FIELDS — di-render dari formBuilder layanan ── */}
                {selectedService && selectedService.formBuilder.length > 0 && (
                  <>
                    <hr className="border-white/[0.06]" />
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold">✦</span>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Form: <span className="text-emerald-400 normal-case font-normal">{selectedService.namaLayanan}</span>
                      </p>
                    </div>

                    <div className="space-y-5">
                      {selectedService.formBuilder.map((field) => (
                        <DynamicField key={field.id} field={field} />
                      ))}
                    </div>
                  </>
                )}

                {/* Empty state: layanan terpilih tapi belum ada formBuilder */}
                {selectedService && selectedService.formBuilder.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
                    Layanan ini belum memiliki form isian. Hubungi administrator.
                  </div>
                )}

                {/* ── TOMBOL SUBMIT ── */}
                {selectedService && (
                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href="/dashboard"
                      className="flex-1 py-3 px-4 text-center text-sm font-medium text-slate-400 rounded-xl border border-white/[0.08] bg-white/[0.02] transition-all duration-200 hover:bg-white/[0.05] hover:text-white hover:border-white/[0.15]"
                    >
                      Batal
                    </Link>

                    <button
                      id="btn-submit-ticket"
                      type="submit"
                      disabled={isPending}
                      className="flex-[2] py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                    >
                      {isPending ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Mengirim laporan...
                        </span>
                      ) : (
                        "Kirim Laporan"
                      )}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Komponen Dynamic Field — Render berdasarkan field.type
// Mendukung: text, textarea, select, file
// ============================================================
function DynamicField({ field }: { field: FormFieldData }) {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const inputClasses =
    "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/[0.06] hover:border-white/[0.15]";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setFilePreview(null); setFileName(null); return; }
    setFileName(file.name);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="block text-sm font-medium text-slate-300">
        {field.label}
        {field.isRequired && <span className="text-red-400 ml-1">*</span>}
      </label>

      {/* ── TEXT ── */}
      {field.type === "text" && (
        <input
          id={field.id}
          name={field.id}
          type="text"
          placeholder={`Masukkan ${field.label.toLowerCase()}`}
          className={inputClasses}
        />
      )}

      {/* ── TEXTAREA ── */}
      {field.type === "textarea" && (
        <textarea
          id={field.id}
          name={field.id}
          rows={4}
          placeholder={`Jelaskan ${field.label.toLowerCase()} secara detail...`}
          className={`${inputClasses} resize-none`}
        />
      )}

      {/* ── SELECT / DROPDOWN ── */}
      {field.type === "select" && (
        <select
          id={field.id}
          name={field.id}
          className={`${inputClasses} appearance-none cursor-pointer`}
        >
          <option value="" className="bg-slate-900 text-slate-400">
            -- Pilih {field.label} --
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt} className="bg-slate-900 text-white">
              {opt}
            </option>
          ))}
        </select>
      )}

      {/* ── FILE UPLOAD ── */}
      {field.type === "file" && (
        <div className="space-y-3">
          <label
            htmlFor={field.id}
            className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-white/[0.1] bg-white/[0.02] hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
          >
            <div className="p-2.5 rounded-lg bg-white/[0.04]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-300">
                <span className="text-emerald-400 font-medium">Klik untuk pilih file</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, PDF (maks. 10MB)</p>
            </div>
            <input
              id={field.id}
              name={field.id}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {/* Preview file terpilih */}
          {fileName && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreview} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-white/[0.08] flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9l2.25 2.25 4.5-4.5M15 12H9" />
                  </svg>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-slate-300 truncate font-medium">{fileName}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">File terpilih ✓</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
