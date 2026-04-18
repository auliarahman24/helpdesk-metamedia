"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getActiveServices,
  submitTicketFormData,
  type ServiceData,
  type FormFieldData,
} from "@/app/actions/ticketActions";

function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-campus-primary/5 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[80px]" />
    </div>
  );
}

export default function PengajuanPage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    ticketId?: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    getActiveServices()
      .then(setServices)
      .catch(() => console.error("Gagal memuat layanan"))
      .finally(() => setIsLoading(false));
  }, []);

  function handleSelectService(svc: ServiceData) {
    setSelectedService(svc);
    setFormStep(2);
    setResult(null);
  }

  function handleBackToServices() {
    setFormStep(1);
    setSelectedService(null);
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedService) {
      setResult({ type: "error", message: "Pilih kategori layanan terlebih dahulu." });
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("serviceId", selectedService._id);

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
      }
    });
  }

  return (
    <div className="min-h-screen relative bg-slate-50 selection:bg-campus-primary/10">
      <MeshGradient />

      {/* ── HEADER SEDERHANA ── */}
      <header className="sticky top-0 z-40 bg-campus-dark backdrop-blur-xl border-b border-white/10 shadow-lg shadow-campus-dark/10">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg text-white font-black hover:bg-white/20 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
            <div>
              <h1 className="text-white font-black text-lg leading-tight tracking-tight">Portal Pengajuan Laporan</h1>
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-0.5">Universitas Metamedia</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        
        {/* ── SUCCESS STATE ── */}
        {result?.type === "success" && (
          <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-emerald-500 shadow-xl shadow-emerald-500/30 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Pengajuan Berhasil Dikirim!</h2>
              <p className="text-sm font-bold text-slate-500 max-w-md mx-auto uppercase tracking-widest">{result.message}</p>
            </div>
            {result.ticketId && (
              <div className="inline-flex flex-col items-center gap-2 p-8 bg-slate-50 border border-slate-200 rounded-3xl shadow-inner w-full max-w-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Tiket Laporan Anda</span>
                <span className="text-3xl font-black text-campus-dark tracking-widest">{result.ticketId}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link href="/dashboard" className="flex-1 w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Kembali ke Dasbor</Link>
              <button onClick={() => { setResult(null); handleBackToServices(); }} className="flex-1 w-full py-4 bg-campus-dark text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-campus-dark/20 hover:scale-105 transition-all">Buat Pengajuan Lain</button>
            </div>
          </div>
        )}

        {/* ── FORM & SELECTION FLOW ── */}
        {result?.type !== "success" && (
          <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in duration-500">
            
            {/* Step Indicator */}
            <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex gap-4">
               {[1, 2].map((step) => (
                 <div key={step} className={`h-2 flex-1 rounded-full transition-all duration-500 ${formStep >= step ? 'bg-campus-primary shadow-sm shadow-campus-primary/30' : 'bg-slate-200 shadow-inner'}`} />
               ))}
            </div>

            <div className="p-10">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <svg className="animate-spin h-10 w-10 text-campus-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Memuat Katalog Layanan...</span>
                </div>
              ) : (
                <>
                  {/* ERROR ALERT */}
                  {result?.type === "error" && (
                    <div className="mb-8 p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-4 text-rose-600 animate-shake shadow-sm">
                      <div className="p-2 bg-rose-100 rounded-xl"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                      <span className="text-sm font-black uppercase tracking-wider">{result.message}</span>
                    </div>
                  )}

                  {/* ── STEP 1: PILIH LAYANAN ── */}
                  {formStep === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-left-8 duration-500">
                      <div className="text-center space-y-2">
                         <h2 className="text-2xl font-black text-slate-900 tracking-tight">Katalog Layanan IT</h2>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pilih jenis bantuan yang Anda butuhkan</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {services.map((svc) => (
                           <div 
                             key={svc._id} 
                             onClick={() => handleSelectService(svc)}
                             className="group p-6 bg-slate-50 border border-slate-100 hover:border-campus-primary hover:bg-campus-primary/5 rounded-3xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-start gap-5 shadow-sm"
                           >
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 group-hover:bg-campus-primary group-hover:text-white group-hover:border-transparent transition-all shadow-sm shrink-0">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053c.217-.266.15-.665-.118-.908C11.838 9.516 9.882 8 8 8c-3.314 0-6 2.686-6 6 0 3.314 2.686 6 6 6 1.882 0 3.838-1.516 5.794-2.852.243-.165.286-.532.083-.75l-2.457-2.628M11.42 15.17l-3.025-3.025m-6 3.025c0-1.104.896-2 2-2h4c1.104 0 2 .896 2 2" /></svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                 <h3 className="text-base font-black text-slate-800 tracking-tight group-hover:text-campus-primary transition-colors">{svc.namaLayanan}</h3>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{svc.departmentId}</p>
                              </div>
                              <div className="text-slate-300 group-hover:text-campus-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 mt-3">
                                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: ISI FORMULIR ── */}
                  {formStep === 2 && selectedService && (
                    <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                      
                      {/* Active Service Banner */}
                      <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-3xl shadow-inner">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Anda Sedang Mengajukan</p>
                            <h3 className="text-lg font-black text-campus-primary tracking-tight">{selectedService.namaLayanan}</h3>
                         </div>
                         <button type="button" onClick={handleBackToServices} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">
                            Ganti Layanan
                         </button>
                      </div>

                      {/* Dynamic Fields Container */}
                      {selectedService.formBuilder.length > 0 ? (
                        <div className="space-y-8">
                           {selectedService.formBuilder.map((field) => (
                             <DynamicField key={field.id} field={field} />
                           ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-300 mb-4 shadow-sm">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           </div>
                           <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Tidak butuh data tambahan. Siap dikirim.</p>
                        </div>
                      )}

                      {/* Submit Action */}
                      <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                         <button type="button" onClick={handleBackToServices} className="py-5 px-8 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all text-center">Batal</button>
                         <button type="submit" disabled={isPending} className="flex-1 py-5 px-8 bg-campus-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-campus-dark/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                            {isPending ? (
                              <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> MENGIRIM...</>
                            ) : (
                              "KIRIM LAPORAN SEKARANG"
                            )}
                         </button>
                      </div>
                    </form>
                  )}

                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Komponen Dynamic Field — Render berdasarkan field.type
// ============================================================
function DynamicField({ field }: { field: FormFieldData }) {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const inputClasses = "w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary transition-all shadow-sm placeholder:text-slate-400";

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
    <div className="space-y-3">
      <label htmlFor={field.id} className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
        {field.label}
        {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
      </label>

      {field.type === "text" && (
        <input id={field.id} name={field.id} type="text" placeholder={`Masukkan ${field.label.toLowerCase()}`} className={inputClasses} />
      )}

      {field.type === "textarea" && (
        <textarea id={field.id} name={field.id} rows={4} placeholder={`Jelaskan ${field.label.toLowerCase()} secara detail...`} className={`${inputClasses} resize-none`} />
      )}

      {field.type === "select" && (
        <div className="relative">
          <select id={field.id} name={field.id} className={`${inputClasses} appearance-none cursor-pointer pr-12 text-slate-700`}>
            <option value="" className="text-slate-400">-- Pilih opsi --</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute top-[22px] right-5 pointer-events-none text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
          </div>
        </div>
      )}

      {field.type === "file" && (
        <div className="space-y-4 mt-2">
          <label htmlFor={field.id} className="flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-campus-primary/60 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer text-center group shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-campus-primary transition-colors group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-base text-slate-700 font-black tracking-tight">Kik Disini Untuk Unggah Dokumen</p>
              <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-widest">JPG, PNG, PDF (maks. 10MB)</p>
            </div>
            <input id={field.id} name={field.id} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
          </label>

          {fileName && (
            <div className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm animate-in zoom-in-95 duration-300">
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreview} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0 shadow-sm" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9l2.25 2.25 4.5-4.5M15 12H9" /></svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800 truncate font-black">{fileName}</p>
                <p className="text-[10px] text-emerald-500 mt-1 font-black uppercase tracking-widest">✅ Berkas Tersimpan</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
