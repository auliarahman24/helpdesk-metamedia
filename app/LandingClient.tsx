"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { loginUser } from "@/app/actions/authActions";
import { submitPublicTicket, type PublicFeedItem, trackPublicTicket, guestConfirmTicketClosed, guestReopenTicket, getPublicServices } from "@/app/actions/publicActions";

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
  "Ditutup":            { bg: "bg-slate-100",   text: "text-slate-800",  dot: "bg-slate-500" },
  "Komplain":           { bg: "bg-rose-100",    text: "text-rose-800",   dot: "bg-rose-500" },
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
  const [formStep, setFormStep]     = useState<1 | 2 | 3>(1);
  const [services, setServices]     = useState<PublicService[]>([]);
  const [svcLoading, setSvcLoading] = useState(false);
  const [selectedSvc, setSelectedSvc] = useState<PublicService | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [submitResult, setSubmitResult] = useState<{ success?: boolean; ticketId?: string; guestPin?: string; message?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // States for Tracking
  const [trackId, setTrackId] = useState("");
  const [trackPin, setTrackPin] = useState("");
  const [isTracking, startTracking] = useTransition();
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState("");
  const [showTrackModal, setShowTrackModal] = useState(false);

  // Guest Resolution State
  const [showGuestComplaint, setShowGuestComplaint] = useState(false);
  const [guestComplaintNote, setGuestComplaintNote] = useState("");
  const [isGuestActionPending, startGuestAction] = useTransition();

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
    setFormStep(1);
    setSubmitResult(null);
    setSelectedSvc(null);
    setSvcLoading(true);
    try {
      const data = await getPublicServices();
      setServices(data);
    } catch { 
      setServices([]); 
    } finally { 
      setSvcLoading(false); 
    }
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
      if (result.success) {
        setFormStep(3);
        formRef.current?.reset();
      }
    });
  }

  async function handleTrack(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTrackError("");
    setTrackResult(null);
    startTracking(async () => {
      const res = await trackPublicTicket(trackId, trackPin);
      if (res.error) {
        setTrackError(res.error);
      } else {
        setTrackResult(res.ticket);
        setShowTrackModal(true);
        setShowGuestComplaint(false);
        setGuestComplaintNote("");
      }
    });
  }

  function handleGuestAccept() {
    if (!trackResult) return;
    startGuestAction(async () => {
      const res = await guestConfirmTicketClosed(trackId, trackPin);
      if (res.error) alert(res.error);
      else {
        alert(res.message);
        // Refresh track result locally
        const freshRes = await trackPublicTicket(trackId, trackPin);
        if (!freshRes.error) setTrackResult(freshRes.ticket);
      }
    });
  }

  function handleGuestComplain(e: React.FormEvent) {
    e.preventDefault();
    if (!trackResult || !guestComplaintNote.trim()) return;
    startGuestAction(async () => {
      const res = await guestReopenTicket(trackId, trackPin, guestComplaintNote);
      if (res.error) alert(res.error);
      else {
        alert(res.message);
        setShowGuestComplaint(false);
        setGuestComplaintNote("");
        // Refresh track result locally
        const freshRes = await trackPublicTicket(trackId, trackPin);
        if (!freshRes.error) setTrackResult(freshRes.ticket);
      }
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

          {/* ── FITUR BARU: LACAK LAPORAN PUBLIK ── */}
          <div className="card-light overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lacak Laporan Anda</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Cek status laporan menggunakan ID Tiket & PIN</p>
              </div>

              {trackError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {trackError}
                </div>
              )}

              <form onSubmit={handleTrack} className="space-y-3">
                <input
                  type="text" required placeholder="ID Tiket (TKT-...)"
                  value={trackId} onChange={e => setTrackId(e.target.value)}
                  className="input-light py-2 text-sm"
                />
                <input
                  type="text" required placeholder="PIN Rahasia (6 digit angka)"
                  value={trackPin} onChange={e => setTrackPin(e.target.value)}
                  className="input-light py-2 text-sm"
                />
                <button
                  type="submit" disabled={isTracking}
                  className="w-full btn-primary bg-amber-500 hover:bg-amber-600 py-2.5 text-xs shadow-md shadow-amber-500/20"
                >
                  {isTracking ? "Mengecek..." : "Cek Status Laporan"}
                </button>
              </form>
            </div>
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
              {formStep === 3 && submitResult?.success ? (
                /* Sukses - High Visibility Warning */
                <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Laporan Terkirim!</h3>
                    <p className="text-sm text-slate-500 mt-1">Laporan Anda telah masuk ke sistem kami.</p>
                  </div>

                  {/* ⚠ WARNING BOX ⚠ */}
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-left space-y-3 ring-4 ring-rose-500/5">
                    <div className="flex items-center gap-2 text-rose-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="font-black text-xs uppercase tracking-widest">Peringatan Penting!</span>
                    </div>
                    <p className="text-xs text-rose-600 font-bold leading-relaxed">
                      Sistem kami tidak mengirimkan email otomatis. Silakan <span className="bg-rose-200 px-1 rounded">SCREENSHOT</span> atau <span className="bg-rose-200 px-1 rounded">CATAT</span> ID dan PIN di bawah ini untuk melihat balasan admin nanti.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pb-2 pt-1 text-left">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden group">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">ID Tiket</p>
                      <p className="font-mono text-base font-black text-campus-primary">{submitResult.ticketId}</p>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden group">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">PIN Rahasia</p>
                      <p className="font-mono text-base font-black text-rose-600">{submitResult.guestPin}</p>
                    </div>
                  </div>

                  <button 
                    onClick={closeModal} 
                    className="w-full btn-primary bg-slate-900 border-b-4 border-slate-950 py-4 shadow-lg hover:translate-y-[2px] transition-all"
                  >
                    Saya Sudah Mencatat PIN
                  </button>
                </div>
              ) : (
                /* Wizard Form Step 1 & 2 */
                <form ref={formRef} onSubmit={handlePublicSubmit} className="space-y-4">
                  {/* Step Progress */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${formStep >= 1 ? 'bg-campus-primary shadow-[0_0_8px_rgba(var(--campus-primary-rgb),0.5)]' : 'bg-slate-100'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${formStep >= 2 ? 'bg-campus-primary shadow-[0_0_8px_rgba(var(--campus-primary-rgb),0.5)]' : 'bg-slate-100'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${formStep >= 3 ? 'bg-campus-primary shadow-[0_0_8px_rgba(var(--campus-primary-rgb),0.5)]' : 'bg-slate-100'}`} />
                  </div>

                  {submitResult?.error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {submitResult.error}
                    </div>
                  )}

                  {formStep === 1 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-1">Langkah 1: Identitas</h4>
                        <p className="text-[11px] text-slate-500">Masukkan nama dan kontak agar admin dapat mengonfirmasi laporan Anda.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Nama Lengkap Pelapor <span className="text-red-500">*</span></label>
                        <input id="guestName" name="guestName" type="text" required placeholder="Masukkan nama lengkap" className="input-light" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">WhatsApp / Email Kontak <span className="text-red-500">*</span></label>
                        <input id="guestContact" name="guestContact" type="text" required placeholder="Contoh: 081234567890" className="input-light" />
                      </div>

                      <button 
                        type="button" 
                        onClick={() => {
                          const name = (document.getElementById('guestName') as HTMLInputElement)?.value;
                          const contact = (document.getElementById('guestContact') as HTMLInputElement)?.value;
                          if (name && contact) setFormStep(2);
                          else alert("Harap isi Nama dan Kontak terlebih dahulu");
                        }}
                        className="w-full btn-primary bg-slate-900 border-b-4 border-slate-950 py-3 mt-4"
                      >
                        Lanjut ke Detail Laporan
                      </button>
                    </div>
                  )}

                  {formStep === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Kategori Layanan <span className="text-red-500">*</span></label>
                        {svcLoading ? (
                          <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Memuat layanan...
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
                        <div className="space-y-4 pt-3 animate-in fade-in duration-300">
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

                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setFormStep(1)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
                          Kembali
                        </button>
                        <button type="submit" disabled={isSubmitting || !selectedSvc} className="flex-[2] btn-primary disabled:opacity-50 border-b-4 border-blue-900">
                          {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL PELACAKAN TIKET (GUEST TRACKING) ═══════ */}
      {showTrackModal && trackResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrackModal(false)} />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Status Laporan Anda</h3>
                  <p className="text-[11px] font-mono text-slate-500">{trackResult.ticketId}</p>
                </div>
              </div>
              <button onClick={() => setShowTrackModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Laporan Detail */}
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Layanan</p>
                    <p className="text-sm font-semibold text-slate-800">{trackResult.namaLayanan}</p>
                  </div>
                  <StatusPill status={trackResult.status} />
                </div>
                <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Pelapor</p>
                    <p className="font-medium text-slate-700">{trackResult.guestName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Prioritas</p>
                    <p className="font-medium text-slate-700">{trackResult.prioritas}</p>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Riwayat Perjalanan
                </h4>
                <div className="relative pl-3 space-y-6">
                  {/* Vertical Line */}
                  <div className="absolute top-2 bottom-4 left-[21px] w-px bg-slate-200" />
                  
                  {trackResult.statusHistory.map((h: any, i: number) => {
                    const isLast = i === trackResult.statusHistory.length - 1;
                    return (
                      <div key={i} className="relative flex gap-4 items-start">
                        <div className={`w-[18px] h-[18px] rounded-full flex shrink-0 items-center justify-center relative z-10 mt-0.5 ${isLast ? 'bg-campus-primary text-white shadow-md shadow-campus-primary/30 ring-4 ring-white' : 'bg-slate-200 border-2 border-white'}`}>
                          {isLast && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${isLast ? 'text-slate-900' : 'text-slate-600'}`}>
                            {h.status}
                          </p>
                          <div className="text-[11px] text-slate-400 font-medium mb-1 mt-0.5 flex flex-wrap gap-x-2">
                            <span>{formatTanggal(h.timestamp)}</span>
                          </div>
                          {h.note && (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-1.5 w-full">
                              <p className="text-xs text-slate-600 leading-relaxed italic">{h.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aksi Resolusi Tamu */}
              {trackResult.status === "Selesai" && (
                <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Verifikasi Resolusi</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pengajuan Anda telah selesai diproses oleh tim kami. Harap konfirmasi apakah hasil perbaikan sudah sesuai.</p>
                  </div>

                  {!showGuestComplaint ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleGuestAccept}
                        disabled={isGuestActionPending}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        {isGuestActionPending ? "Memproses..." : "Ya, Saya Terima (Tutup Laporan)"}
                      </button>
                      <button
                        onClick={() => setShowGuestComplaint(true)}
                        disabled={isGuestActionPending}
                        className="flex-1 px-4 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        Komplain & Kembalikan
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleGuestComplain} className="space-y-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100 mt-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Alasan Komplain <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={guestComplaintNote}
                        onChange={(e) => setGuestComplaintNote(e.target.value)}
                        placeholder="Jelaskan mengapa laporan Anda dikembalikan..."
                        rows={3}
                        className="w-full text-sm p-3 rounded-xl border border-slate-200 shadow-inner focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 font-medium"
                      />
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowGuestComplaint(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
                          Batal
                        </button>
                        <button type="submit" disabled={isGuestActionPending || !guestComplaintNote.trim()} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2">
                          Kirim Komplain
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => {
                  setShowTrackModal(false);
                  setShowGuestComplaint(false);
                }} 
                className="w-full btn-primary bg-slate-800 hover:bg-slate-900 py-2.5"
              >
                Tutup Pelacakan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
