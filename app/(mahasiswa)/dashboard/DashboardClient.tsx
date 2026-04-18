"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatTanggal(iso: string | Date) {
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

function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-campus-primary/5 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[80px]" />
    </div>
  );
}

export default function DashboardClient({ 
  session, 
  tickets 
}: { 
  session: { nim_nip: string; role: string; nama: string };
  tickets: any[];
}) {
  const router = useRouter();
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Stats
  const total = tickets.length;
  const diproses = tickets.filter((t) => t.status === "Diproses").length;
  const selesai = tickets.filter((t) => t.status === "Selesai" || t.status === "Ditutup").length;

  const allStatuses = ["Semua", "Masuk", "Diproses", "Selesai", "Pending Verifikasi", "Dibatalkan", "Ditutup", "Komplain"];

  // Filter Logic
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const search = searchTerm.toLowerCase().trim();
      const namaLayanan = t.namaLayanan || t.departmentId || "Layanan";
      const matchSearch = !search || 
                          (t.ticketId && t.ticketId.toLowerCase().includes(search)) ||
                          namaLayanan.toLowerCase().includes(search);
      
      const matchStatus = statusFilter === "Semua" || 
                          (t.status && t.status.toLowerCase().trim() === statusFilter.toLowerCase().trim());
      
      return matchSearch && matchStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  // Pagination Logic
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-campus-primary/10">
      <MeshGradient />

      {/* ── NAVIGATION ── */}
      <header className="sticky top-0 z-40 bg-campus-dark backdrop-blur-xl border-b border-white/10 shadow-lg shadow-campus-dark/10">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg text-white font-black text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-black text-lg leading-tight tracking-tight">Portal Layanan Terpadu</h1>
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-0.5">Universitas Metamedia</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-2">
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Buat Pengajuan", href: "/pengajuan" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl text-sm font-bold transition-all">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 pl-6 border-l border-white/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-brand-gold/20 border border-yellow-400/50">
                <span className="text-sm font-black text-slate-900">
                  {session.nama?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                 <p className="text-white text-sm font-black">{session.nama}</p>
                 <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{session.nim_nip}</p>
              </div>
              <a href="/" className="ml-2 p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-xl transition-all" title="Keluar">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-[1400px] mx-auto px-6 py-10 space-y-8">
        
        {/* Header & Stats */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Mahasiswa</h2>
              <p className="text-sm font-bold text-slate-500 mt-2">Kelola dan pantau seluruh laporan dan pengajuan layanan Anda.</p>
           </div>
           <Link href="/pengajuan" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-campus-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-campus-dark/20 hover:scale-105 active:scale-95 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Buat Pengajuan Baru
           </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           {/* Total */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                 </svg>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pengajuan</p>
                 <p className="text-3xl font-black text-slate-900 mt-1">{total}</p>
              </div>
           </div>
           {/* Diproses */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-5">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                 </svg>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sedang Diproses</p>
                 <p className="text-3xl font-black text-amber-600 mt-1">{diproses}</p>
              </div>
           </div>
           {/* Selesai */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai / Ditutup</p>
                 <p className="text-3xl font-black text-emerald-600 mt-1">{selesai}</p>
              </div>
           </div>
        </div>

        {/* Tabel Data Mirip Landing Page */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight">Daftar Pengajuan Saya</h2>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Trek progres dan riwayat pelaporan</p>
              </div>
              <div className="relative group md:min-w-[300px]">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-campus-primary transition-colors">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>
                 <input 
                   type="text" 
                   placeholder="CARI ID TIKET / LAYANAN..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-campus-primary/5 focus:border-campus-primary outline-none transition-all font-black text-xs uppercase tracking-wider"
                 />
              </div>
           </div>

           {/* Filters */}
           <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-50 mt-6">
              <div className="flex items-center gap-3">
                 <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Status:</span>
                 <select 
                   value={statusFilter} 
                   onChange={(e)=>setStatusFilter(e.target.value)}
                   className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-campus-primary/5 focus:border-campus-primary transition-all min-w-[150px] cursor-pointer"
                 >
                   {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
           </div>

           {/* Table */}
           <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">No. Tiket</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Kategori Layanan</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em] text-center">Status</th>
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
                        onClick={() => router.push(`/tracking/${ticket._id}`)}
                        className="group bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg hover:shadow-slate-200/40 transition-all cursor-pointer rounded-2xl"
                      >
                        <td className="px-4 py-5 rounded-l-2xl">
                          <span className="text-xs font-mono font-black text-slate-500 tracking-wider group-hover:text-campus-primary transition-colors">
                            {ticket.ticketId}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-campus-primary transition-colors">
                            {ticket.namaLayanan || ticket.departmentId || "Layanan"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-slate-500 transition-colors">
                            {(ticket as any).departmentName || ticket.departmentId}
                          </p>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <StatusPill status={ticket.status} />
                        </td>
                        <td className="px-4 py-5 text-right">
                          <span className="text-[11px] font-bold text-slate-300 group-hover:text-slate-500 transition-colors uppercase tracking-widest">
                            {formatTanggal(ticket.waktuMasuk || new Date())}
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
      </main>

      {/* Footer */}
      <footer className="max-w-[1400px] mx-auto px-6 py-12">
        <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">© {new Date().getFullYear()} IT Development Center • Universitas Metamedia</p>
      </footer>
    </div>
  );
}
