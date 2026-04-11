"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { loginUser } from "@/app/actions/authActions";
import { submitPublicTicket, type PublicFeedItem } from "@/app/actions/publicActions";

// ─── Helpers ────────────────────────────────────────────────
function formatTanggal(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  "Masuk":              { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-500" },
  "Diproses":           { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500" },
  "Selesai":            { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500" },
  "Pending Verifikasi": { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  "Dibatalkan":         { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

interface FormField { id: string; label: string; type: "text" | "textarea" | "select" | "file"; isRequired: boolean; options?: string[]; }
interface PublicService { _id: string; namaLayanan: string; departmentId: string; formBuilder: FormField[]; }

// ═══════════════════════════════════════════════════════════
export default function LandingClient({ feed }: { feed: PublicFeedItem[] }) {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, startLogin]   = useTransition();
  const [showModal, setShowModal]   = useState(false);
  const [services, setServices]     = useState<PublicService[]>([]);
  const [svcLoading, setSvcLoading] = useState(false);
  const [selectedSvc, setSelectedSvc] = useState<PublicService | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [submitResult, setSubmitResult] = useState<{ success?: boolean; ticketId?: string; message?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    const fd = new FormData(e.currentTarget);
    startLogin(async () => {
      const res = await loginUser(fd);
      if (res?.error) setLoginError(res.error);
    });
  }

  const openModal = useCallback(async () => {
    setShowModal(true);
    setSubmitResult(null);
    setSelectedSvc(null);
    setSvcLoading(true);
    try {
      const res = await fetch("/api/public-services");
      if (!res.ok) throw new Error();
      setServices(await res.json());
    } catch { setServices([]); }
    finally { setSvcLoading(false); }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedSvc(null);
    setSubmitResult(null);
    formRef.current?.reset();
  }, []);

  async function handlePublicSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSvc) return;
    setSubmitResult(null);
    const fd = new FormData(e.currentTarget);
    fd.set("serviceId", selectedSvc._id);
    startSubmit(async () => {
      const result = await submitPublicTicket(fd);
      setSubmitResult(result);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">

      {/* ═══════ TOP HEADER ═══════ */}
      <header className="bg-campus-dark shadow-lg shadow-campus-dark/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Portal Layanan Terpadu</h1>
              <p className="text-white/50 text-[11px]">Universitas Metamedia</p>
            </div>
          </div>
          {/* Tagline */}
          <p className="hidden md:block text-white/40 text-sm">
            Melayani dengan <span className="text-brand-gold font-semibold">transparan</span> dan <span className="text-brand-gold font-semibold">profesional</span>
          </p>
        </div>
      </header>

      {/* ═══════ HERO STRIP ═══════ */}
      <div className="bg-campus-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Sistem Pengaduan Digital</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug" style={{ fontFamily: "var(--font-merriweather)" }}>
              Suarakan. Laporan. <span className="text-brand-gold">Selesaikan.</span>
            </h2>
            <p className="text-white/50 text-sm max-w-md">
              Sampaikan pengaduan dan permohonan layanan kampus dengan mudah dan transparan.
            </p>
          </div>
          {/* Stats strip */}
          <div className="flex items-center gap-6 shrink-0">
            {[
              { label: "Pengajuan Masuk", val: "1.284" },
              { label: "Diselesaikan",    val: "1.102" },
              { label: "Layanan Aktif",   val: "14" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.val}</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── KIRI: Live Feed (3 kolom) ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Papan Transparansi Publik</h3>
              <p className="text-xs text-slate-400 mt-0.5">10 pengajuan terbaru yang sedang ditangani sistem</p>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 border border-green-200 rounded-full text-[10px] font-bold text-green-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>

          {feed.length === 0 ? (
            <div className="card-light p-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              <p className="text-slate-400 text-sm">Belum ada pengajuan aktif saat ini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {feed.map((item, idx) => (
                <div key={item.ticketId} className="card-light hover:border-campus-primary/30 transition-all duration-200 group">
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* Number */}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-slate-400 text-xs font-bold">{String(idx + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate group-hover:text-campus-primary transition-colors">
                        {item.namaLayanan}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400 font-mono text-[10px]">{item.ticketId}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-slate-400 text-[10px]">{formatTanggal(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <StatusPill status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 pt-2">
            🔒 Identitas pelapor dirahasiakan · Data diperbarui setiap muat ulang
          </p>

          {/* CTA Lapor Publik — di bawah feed di mobile */}
          <div className="lg:hidden card-light p-5 border-2 border-dashed border-brand-gold/30 bg-amber-50/40">
            <h4 className="text-sm font-bold text-slate-800 mb-1">Punya keluhan?</h4>
            <p className="text-xs text-slate-500 mb-3">Ajukan laporan tanpa perlu membuat akun terlebih dahulu.</p>
            <button onClick={openModal} className="w-full btn-primary bg-brand-gold text-white">
              Ajukan Laporan Sekarang
            </button>
          </div>
        </div>

        {/* ── KANAN: Login + CTA (2 kolom) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Login Card */}
          <div className="card-light overflow-hidden">
            {/* Card top stripe */}
            <div className="h-1.5 bg-gradient-to-r from-campus-dark to-campus-primary" />

            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Masuk ke Portal</h3>
                <p className="text-sm text-slate-500 mt-0.5">Gunakan akun NIM/NIP kampus Anda</p>
              </div>

              {/* Login error */}
              {loginError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700 animate-in fade-in duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {loginError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="nim_nip" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">NIM / NIP</label>
                  <input
                    id="nim_nip" name="nim_nip" type="text" required autoComplete="username"
                    placeholder="Contoh: 22010001"
                    className="input-light"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
                  <input
                    id="password" name="password" type="password" required autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-light"
                  />
                </div>
                <button
                  id="btn-login" type="submit" disabled={isLoggingIn}
                  className="w-full btn-primary shadow-md shadow-campus-primary/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all py-3"
                >
                  {isLoggingIn ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : "Masuk ke Portal"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">atau</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* CTA Tamu */}
              <button
                id="btn-lapor-tamu" type="button" onClick={openModal}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-brand-gold/50 hover:border-brand-gold text-amber-800 font-semibold text-sm rounded-xl transition-all duration-200 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-gold" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                Ajukan Laporan Tanpa Akun
              </button>
            </div>
          </div>

          {/* Info card */}
          <div className="card-light p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-campus-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Laporan Tamu</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Pengajuan tanpa akun masuk ke <strong>antrian verifikasi</strong> sebelum diproses admin. Siapkan kontak aktif untuk tindak lanjut.
                </p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="card-light p-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Akses Cepat Admin</p>
            {[
              { label: "Dashboard Super Admin", href: "/sa-dashboard" },
              { label: "Pantauan Pengajuan",    href: "/monitoring" },
              { label: "Manajemen Pengguna",    href: "/users" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="flex items-center justify-between py-1.5 text-xs text-slate-600 hover:text-campus-primary group transition-colors">
                <span>{l.label}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-300 group-hover:text-campus-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-campus-dark mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-white/30">
          <span>Portal Layanan Terpadu — Universitas Metamedia</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* ═══════ MODAL PENGAJUAN PUBLIK ═══════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-lg max-h-[92vh] bg-white border border-border-light rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Formulir Pengajuan Publik</h2>
                  <p className="text-[11px] text-slate-400">Tanpa perlu membuat akun</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {submitResult?.success ? (
                /* Sukses */
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Pengajuan Terkirim!</h3>
                    <p className="text-sm text-slate-500 mt-1">{submitResult.message}</p>
                  </div>
                  <div className="inline-block px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Nomor Pengajuan Anda</p>
                    <p className="text-xl font-black text-amber-700 font-mono tracking-widest">{submitResult.ticketId}</p>
                  </div>
                  <p className="text-xs text-slate-400">Simpan nomor ini sebagai referensi pengajuan Anda.</p>
                  <button onClick={closeModal} className="btn-primary">Tutup</button>
                </div>
              ) : (
                /* Form */
                <form ref={formRef} onSubmit={handlePublicSubmit} className="space-y-4">
                  {submitResult?.error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {submitResult.error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      WhatsApp / Email Kontak <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="kontak_pelapor" name="kontak_pelapor" type="text" required
                      placeholder="Contoh: 081234567890 atau nama@email.com"
                      className="input-light"
                    />
                    <p className="text-[11px] text-slate-400">Digunakan jika admin perlu menghubungi Anda.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Kategori Layanan <span className="text-red-500">*</span>
                    </label>
                    {svcLoading ? (
                      <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Memuat layanan...
                      </div>
                    ) : services.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        Belum ada layanan publik tersedia.
                      </div>
                    ) : (
                      <select
                        id="select-public-service" required defaultValue=""
                        onChange={(e) => { setSelectedSvc(services.find((s) => s._id === e.target.value) || null); setSubmitResult(null); }}
                        className="input-light appearance-none cursor-pointer"
                      >
                        <option value="" disabled>— Pilih kategori —</option>
                        {services.map((svc) => (<option key={svc._id} value={svc._id}>{svc.namaLayanan}</option>))}
                      </select>
                    )}
                  </div>

                  {selectedSvc && (
                    <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-campus-primary rounded-full" />
                        Formulir: {selectedSvc.namaLayanan}
                      </p>
                      {selectedSvc.formBuilder.map((field) => (
                        <div key={field.id} className="space-y-1.5">
                          <label htmlFor={`field-${field.id}`} className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                            {field.label}{field.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.type === "text"     && <input id={`field-${field.id}`} name={field.id} type="text" required={field.isRequired} placeholder={`Masukkan ${field.label.toLowerCase()}`} className="input-light" />}
                          {field.type === "textarea" && <textarea id={`field-${field.id}`} name={field.id} required={field.isRequired} rows={3} placeholder={`Jelaskan secara detail...`} className="input-light resize-none" />}
                          {field.type === "select" && field.options && (
                            <select id={`field-${field.id}`} name={field.id} required={field.isRequired} defaultValue="" className="input-light appearance-none cursor-pointer">
                              <option value="" disabled>— Pilih opsi —</option>
                              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                          {field.type === "file" && (
                            <input id={`field-${field.id}`} name={field.id} type="file" required={field.isRequired} accept="image/*,.pdf,.doc,.docx"
                              className="input-light file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-campus-primary/10 file:text-campus-primary hover:file:bg-campus-primary/20 cursor-pointer" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSvc && (
                    <button id="btn-submit-public" type="submit" disabled={isSubmitting} className="w-full btn-primary disabled:opacity-50">
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Mengirim...
                        </span>
                      ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>Kirim Pengajuan</>
                      )}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
