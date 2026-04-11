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

// ─── Props ───────────────────────────────────────────────────
interface DeptOption { id: string; nama: string; }
interface Props {
  tickets:      TicketRow[];
  departments:  DeptOption[];
  activeQ:      string;
  activeDept:   string;
  activeStatus: string;
  totalAll:     number;
}

// ═══════════════════════════════════════════════════════════
// FILTER BAR subcomponent
// ═══════════════════════════════════════════════════════════
function FilterBar({ departments, activeQ, activeDept, activeStatus }: Omit<Props, "tickets" | "totalAll">) {
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

  const hasFilters = !!(activeQ || activeDept || activeStatus);

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
    >
      {/* ── Search bar ── */}
      <div className="relative flex-1 min-w-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
        </svg>
        <input
          id="filter-search-q"
          type="text"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="Cari ID Pengajuan atau NIM pelapor..."
          className="input-light pl-10"
        />
      </div>

      {/* ── Filter Departemen ── */}
      <select
        id="filter-dept"
        value={activeDept}
        onChange={(e) => push("dept", e.target.value)}
        className="input-light appearance-none cursor-pointer min-w-[180px]"
      >
        <option value="">Semua Departemen</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.nama}</option>
        ))}
      </select>

      {/* ── Filter Status ── */}
      <select
        id="filter-status"
        value={activeStatus}
        onChange={(e) => push("status", e.target.value)}
        className="input-light appearance-none cursor-pointer min-w-[170px]"
      >
        <option value="">Semua Status</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* ── Tombol Search ── */}
      <button id="btn-apply-filter" type="submit" className="btn-primary shrink-0">
        Cari
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
          className="btn-secondary shrink-0"
        >
          Reset
        </button>
      )}
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MonitoringClient({
  tickets, departments, activeQ, activeDept, activeStatus, totalAll,
}: Props) {
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const closeModal = () => setSelectedTicket(null);

  const hasActiveFilter = !!(activeQ || activeDept || activeStatus);

  return (
    <div className="p-6 sm:p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pantauan Semua Tiket</h1>
          <p className="text-sm text-slate-500">Daftar lengkap seluruh tiket dari semua departemen (Read-Only).</p>
        </div>
        {/* Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500">
            <span className="text-slate-900 font-semibold">{tickets.length}</span>
            {hasActiveFilter && <span className="text-slate-400"> / {totalAll}</span>}
            <span> tiket</span>
            {hasActiveFilter && <span className="text-slate-400"> (difilter)</span>}
          </span>
        </div>
      </div>

      {/* ═══════════════ FILTER BAR ═══════════════ */}
      <div className="card-light p-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Filter & Pencarian
        </p>
        <FilterBar
          departments={departments}
          activeQ={activeQ}
          activeDept={activeDept}
          activeStatus={activeStatus}
        />
      </div>

      {/* ═══════════════ TABEL ═══════════════ */}
      <div className="card-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-light">
            <thead>
              <tr>
                <th>ID Pengajuan</th>
                <th>Layanan</th>
                <th>Departemen</th>
                <th>Waktu Masuk</th>
                <th className="text-center">Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                    </svg>
                    <p className="text-slate-400 text-sm">
                      {hasActiveFilter ? "Tidak ada pengajuan yang cocok dengan filter." : "Belum ada pengajuan terdaftar di sistem."}
                    </p>
                    {hasActiveFilter && <p className="text-slate-300 text-xs mt-1">Coba ubah atau hapus filter pencarian.</p>}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td>
                      <span className="text-slate-700 font-mono text-xs tracking-wider">
                        {ticket.ticketId || ticket._id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <p className="text-slate-900 font-semibold truncate max-w-[200px]">
                        {ticket.namaLayanan || ticket.departmentId}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">NIM: {ticket.mahasiswaId}</p>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
                        {ticket.departmentId || "—"}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs whitespace-nowrap">
                      {formatTanggal(ticket.waktuMasuk)}
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getTicketStatusColor(ticket.statusTerkini)}`}>
                        {ticket.statusTerkini}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-campus-primary/10 hover:bg-campus-primary/20 text-campus-primary text-xs font-semibold rounded-lg border border-campus-primary/20 transition-all duration-150 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Lihat Detail
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 sm:px-8 sm:py-5 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Detail Laporan</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 tracking-widest">
                    {selectedTicket.ticketId || selectedTicket._id}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col lg:flex-row overflow-hidden border-b border-white/[0.06] flex-1 min-h-0">

              {/* KOLOM KIRI: Info + Dynamic Data */}
              <div className="w-full lg:w-[45%] bg-white/[0.02] p-6 sm:p-8 overflow-y-auto border-r border-white/[0.06]">
                <div className="space-y-6">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                      {selectedTicket.namaLayanan || selectedTicket.departmentId}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/[0.05] text-slate-300 border border-white/[0.08] text-xs">
                      {selectedTicket.departmentId || "Umum"}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getTicketStatusColor(selectedTicket.statusTerkini)}`}>
                      {selectedTicket.statusTerkini}
                    </span>
                  </div>

                  {/* Nama Layanan + Ticket ID */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {selectedTicket.namaLayanan || selectedTicket.departmentId}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 tracking-widest">{selectedTicket.ticketId}</p>
                  </div>

                  {/* Info pelapor */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">NIM / Pelapor</p>
                      <p className="text-white font-semibold font-mono">{selectedTicket.mahasiswaId}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Waktu Masuk</p>
                      <p className="text-white font-medium">{formatTanggal(selectedTicket.waktuMasuk)}</p>
                    </div>
                  </div>

                  {/* formSnapshot × dynamicData */}
                  {selectedTicket.formSnapshot && selectedTicket.formSnapshot.length > 0 ? (
                    <div className="pt-4 border-t border-white/[0.06] space-y-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                        Detail Laporan
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedTicket.formSnapshot.map((field) => {
                          const value = selectedTicket.dynamicData?.[field.id];
                          if (value === undefined || value === null || value === "") return null;
                          return (
                            <div key={field.id} className={`bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 ${field.type === "file" ? "col-span-2" : ""}`}>
                              <p className="text-[10px] text-slate-500 capitalize mb-1">{field.label}</p>
                              {field.type === "file" && typeof value === "string" ? (
                                value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={value} alt={field.label} className="mt-1 max-w-[200px] rounded-lg border border-white/[0.08] object-cover" />
                                ) : (
                                  <a href={value} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300 text-sm">
                                    Lihat File →
                                  </a>
                                )
                              ) : (
                                <p className="text-sm font-medium text-white truncate">{String(value)}</p>
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
              <div className="w-full lg:w-[55%] bg-slate-950 p-6 sm:p-8 overflow-y-auto">
                <div className="space-y-5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Riwayat Tracking
                  </h4>
                  <div className="relative pl-2">
                    {selectedTicket.statusHistory.map((entry, index) => {
                      const config = statusConfig(entry.status);
                      const isLast = index === selectedTicket.statusHistory.length - 1;
                      return (
                        <div key={index} className="relative flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full ${config.color} ring-4 ${config.ring} shadow-sm`}>
                              {config.icon}
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 min-h-[32px] bg-gradient-to-b from-white/[0.12] to-white/[0.04] my-1" />}
                          </div>
                          <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                            <div className={`rounded-xl p-3.5 border ${isLast ? "bg-white/[0.03] border-white/[0.08]" : "border-transparent"}`}>
                              <p className="text-[10px] text-slate-500 mb-1">{formatWaktu(entry.timestamp)}</p>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-bold text-white">{entry.status}</h3>
                                {isLast && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 text-[9px] font-medium uppercase tracking-wide">Terkini</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mb-2">
                                <span className="text-slate-500">Oleh:</span>{" "}
                                <span className="text-slate-300 font-medium">{entry.actor}</span>
                              </p>
                              {entry.note && (
                                <div className="flex items-start gap-2 bg-black/20 border border-white/[0.04] rounded-lg p-2.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                  </svg>
                                  <p className="text-[11px] text-slate-400 italic leading-relaxed">{entry.note}</p>
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
            <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2 text-xs text-amber-500/70">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Halaman ini bersifat <strong>Read-Only</strong> untuk keperluan audit.</span>
              </div>
              <button
                onClick={closeModal}
                className="px-5 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
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
