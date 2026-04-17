"use client";

import { useState, useTransition, useRef, useCallback, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { loginUser } from "@/app/actions/authActions";
import { 
  submitPublicTicket, 
  type PublicFeedItem, 
  trackPublicTicket, 
  guestConfirmTicketClosed, 
  guestReopenTicket, 
  getPublicServices 
} from "@/app/actions/publicActions";
import Link from "next/link";

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

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  "Masuk":              { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    border: "border-blue-100" },
  "Diproses":           { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   border: "border-amber-100" },
  "Selesai":            { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500",  border: "border-emerald-100" },
  "Pending Verifikasi": { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500",  border: "border-purple-100" },
  "Dibatalkan":         { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     border: "border-red-100" },
  "Ditutup":            { bg: "bg-slate-50",    text: "text-slate-700",   dot: "bg-slate-500",   border: "border-slate-100" },
  "Komplain":           { bg: "bg-rose-50",     text: "text-rose-700",    dot: "bg-rose-500",    border: "border-rose-100" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400", border: "border-slate-100" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

interface FormField { 
  id: string; 
  label: string; 
  type: "text" | "textarea" | "select" | "file"; 
  isRequired: boolean; 
  options?: string[]; 
}

interface PublicService { 
  _id: string; 
  namaLayanan: string; 
  departmentId: string; 
  formBuilder: FormField[]; 
  description?: string; 
}

// ─── Modern Helper Components ───────────────────────────────

function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-campus-primary/5 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[80px]" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function LandingClient({ 
  initialTickets, 
  services: initialServices 
}: { 
  initialTickets: PublicFeedItem[], 
  services: PublicService[] 
}) {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, startLogin]   = useTransition();
  const [showModal, setShowModal]   = useState(false);
  const [formStep, setFormStep]     = useState<1 | 2 | 3>(1);
  const [services] = useState<PublicService[]>(initialServices || []);
  const [selectedSvc, setSelectedSvc] = useState<PublicService | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [submitResult, setSubmitResult] = useState<{ success?: boolean; ticketId?: string; guestPin?: string; message?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // --- Search, Filter & Pagination States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [deptFilter, setDeptFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedTicket, setSelectedTicket] = useState<PublicFeedItem | null>(null);

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

  // --- Logic ---
  const departments = useMemo(() => {
    const depts = new Set(initialTickets.map(t => t.departmentName));
    return ["Semua", ...Array.from(depts)];
  }, [initialTickets]);

  const allStatuses = ["Semua", "Masuk", "Diproses", "Selesai", "Pending Verifikasi", "Dibatalkan", "Ditutup", "Komplain"];

  const filteredTickets = useMemo(() => {
    return initialTickets.filter(t => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search || 
                          t.ticketId.toLowerCase().includes(search) ||
                          t.namaLayanan.toLowerCase().includes(search);

      // Multi-filter case-insensitive matching
      const matchStatus = statusFilter === "Semua" || 
                          t.status.toLowerCase().trim() === statusFilter.toLowerCase().trim();
      
      const matchDept = deptFilter === "Semua" || 
                        t.departmentName.toLowerCase().trim() === deptFilter.toLowerCase().trim();

      return matchSearch && matchStatus && matchDept;
    });
  }, [initialTickets, searchTerm, statusFilter, deptFilter]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, deptFilter]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    const fd = new FormData(e.currentTarget);
    startLogin(async () => {
      const res = await loginUser(fd);
      if (res?.error) setLoginError(res.error);
    });
  }

  const openModal = useCallback(async (svc?: PublicService) => {
    setShowModal(true);
    setFormStep(svc ? 2 : 1);
    setSubmitResult(null);
    setSelectedSvc(svc || null);
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
        const freshRes = await trackPublicTicket(trackId, trackPin);
        if (!freshRes.error) setTrackResult(freshRes.ticket);
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-campus-primary/10">
      <MeshGradient />

      {/* ─── NAVIGATION ─── */}
      <nav className="sticky top-0 z-40 bg-campus-dark backdrop-blur-xl border-b border-white/10 shadow-lg shadow-campus-dark/10">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg text-white font-black italic text-lg translate-y-[-1px]">
              H
            </div>
            <div>
              <h1 className="text-white font-black text-lg leading-tight tracking-tight">Helpdesk Metamedia</h1>
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-0.5">Transparency Dashboard System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {/* Live board badge removed per user request */}
          </div>
        </div>
      </nav>

      {/* ─── MAIN DASHBOARD ─── */}
      <main className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-start">
        
        {/* LEFT: Transparency Board (Table View) (8/12) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Papan Transparansi</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Public Work Logs & Progress</p>
                </div>
                <div className="relative group md:min-w-[300px]">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-campus-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="ID TIKET / LAYANAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-campus-primary/5 focus:border-campus-primary outline-none transition-all font-black text-[10px] uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-3">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Unit Kerja:</span>
                   <select 
                     value={deptFilter} 
                     onChange={(e)=>setDeptFilter(e.target.value)}
                     className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-campus-primary/5 focus:border-campus-primary transition-all min-w-[200px]"
                   >
                     {departments.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Status:</span>
                   <select 
                     value={statusFilter} 
                     onChange={(e)=>setStatusFilter(e.target.value)}
                     className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-campus-primary/5 focus:border-campus-primary transition-all min-w-[150px]"
                   >
                     {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">No. Tiket</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Layanan / Unit Kerja</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em] text-center">Status Progress</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em] text-right">Terakhir Update</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em] w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                         <div className="flex flex-col items-center gap-2 opacity-30">
                            <span className="text-4xl text-slate-200">🔍</span>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Data Tidak Ditemukan</p>
                         </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((ticket) => (
                      <tr 
                        key={ticket._id} 
                        onClick={() => setSelectedTicket(ticket)}
                        className="group bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg hover:shadow-slate-200/40 transition-all cursor-pointer rounded-2xl"
                      >
                        <td className="px-4 py-5 rounded-l-2xl">
                          <span className="text-xs font-mono font-black text-slate-500 tracking-wider group-hover:text-campus-primary transition-colors">
                            {ticket.ticketId}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-campus-primary transition-colors">{ticket.namaLayanan}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-slate-500 transition-colors">{ticket.departmentName}</p>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <StatusPill status={ticket.status} />
                        </td>
                        <td className="px-4 py-5 text-right">
                          <span className="text-[11px] font-bold text-slate-300 group-hover:text-slate-500 transition-colors uppercase tracking-widest">
                            {formatTanggal(ticket.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 rounded-r-2xl text-right">
                           <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 group-hover:text-campus-primary group-hover:bg-campus-primary/5 transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-white hover:text-campus-primary transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                
                <div className="flex items-center gap-1">
                   {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                     <button
                       key={page}
                       onClick={() => setCurrentPage(page)}
                       className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-campus-dark text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                     >
                       {page}
                     </button>
                   ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-white hover:text-campus-primary transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Functional Sidebar (4/12) */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Section 1: Login Portal */}
          <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Portal</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">NIM / NIP Account</p>
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-bold text-red-600 mb-6 flex items-center gap-2">
                <span className="shrink-0 text-base">⚠️</span> {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" name="nim_nip" required placeholder="User ID / NIM / NIP" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none transition-all font-black text-xs" />
              <input type="password" name="password" required placeholder="Security Password" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none transition-all font-black text-xs" />
              <button 
                type="submit" 
                disabled={isLoggingIn} 
                className="w-full py-4 bg-campus-dark text-white rounded-2xl font-black shadow-xl shadow-campus-dark/20 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
              >
                 {isLoggingIn ? "AUTHENTICATING..." : "MASUK KE SISTEM"}
              </button>
            </form>
          </div>

          {/* Section 2: Buat Laporan Baru (MOVED UP) */}
          <div 
            className="p-1 min-h-[140px] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[2.5rem] shadow-2xl shadow-emerald-200/40 group cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]" 
            onClick={() => openModal()}
          >
            <div className="text-center p-6 space-y-3 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 text-white border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h3 className="text-lg font-black tracking-tight">Buka Laporan Baru</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/90">Laporan Publik (Tamu)</p>
            </div>
          </div>

          {/* Section 3: Lacak Laporan (COLOR MODIFIED) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-1 rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 overflow-hidden relative group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="relative p-8 space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-lg font-black text-white tracking-tight">Lacak Tiket Anda</h3>
                    <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest mt-1">Real-time Response Tracking</p>
                 </div>
                 <div className="w-11 h-11 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
                    <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>
              </div>

              <form onSubmit={handleTrack} className="space-y-4">
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="ID TIKET (CONTOH: TKT-123456)" 
                    value={trackId} 
                    onChange={e=>setTrackId(e.target.value)} 
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600 uppercase tracking-wider" 
                  />
                  <input 
                    type="text" 
                    placeholder="PIN SECURITY (6 DIGIT)" 
                    value={trackPin} 
                    onChange={e=>setTrackPin(e.target.value)} 
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600 uppercase tracking-wider" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isTracking} 
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isTracking ? "VERIFYING..." : "CEK STATUS SEKARANG"}
                </button>
              </form>
              
              {trackError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-[10px] font-bold text-red-400 text-center animate-shake">
                   ⚠️ {trackError}
                </div>
              )}
            </div>
          </div>

        </aside>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="max-w-[1400px] mx-auto px-6 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">© {new Date().getFullYear()} IT Development Center • Universitas Metamedia</p>
           <div className="flex gap-10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Privacy Policy</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transparency Data System</span>
           </div>
        </div>
      </footer>

      {/* ───── MODAL DETAIL TIKET (PUBLIK) ───── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedTicket(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">Rincian Progress Laporan</h2>
                   <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest font-black uppercase text-campus-primary">{selectedTicket.ticketId}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-3 bg-white hover:bg-slate-100 rounded-full text-slate-400 transition-colors shadow-sm">
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                   </svg>
                </button>
             </div>

             <div className="p-10 max-h-[60vh] overflow-y-auto space-y-10">
                <div className="grid grid-cols-2 gap-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategori Layanan</p>
                      <p className="font-black text-slate-900 leading-tight text-sm">{selectedTicket.namaLayanan}</p>
                   </div>
                   <div className="space-y-1.5 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Kerja Terkait</p>
                      <p className="font-black text-slate-900 leading-tight text-sm">{selectedTicket.departmentName}</p>
                   </div>
                </div>

                <div className="space-y-5">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-campus-primary" />
                     Konten Aduan (Enkripsi Anonim)
                   </h4>
                   <div className="space-y-4">
                      {selectedTicket.formSnapshot?.map((field: any) => {
                         const value = selectedTicket.dynamicData?.[field.id];
                         if (!value) return null;
                         return (
                           <div key={field.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white transition-all">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{field.label}</p>
                             <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                           </div>
                         );
                      })}
                   </div>
                </div>

                <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-4">
                   <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                   </div>
                   <p className="text-[10px] text-indigo-700/80 leading-relaxed font-black uppercase tracking-widest">
                     Proteksi Privasi: Identitas pelapor dan file lampiran disembunyikan secara permanen dari akses publik.
                   </p>
                </div>
             </div>
             <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setSelectedTicket(null)} className="px-10 py-4 bg-campus-dark text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-campus-dark/30 hover:scale-105">
                   SELESAI MEMBACA
                </button>
             </div>
          </div>
        </div>
      )}

      {/* ───── MODAL PENGAJUAN TIKET (TAMU) ───── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-xl max-h-[94vh] bg-white border border-slate-100 rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Kirim Laporan Publik</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lengkapi data untuk mengirim bantuan</p>
               </div>
               <button onClick={closeModal} className="p-3 bg-white hover:bg-slate-100 rounded-full text-slate-400 transition-colors shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="overflow-y-auto flex-1 px-10 py-8">
               {formStep === 3 && submitResult?.success ? (
                 <div className="text-center py-6 space-y-6">
                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                       <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">Laporan Terkirim!</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Mohon simpan kredensial berikut:</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Tiket</p>
                          <p className="text-2xl font-black text-campus-dark">{submitResult.ticketId}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PIN Konfirmasi</p>
                          <p className="text-2xl font-black text-emerald-600">{submitResult.guestPin}</p>
                       </div>
                    </div>
                    <button onClick={closeModal} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                       Saya Sudah Mencatat PIN
                    </button>
                 </div>
               ) : (
                 <form ref={formRef} onSubmit={handlePublicSubmit} className="space-y-6">
                    <div className="flex gap-2">
                       {[1,2].map(s => (
                         <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${formStep >= s ? 'bg-campus-primary' : 'bg-slate-100 shadow-inner'}`} />
                       ))}
                    </div>

                    {formStep === 1 && (
                      <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Kategori Layanan</label>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                               {services.map(svc => (
                                  <div 
                                    key={svc._id} 
                                    onClick={() => setSelectedSvc(svc)}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedSvc?._id === svc._id ? 'border-campus-primary bg-campus-primary/5' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                                  >
                                     <div className="min-w-0">
                                        <p className={`text-sm font-black truncate ${selectedSvc?._id === svc._id ? 'text-campus-primary' : 'text-slate-700'}`}>{svc.namaLayanan}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{svc.departmentId}</p>
                                     </div>
                                     {selectedSvc?._id === svc._id && (
                                        <div className="w-5 h-5 bg-campus-primary rounded-full flex items-center justify-center text-white">
                                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                     )}
                                  </div>
                               ))}
                            </div>
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                               <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nama Pelapor</label>
                               <input id="guestName" name="guestName" required placeholder="Nama Lengkap" className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-campus-primary transition-all shadow-sm" />
                            </div>
                            <div className="space-y-3">
                               <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Email</label>
                               <input id="guestContact" name="guestContact" required placeholder="08xxxxxxxx" className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-campus-primary transition-all shadow-sm" />
                            </div>
                         </div>
                         <button 
                           type="button" 
                           onClick={() => {
                              if(selectedSvc && (document.getElementById('guestName') as any).value && (document.getElementById('guestContact') as any).value) {
                                  setFormStep(2);
                              } else {
                                  alert("Mohon pilih layanan dan lengkapi identitas.");
                              }
                           }} 
                           className="w-full py-5 bg-campus-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-campus-dark/20"
                         >
                            Lanjut ke Isi Laporan
                         </button>
                      </div>
                    )}

                    {formStep === 2 && (
                       <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                          <div className="p-4 bg-campus-primary/5 border border-campus-primary/10 rounded-2xl flex items-center justify-between">
                             <div>
                                <p className="text-[8px] font-black text-campus-primary uppercase tracking-widest">Detail Laporan Untuk</p>
                                <p className="text-xs font-black text-slate-800">{selectedSvc?.namaLayanan}</p>
                             </div>
                             <button type="button" onClick={()=>setFormStep(1)} className="text-[10px] font-black text-campus-primary underline">Ubah</button>
                          </div>
                          
                          <div className="space-y-6">
                             {selectedSvc?.formBuilder.map(field => (
                                <div key={field.id} className="space-y-3">
                                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                   {field.type === 'text' && <input name={field.id} required={field.isRequired} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-campus-primary transition-all shadow-sm" />}
                                   {field.type === 'textarea' && <textarea name={field.id} required={field.isRequired} rows={4} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-campus-primary transition-all resize-none shadow-sm" />}
                                   {field.type === 'select' && (
                                      <select name={field.id} required={field.isRequired} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-campus-primary transition-all shadow-sm">
                                         <option value="">— Pilih —</option>
                                         {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                      </select>
                                   )}
                                   {field.type === 'file' && <input type="file" name={field.id} required={field.isRequired} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />}
                                </div>
                             ))}
                          </div>

                          <div className="flex gap-4 pt-4">
                             <button type="button" onClick={() => setFormStep(1)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Kembali</button>
                             <button type="submit" disabled={isSubmitting} className="flex-[2] py-5 bg-campus-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-campus-dark/20">
                                {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
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

      {/* ───── MODAL PELACAKAN (SIDEBAR ACTION) ───── */}
      {showTrackModal && trackResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={()=>setShowTrackModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-brand-gold text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-gold/20">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Status Tiket</h3>
                      <p className="text-[10px] font-black text-slate-400 font-mono tracking-widest uppercase">{trackResult.ticketId}</p>
                   </div>
                </div>
                <button onClick={()=>setShowTrackModal(false)} className="p-3 bg-white hover:bg-slate-100 rounded-full text-slate-400 transition-colors shadow-sm">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             <div className="p-10 max-h-[70vh] overflow-y-auto space-y-8">
                <div className="flex justify-between items-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Topik Bantuan</p>
                      <p className="text-sm font-black text-slate-800 tracking-tight">{trackResult.namaLayanan}</p>
                   </div>
                   <StatusPill status={trackResult.status} />
                </div>

                <div className="space-y-6 relative pl-5">
                   <div className="absolute left-[24.5px] top-2 bottom-4 w-1 bg-slate-100 rounded-full" />
                   {trackResult.statusHistory.map((h:any, i:number) => {
                      const isLast = i === trackResult.statusHistory.length - 1;
                      return (
                         <div key={i} className="relative flex gap-8 items-start">
                            <div className={`w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 z-10 outline outline-[6px] outline-white ${isLast ? 'bg-campus-primary ring-2 ring-campus-primary/30' : 'bg-slate-300'}`} />
                            <div className="flex-1 min-w-0">
                               <p className={`text-sm font-black tracking-tight ${isLast ? 'text-slate-900' : 'text-slate-500'}`}>{h.status}</p>
                               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">{formatTanggal(h.timestamp)}</p>
                               {h.note && (
                                  <div className="mt-3 p-4 bg-slate-50 rounded-2xl text-xs font-bold text-slate-500 leading-relaxed italic border border-slate-100 shadow-sm">
                                     "{h.note}"
                                  </div>
                               )}
                            </div>
                         </div>
                      );
                   })}
                </div>

                {trackResult.status === "Selesai" && (
                   <div className="p-7 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] space-y-5 shadow-inner">
                      <div className="space-y-2">
                         <h4 className="text-base font-black text-emerald-900 tracking-tight">Konfirmasi Penyelesaian</h4>
                         <p className="text-xs font-bold text-emerald-700/60 leading-relaxed">Admin telah menyelesaikan laporan ini. Mohon konfirmasi untuk menutup tiket secara permanen.</p>
                      </div>
                      
                      {!showGuestComplaint ? (
                         <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleGuestAccept} disabled={isGuestActionPending} className="py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-600/30 text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">Ya, Selesai</button>
                            <button onClick={()=>setShowGuestComplaint(true)} disabled={isGuestActionPending} className="py-4 bg-white border-2 border-emerald-200 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-100">Ada Masalah</button>
                         </div>
                      ) : (
                         <form onSubmit={handleGuestComplain} className="space-y-4 pt-2">
                             <textarea value={guestComplaintNote} onChange={e=>setGuestComplaintNote(e.target.value)} required placeholder="Jelaskan kendala Anda..." rows={3} className="w-full p-5 bg-white border-2 border-emerald-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-400 transition-all resize-none" />
                             <div className="flex gap-3">
                                <button type="button" onClick={()=>setShowGuestComplaint(false)} className="flex-1 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Batal</button>
                                <button type="submit" disabled={isGuestActionPending} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/30">Kirim Komplain</button>
                             </div>
                         </form>
                      )}
                   </div>
                )}
             </div>

             <div className="px-10 py-6 border-t border-slate-100 bg-slate-50/50">
                <button onClick={()=>setShowTrackModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-[0.98]">Selesai Memantau</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
