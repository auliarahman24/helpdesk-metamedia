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
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="relative max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-campus-primary/10 text-campus-primary mb-2 shadow-sm border border-campus-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Formulir Pengajuan Tiket</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">Pilih jenis layanan, lalu isi formulir yang muncul secara otomatis dengan data yang sesuai.</p>
        </div>

        {/* ── SUCCESS STATE ── */}
        {result?.type === "success" && (
          <div className="bg-white border border-campus-primary/20 rounded-3xl shadow-lg p-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 ring-8 ring-emerald-50/50 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Pengajuan Berhasil Dikirim!</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">{result.message}</p>
              {result.ticketId && (
                <div className="inline-flex flex-col items-center gap-1 mt-4 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nomor Tiket Anda</span>
                  <span className="text-xl font-mono font-bold text-campus-primary tracking-widest mt-1">
                    {result.ticketId}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Simpan nomor ini untuk keperluan pelacakan</span>
                </div>
              )}
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full mt-4 py-3.5 px-6 bg-campus-primary text-white text-sm font-bold rounded-xl shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Kembali ke Dasbor
            </Link>

            <div className="pt-2">
              <button
                onClick={() => { setResult(null); setSelectedService(null); formRef.current?.reset(); }}
                className="text-xs font-semibold text-slate-500 hover:text-campus-primary transition-colors cursor-pointer"
              >
                Buat pengajuan baru
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR ALERT ── */}
        {result?.type === "error" && (
          <div className="flex items-start gap-3 rounded-2xl px-5 py-4 text-sm border bg-rose-50 border-rose-200 text-rose-700 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="font-medium">{result.message}</span>
          </div>
        )}

        {/* ── FORM CARD ── */}
        {result?.type !== "success" && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <svg className="animate-spin h-8 w-8 text-campus-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-slate-500 text-sm font-medium">Memuat katalog layanan...</span>
              </div>
            ) : (
              // encType penting agar browser siapkan multipart/form-data
              <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">

                {/* ── PILIH LAYANAN ── */}
                <div className="space-y-2">
                  <label htmlFor="serviceId" className="block text-sm font-bold text-slate-700">
                    Kategori Layanan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="serviceId"
                      name="serviceId"
                      required
                      onChange={handleServiceChange}
                      className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium outline-none transition-all duration-200 appearance-none cursor-pointer focus:bg-white focus:border-campus-primary focus:ring-4 focus:ring-campus-primary/10 shadow-sm"
                    >
                      <option value="" className="text-slate-400">-- Pilih Jenis Layanan --</option>
                      {services.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.namaLayanan} ({s.departmentId})
                        </option>
                      ))}
                    </select>
                    <div className="absolute top-[14px] right-4 pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                      </svg>
                    </div>
                  </div>
                </div>



                {/* ── DYNAMIC FIELDS — di-render dari formBuilder layanan ── */}
                {selectedService && selectedService.formBuilder.length > 0 && (
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-l-4 border-campus-primary pl-3">
                        Detail Pengajuan
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        {selectedService.namaLayanan}
                      </span>
                    </div>

                    <div className="space-y-5">
                      {selectedService.formBuilder.map((field) => (
                        <DynamicField key={field.id} field={field} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state: layanan terpilih tapi belum ada formBuilder */}
                {selectedService && selectedService.formBuilder.length === 0 && (
                  <div className="py-8 mt-4 text-center text-sm font-medium text-slate-500 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    Layanan ini belum memerlukan form isian tambahan. Lanjutkan pengiriman.
                  </div>
                )}

                {/* ── TOMBOL SUBMIT ── */}
                {selectedService && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
                    <Link
                      href="/dashboard"
                      className="w-full sm:w-auto px-6 py-3.5 text-center text-sm font-bold text-slate-600 rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm order-2 sm:order-1"
                    >
                      Batal
                    </Link>

                    <button
                      id="btn-submit-ticket"
                      type="submit"
                      disabled={isPending}
                      className="w-full sm:flex-1 py-3.5 px-6 bg-campus-primary text-white text-sm font-bold rounded-xl shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer order-1 sm:order-2"
                    >
                      {isPending ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Memproses pengajuan...
                        </span>
                      ) : (
                        "Kirim Tiket Pengajuan"
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
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium outline-none transition-all duration-200 focus:border-campus-primary focus:ring-4 focus:ring-campus-primary/10 shadow-sm";

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
    <div className="space-y-1.5">
      <label htmlFor={field.id} className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        {field.label}
        {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
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
        <div className="relative">
          <select
            id={field.id}
            name={field.id}
            className={`${inputClasses} appearance-none cursor-pointer pr-10`}
          >
            <option value="" className="text-slate-400">
              -- Pilih opsi --
            </option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="absolute top-[12px] right-3 pointer-events-none text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </div>
      )}

      {/* ── FILE UPLOAD ── */}
      {field.type === "file" && (
        <div className="space-y-3">
          <label
            htmlFor={field.id}
            className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-campus-primary/50 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer text-center"
          >
            <div className="p-3 rounded-full bg-white shadow-sm border border-slate-100 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">
                Klik untuk unggah dokumen
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">JPG, PNG, PDF (maks. 10MB)</p>
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
            <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreview} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-campus-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9l2.25 2.25 4.5-4.5M15 12H9" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-700 truncate font-bold">{fileName}</p>
                <p className="text-[10px] text-campus-primary mt-0.5 font-bold">Berkas berhasil dipilih ✓</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
