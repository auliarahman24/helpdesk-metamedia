"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TicketRow } from "@/app/actions/ticketActions";
import { getTicketStatusColor } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────
function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function formatWaktu(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_OPTIONS = ["Masuk", "Diproses", "Selesai", "Pending Verifikasi", "Dibatalkan"] as const;

function statusConfig(status: string) {
  switch (status) {
    case "Masuk":             return { color: "bg-amber-500",   ring: "ring-amber-500/20",   icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
    case "Diproses":          return { color: "bg-blue-500",    ring: "ring-blue-500/20",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> };
    case "Selesai":           return { color: "bg-emerald-500", ring: "ring-emerald-500/20", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> };
    case "Pending Verifikasi":return { color: "bg-purple-500",  ring: "ring-purple-500/20",  icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
    case "Dibatalkan":        return { color: "bg-red-500",     ring: "ring-red-500/20",     icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> };
    default:                  return { color: "bg-slate-500",   ring: "ring-slate-500/20",   icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg> };
  }
}

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

function PrioritasBadge({ prioritas }: { prioritas: string }) {
  const cls: Record<string, string> = {
    "Rendah": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Sedang": "bg-blue-100 text-blue-700 border-blue-200",
    "Tinggi": "bg-orange-100 text-orange-700 border-orange-200",
    "Kritis": "bg-red-100 text-red-700 border-red-200",
  };
  const badgeClass = cls[prioritas] || cls["Sedang"];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>{prioritas}</span>;
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
        <div className="relative">
          <select
            id="filter-dept"
            value={activeDept}
            onChange={(e) => push("dept", e.target.value)}
            className="w-full sm:w-[200px] pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 appearance-none cursor-pointer"
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
        <div className="relative">
          <select
            id="filter-status"
            value={activeStatus}
            onChange={(e) => push("status", e.target.value)}
            className="w-full sm:w-[180px] pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 appearance-none cursor-pointer"
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
        <div className="relative">
          <select
            id="filter-prioritas"
            value={activePrioritas || ""}
            onChange={(e) => push("prioritas", e.target.value)}
            className="w-full sm:w-[150px] pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 appearance-none cursor-pointer"
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
  const closeModal = () => setSelectedTicket(null);

  const hasActiveFilter = !!(activeQ || activeDept || activeStatus || activePrioritas);

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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Pengajuan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Detail Layanan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Departemen</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu Masuk</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Prioritas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-semibold tracking-wider border border-slate-200/60">
                        {ticket.ticketId || ticket._id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 truncate max-w-[250px] group-hover:text-campus-primary transition-colors">
                          {ticket.namaLayanan || ticket.departmentId}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                          <span>{ticket.mahasiswaId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        {ticket.departmentId || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs text-slate-600">
                        <span className="font-medium">{formatTanggal(ticket.waktuMasuk).split(', ')[0] || formatTanggal(ticket.waktuMasuk)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <PrioritasBadge prioritas={ticket.prioritas || "Sedang"} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center cursor-default px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${getTicketStatusColor(ticket.statusTerkini)}`}>
                        {ticket.statusTerkini}
                      </span>
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
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold shadow-sm">
                      {selectedTicket.namaLayanan || selectedTicket.departmentId}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm">
                      {selectedTicket.departmentId || "Umum"}
                    </span>
                    <PrioritasBadge prioritas={selectedTicket.prioritas || "Sedang"} />
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${getTicketStatusColor(selectedTicket.statusTerkini)}`}>
                      {selectedTicket.statusTerkini}
                    </span>
                  </div>

                  {/* Nama Layanan + Ticket ID */}
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      {selectedTicket.namaLayanan || selectedTicket.departmentId}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 tracking-widest">{selectedTicket.ticketId}</p>
                  </div>

                  {/* Info pelapor */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">NIM / Pelapor</p>
                      <p className="text-slate-800 font-bold font-mono text-sm">{selectedTicket.mahasiswaId}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Waktu Masuk</p>
                      <p className="text-slate-800 font-semibold">{formatTanggal(selectedTicket.waktuMasuk)}</p>
                    </div>
                  </div>

                  {/* formSnapshot × dynamicData */}
                  {selectedTicket.formSnapshot && selectedTicket.formSnapshot.length > 0 ? (
                    <div className="pt-5 border-t border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Data Isian Form
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedTicket.formSnapshot.map((field) => {
                          const value = selectedTicket.dynamicData?.[field.id];
                          if (value === undefined || value === null || value === "") return null;
                          return (
                            <div key={field.id} className={`bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm ${field.type === "file" ? "col-span-2" : ""}`}>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{field.label}</p>
                              {field.type === "file" && typeof value === "string" ? (
                                value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={value} alt={field.label} className="mt-2 max-w-[200px] rounded-lg border border-slate-300 shadow-sm object-cover" />
                                ) : (
                                  <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-campus-primary font-semibold underline hover:text-blue-700 text-sm mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Unduh Dokumen
                                  </a>
                                )
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
                  <div className="relative pl-3">
                    {selectedTicket.statusHistory.map((entry, index) => {
                      const config = statusConfig(entry.status);
                      const isLast = index === selectedTicket.statusHistory.length - 1;
                      return (
                        <div key={index} className="relative flex gap-5">
                          <div className="flex flex-col items-center">
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.color} ring-4 ${config.ring} shadow-md`}>
                              {config.icon}
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 min-h-[36px] bg-slate-200 my-1.5 rounded-full" />}
                          </div>
                          <div className={`flex-1 pb-7 ${isLast ? "pb-0" : ""}`}>
                            <div className={`rounded-2xl p-4 transition-all duration-200 ${isLast ? "bg-white border border-slate-200 shadow-md ring-1 ring-slate-100/50" : "bg-transparent border border-transparent hover:bg-white hover:border-slate-100 hover:shadow-sm"}`}>
                              <p className="text-[10px] font-bold text-slate-400 mb-1.5 tracking-wide">{formatWaktu(entry.timestamp)}</p>
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <h3 className="text-sm font-bold text-slate-800">{entry.status}</h3>
                                {isLast && (
                                  <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-campus-primary border border-blue-200 text-[9px] font-black uppercase tracking-widest shadow-sm">Status Saat Ini</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mb-2">
                                <span className="text-slate-400 font-medium">Oleh:</span>{" "}
                                <span className="text-slate-700 font-semibold">{entry.actor}</span>
                              </p>
                              {entry.note && (
                                <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                  </svg>
                                  <p className="text-[12px] text-slate-600 font-medium italic leading-relaxed">{entry.note}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
    </div>
  );
}
