"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  getAllTickets,
  updateTicketStatus,
  claimTicket,
  toggleForcePrivate,
  type TicketRow,
} from "@/app/actions/ticketActions";
import { getTicketStatusColor } from "@/lib/utils";
import StatusTimeline from "@/app/components/StatusTimeline";

// ─── Helpers ────────────────────────────────────────────────
function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getContactLink(contact: string) {
  const clean = contact.trim();
  if (clean.includes("@")) return `mailto:${clean}`;
  let phone = clean.replace(/[^0-9+]/g, "");
  if (phone.startsWith("08")) phone = "628" + phone.slice(2);
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("62")) return `https://wa.me/${phone}`;
  return null;
}

function ReporterAvatar({ name, isGuest }: { name: string, isGuest: boolean }) {
  const initial = name.charAt(0).toUpperCase() || "?";
  const bg = isGuest ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-blue-50 border-blue-200 text-blue-600";
  return (
    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${bg}`}>
      {initial}
    </div>
  );
}

const STATUS_OPTIONS = ["Masuk", "Diproses", "Selesai", "Pending Verifikasi", "Dibatalkan"] as const;

// Status badge — light bg, dark text
function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    "Masuk":              "badge badge-masuk",
    "Diproses":           "badge badge-diproses",
    "Selesai":            "badge badge-selesai",
    "Pending Verifikasi": "badge badge-pending",
    "Dibatalkan":         "badge badge-dibatalkan",
    "Tertunda":           "badge badge-pending",
    "Ditolak":            "badge badge-dibatalkan",
    "Dikonfirmasi":       "badge badge-selesai",
  };
  return <span className={cls[status] ?? "badge badge-default"}>{status}</span>;
}

function PrioritasBadge({ prioritas, className }: { prioritas: string, className?: string }) {
  const cls: Record<string, string> = {
    "Rendah": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Sedang": "bg-blue-50 text-blue-700 border-blue-200",
    "Tinggi": "bg-orange-50 text-orange-700 border-orange-200",
    "Kritis": "bg-rose-50 text-rose-700 border-rose-200",
  };
  const colorClass = cls[prioritas] || cls["Sedang"];
  return <span className={`inline-flex items-center font-bold uppercase tracking-wider border ${className || "px-2.5 py-1 rounded-lg text-[11px]"} ${colorClass}`}>{prioritas}</span>;
}

// ─── Props ───────────────────────────────────────────────────
interface DeptOption { id: string; nama: string; }
interface Props {
  tickets:      TicketRow[];
  departments:  DeptOption[];
  activeQ:      string;
  activeDept:   string;
  activeStatus: string;
  activePrioritas?: string;
  totalAll:     number;
}

// ═══════════════════════════════════════════════════════════
// FILTER BAR subcomponent
// ═══════════════════════════════════════════════════════════
function FilterBar({ departments, activeQ, activeDept, activeStatus, activePrioritas }: Omit<Props, "tickets" | "totalAll">) {
  const router      = useRouter();
  const pathname    = usePathname();
  const params      = useSearchParams();
  const [,startT]   = useTransition();

  const [localQ, setLocalQ] = useState(activeQ);

  const push = useCallback((key: string, val: string) => {
    const sp = new URLSearchParams(params.toString());
    if (val) sp.set(key, val);
    else sp.delete(key);
    // Reset to page 1 on any filter change
    startT(() => { router.push(`${pathname}?${sp.toString()}`, { scroll: false }); });
  }, [params, pathname, router]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    push("q", localQ);
  }

  const hasFilters = !!(activeQ || activeDept || activeStatus || activePrioritas);

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full"
    >
      {/* ── Search bar ── */}
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-slate-400"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
          </svg>
        </div>
        <input
          id="filter-search-q"
          type="text"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="Ketik ID Pengajuan atau NIM..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 placeholder:text-slate-400"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
        {/* ── Filter Departemen ── */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-campus-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" /></svg>
          </div>
          <select
            id="filter-dept"
            value={activeDept}
            onChange={(e) => push("dept", e.target.value)}
            className="w-full sm:w-[210px] pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 appearance-none cursor-pointer font-medium"
          >
            <option value="">Semua Departemen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.nama}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* ── Filter Status ── */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-campus-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <select
            id="filter-status"
            value={activeStatus}
            onChange={(e) => push("status", e.target.value)}
            className="w-full sm:w-[190px] pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 appearance-none cursor-pointer font-medium"
          >
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* ── Filter Prioritas ── */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-campus-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" /></svg>
          </div>
          <select
            id="filter-prioritas"
            value={activePrioritas || ""}
            onChange={(e) => push("prioritas", e.target.value)}
            className="w-full sm:w-[180px] pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 appearance-none cursor-pointer font-medium"
          >
            <option value="">Semua Prioritas</option>
            {["Rendah", "Sedang", "Tinggi", "Kritis"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ── Tombol Search ── */}
          <button id="btn-apply-filter" type="submit" className="flex items-center justify-center gap-2 bg-campus-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md shrink-0 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" /></svg>
            Terapkan
          </button>

          {/* ── Reset ── */}
          {hasFilters && (
            <button
              id="btn-reset-filter"
              type="button"
              onClick={() => {
                setLocalQ("");
                startT(() => { router.push(pathname, { scroll: false }); });
              }}
              className="flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shrink-0 border border-rose-200 cursor-pointer"
              title="Reset Filter"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MonitoringClient({
  tickets, departments, activeQ, activeDept, activeStatus, activePrioritas, totalAll,
}: Props) {
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const hasActiveFilter = !!(activeQ || activeDept || activeStatus || activePrioritas);

  const handleToggleForcePrivate = async (id: string) => {
    startTransition(async () => {
      const res = await toggleForcePrivate(id);
      if (res.success) {
        // Optimistic UI update or just rely on state if we had one
        // For simplicity, we can reload or update the selectedTicket if it's open
        if (selectedTicket && selectedTicket._id === id) {
          setSelectedTicket({ ...selectedTicket, isForcePrivate: res.isForcePrivate as boolean });
        }
      } else {
        alert(res.error);
      }
    });
  };

  const closeModal = () => setSelectedTicket(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-campus-primary/10 text-campus-primary rounded-xl shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V8.25H8.25m0 0h.008v.008H8.25V8.25z" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Pantauan Semua Tiket</h1>
            <p className="text-xs sm:text-sm text-slate-500">Daftar lengkap seluruh tiket dari semua departemen (Read-Only).</p>
          </div>
        </div>
        {/* Counter */}
        <div className="flex items-center">
          <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <div className="text-xs sm:text-sm font-medium">
              <span className="text-slate-900 text-base">{tickets.length}</span>
              {hasActiveFilter && <span className="text-slate-400"> / {totalAll}</span>}
              <span className="text-slate-500 ml-1">Tiket</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Filter Section */}
        <div className="p-4 sm:p-5 lg:p-6 bg-slate-50/50 border-b border-slate-200">
          <FilterBar
            departments={departments}
            activeQ={activeQ}
            activeDept={activeDept}
            activeStatus={activeStatus}
            activePrioritas={activePrioritas}
          />
        </div>

        {/* Tabel Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pelapor & Layanan</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Departemen</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Waktu Masuk</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Prioritas</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-16 h-16 mx-auto bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <p className="text-slate-600 font-medium text-sm">
                        {hasActiveFilter ? "Tidak ada pengajuan yang ditemukan." : "Belum ada pengajuan."}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {hasActiveFilter ? "Coba sesuaikan kata kunci atau filter pencarian Anda." : "Data pengajuan akan muncul di sini."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4 min-w-[300px]">
                      <div className="flex items-center gap-3">
                        <ReporterAvatar name={ticket.isGuest ? (ticket.guestName || "T") : (ticket.mahasiswaNama || "M")} isGuest={!!ticket.isGuest} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-900 truncate group-hover:text-campus-primary transition-colors leading-snug">
                            {ticket.namaLayanan || ticket.departmentId}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
                              {ticket.ticketId || (ticket.isGuest ? "GUEST-ID" : ticket.mahasiswaId)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest border shadow-sm ${ticket.isGuest ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                              {ticket.isGuest ? "Tamu" : "Mahasiswa"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-campus-primary transition-colors"></div>
                        <span className="text-xs font-semibold text-slate-600">
                          {ticket.departmentName || ticket.departmentId || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-700">{formatTanggal(ticket.waktuMasuk).split(', ')[0]}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{formatTanggal(ticket.waktuMasuk).split(', ')[1]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <PrioritasBadge prioritas={ticket.prioritas || "Sedang"} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center cursor-default px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getTicketStatusColor(ticket.statusTerkini)}`}>
                          {ticket.statusTerkini}
                        </span>
                        {(ticket as any).isForcePrivate && (
                          <span className="px-2 py-0.5 inline-flex text-[9px] font-bold uppercase tracking-wider rounded bg-rose-50 text-rose-600 border border-rose-200">
                            🌑 Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════ MODAL DETAIL ═══════════════ */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-campus-primary/10 flex items-center justify-center border border-campus-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-campus-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Detail Laporan</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 tracking-widest bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                    {selectedTicket.ticketId || selectedTicket._id}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer"
                aria-label="Tutup modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col lg:flex-row overflow-hidden border-b border-slate-200 flex-1 min-h-0 bg-slate-50/50">

              {/* KOLOM KIRI: Info + Dynamic Data */}
              <div className="w-full lg:w-[50%] bg-white p-6 sm:p-8 overflow-y-auto border-r border-slate-200 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-10">
                <div className="space-y-6">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold shadow-sm uppercase tracking-wider">
                      {selectedTicket.namaLayanan || selectedTicket.departmentId}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-sm uppercase tracking-wider">
                      {selectedTicket.departmentName || selectedTicket.departmentId || "Umum"}
                    </span>
                    <PrioritasBadge prioritas={selectedTicket.prioritas || "Sedang"} className="px-3 py-1.5 rounded-lg text-xs shadow-sm" />
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-sm ${getTicketStatusColor(selectedTicket.statusTerkini)}`}>
                      {selectedTicket.statusTerkini}
                    </span>
                  </div>

                  {/* Force Private Override */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Visibilitas Publik</h4>
                        <p className="text-[10px] text-slate-500">Paksa sembunyikan tiket ini dari Papan Transparansi.</p>
                      </div>
                      <button
                        onClick={() => handleToggleForcePrivate(selectedTicket._id)}
                        disabled={isPending}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          (selectedTicket as any).isForcePrivate ? 'bg-rose-500' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            (selectedTicket as any).isForcePrivate ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    {(selectedTicket as any).isForcePrivate && (
                       <div className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-100/50 border border-rose-200 rounded-lg text-[10px] text-rose-700 font-bold">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                         </svg>
                         TIDAK AKAN MUNCUL DI PAPAN PUBLIK
                       </div>
                    )}
                  </div>

                  {/* formSnapshot × dynamicData */}
                  {selectedTicket.formSnapshot && selectedTicket.formSnapshot.length > 0 ? (
                    <div className="pt-5 border-t border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Data Isian Form
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTicket.formSnapshot.map((field: any) => {
                          const value = selectedTicket.dynamicData?.[field.id];
                          const isFile = field.type === "file";
                          const isImage = isFile && typeof value === "string" && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(value);

                          if (value === undefined || value === null || value === "") return null;

                          return (
                            <div key={field.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl group/field transition-all hover:border-slate-300">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                {field.label}
                              </label>
                              {isImage ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-inner group/img">
                                  <img 
                                    src={String(value)} 
                                    alt={field.label} 
                                    className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover/img:scale-110"
                                    onClick={() => setLightboxUrl(String(value))}
                                  />
                                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                                    </svg>
                                  </div>
                                </div>
                              ) : isFile ? (
                                <a 
                                  href={String(value)} 
                                  target="_blank" 
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-campus-primary font-semibold hover:bg-slate-50 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                  </svg>
                                  Lihat Lampiran
                                </a>
                              ) : (
                                <p className="text-sm font-semibold text-slate-800 break-words">{String(value)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* KOLOM KANAN: Timeline */}
              <div className="w-full lg:w-[50%] p-6 sm:p-8 overflow-y-auto">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Riwayat Tracking
                  </h4>
                  <StatusTimeline history={selectedTicket.statusHistory} compact={true} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 sm:px-8 bg-slate-50 border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Halaman bersifat Read-Only untuk audit.</span>
              </div>
              <button
                onClick={closeModal}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-sm text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== IMAGE LIGHTBOX ========== */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
             <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={lightboxUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
