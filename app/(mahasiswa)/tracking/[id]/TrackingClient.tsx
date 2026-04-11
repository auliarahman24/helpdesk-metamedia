"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTicket, confirmTicketClosed, reopenTicket, type TicketDetail } from "@/app/actions/ticketActions";
import { getTicketStatusColor } from "@/lib/utils";

// ============================================================
// Helpers
// ============================================================
function formatWaktu(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWaktuShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "Masuk":
      return {
        color: "bg-amber-500",
        ring: "ring-amber-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "Diproses":
      return {
        color: "bg-blue-500",
        ring: "ring-blue-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        ),
      };
    case "Selesai":
      return {
        color: "bg-emerald-500",
        ring: "ring-emerald-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ),
      };
    case "Ditolak":
    case "Dibatalkan": // Styling yang persis sama merah
      return {
        color: "bg-red-500",
        ring: "ring-red-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
    case "Dikonfirmasi":
      return {
        color: "bg-slate-600",
        ring: "ring-slate-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        ),
      };
    default:
      return {
        color: "bg-slate-500",
        ring: "ring-slate-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        ),
      };
  }
}

// ============================================================
// Main Component
// ============================================================
export default function TrackingClient({ ticket }: { ticket: TicketDetail }) {
  const router = useRouter();
  const [isPendingCancel, startCancel] = useTransition();
  const [isPendingConfirm, startConfirm] = useTransition();
  const [isPendingReopen, startReopen] = useTransition();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintNote, setComplaintNote] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Status saat ini diambil dari field status langsung (arsitektur baru)
  const currentStatus = ticket.status || "Tidak diketahui";

  const currentConfig = statusConfig(currentStatus);

  // Render detail laporan dari formSnapshot × dynamicData (Point-in-Time Snapshot)
  const snapshotEntries = (ticket.formSnapshot || []).map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    value: ticket.dynamicData?.[field.id] ?? "",
  })).filter(({ value }) => value !== undefined && value !== null && value !== "");

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const executeCancel = () => {
    setApiError(null);
    startCancel(async () => {
      const res = await cancelTicket(ticket._id);
      if (res.error) {
        setApiError(res.error);
        setShowCancelModal(false);
      } else {
        setShowCancelModal(false);
        router.refresh();
      }
    });
  };

  const handleConfirmSelesai = () => {
    startConfirm(async () => {
      const res = await confirmTicketClosed(ticket._id);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleReopenSubmit = () => {
    if (!complaintNote.trim()) {
      alert("Silakan isi alasan komplain Anda terlebih dahulu.");
      return;
    }
    setApiError(null);
    startReopen(async () => {
      const res = await reopenTicket(ticket._id, complaintNote);
      if (res.error) {
        setApiError(res.error);
      } else {
        setShowComplaintForm(false);
        setComplaintNote("");
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="relative max-w-3xl mx-auto space-y-8">
        {/* ========== BACK LINK ========== */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Kembali ke Dashboard
        </Link>

        {apiError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center justify-between">
            {apiError}
            <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ========== HEADER CARD ========== */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span className="font-mono tracking-widest">
                    {ticket.ticketId || ticket._id}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {ticket.namaLayanan}
                </h1>
                <p className="text-sm text-slate-400">
                  <span className="text-slate-500">Departemen:</span>{" "}
                  <span className="text-white">{ticket.departmentId}</span>
                </p>
              </div>

              {/* Status Badge */}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 ${getTicketStatusColor(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Layanan</p>
                <p className="text-sm text-white font-medium">{ticket.namaLayanan}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Tanggal Dibuat</p>
                <p className="text-sm text-white font-medium">{formatWaktuShort(ticket.createdAt)}</p>
              </div>
            </div>

            {/* Detail Laporan dari formSnapshot × dynamicData */}
            {snapshotEntries.length > 0 && (
              <>
                <hr className="border-white/[0.06]" />
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detail Laporan</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {snapshotEntries.map(({ id, label, type, value }) => (
                      <div key={id} className="flex items-start justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 gap-2">
                        <span className="text-xs text-slate-500 shrink-0">{label}</span>
                        {/* Jika type file: tampilkan sebagai link/preview gambar */}
                        {type === "file" && typeof value === "string" ? (
                          value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={value} alt={label} className="max-w-[120px] rounded-lg border border-white/[0.08] object-cover" />
                          ) : (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 underline hover:text-sky-300 text-right">
                              Lihat File →
                            </a>
                          )
                        ) : (
                          <span className="text-sm text-white font-medium text-right">{String(value)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========== CONDITIONAL CANCEL BUTTON ========== */}
        {currentStatus === "Masuk" && (
          <div className="flex justify-end">
            <button
              onClick={handleCancelClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-semibold text-sm transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Batalkan Laporan
            </button>
          </div>
        )}

        {/* ========== VERTICAL TIMELINE ========== */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Riwayat Status</h2>
              <p className="text-xs text-slate-500">Lacak perkembangan laporan Anda</p>
            </div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 p-6 sm:p-8">
            <div className="relative">
              {ticket.statusHistory.map((entry, index) => {
                const config = statusConfig(entry.status);
                const isFirst = index === 0;
                const isLast = index === ticket.statusHistory.length - 1;

                return (
                  <div key={index} className="relative flex gap-5">
                    {/* Vertical Line + Dot */}
                    <div className="flex flex-col items-center">
                      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.color} ring-4 ${config.ring} shadow-lg`}>
                        {config.icon}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 min-h-[40px] bg-gradient-to-b from-white/[0.12] to-white/[0.04]" />}
                    </div>

                    <div className={`flex-1 pb-8 ${isLast ? "pb-0" : ""}`}>
                      <div className={`rounded-xl p-4 transition-all duration-200 ${isLast ? "bg-white/[0.04] border border-white/[0.08]" : "hover:bg-white/[0.02]"}`}>
                        <p className="text-xs text-slate-500 mb-1">{formatWaktu(entry.timestamp)}</p>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-white">{entry.status}</h3>
                          {isLast && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">Terkini</span>}
                          {isFirst && !isLast && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/15 text-slate-500 border border-slate-500/20">Awal</span>}
                        </div>
                        <p className="text-xs text-slate-400">
                          <span className="text-slate-500">Oleh:</span> <span className="text-slate-300 font-medium">{entry.actor}</span>
                        </p>
                        {entry.note && (
                          <div className="mt-2 flex items-start gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                            <p className="text-xs text-slate-400 italic leading-relaxed">{entry.note}</p>
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

        {/* ========== STUDENT CONFIRMATION ========== */}
        {currentStatus === "Selesai" && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-5">
            <div className="text-center">
              <h3 className="text-emerald-400 font-bold text-lg mb-2">Konfirmasi Penyelesaian</h3>
              <p className="text-slate-300 text-sm">
                Teknisi menandai laporan ini telah selesai dikerjakan. Jika permasalahan Anda sudah teratasi, mohon konfirmasi untuk menutup tiket ini secara permanen. Jika belum, Anda dapat mengajukan komplain.
              </p>
            </div>

            {!showComplaintForm ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowComplaintForm(true)}
                  disabled={isPendingConfirm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-400 rounded-xl font-semibold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Belum Selesai / Komplain
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelesai}
                  disabled={isPendingConfirm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-50"
                >
                  {isPendingConfirm ? "Memproses..." : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Konfirmasi Tiket Selesai
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="mt-4 p-4 sm:p-5 bg-slate-950/50 border border-red-500/20 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="text-red-400 font-semibold text-sm">Formulir Komplain Resolusi</h4>
                <div className="space-y-2">
                  <label htmlFor="complaint" className="text-xs text-slate-400">Deskripsikan mengapa masalah Anda belum selesai:</label>
                  <textarea
                    id="complaint"
                    value={complaintNote}
                    onChange={(e) => setComplaintNote(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Aplikasi masih crash saat saya mengklik tombol simpan..."
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowComplaintForm(false);
                      setComplaintNote("");
                    }}
                    disabled={isPendingReopen}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleReopenSubmit}
                    disabled={isPendingReopen || !complaintNote.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-red-500/25 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isPendingReopen ? "Mengirim..." : "Kirim Komplain"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStatus === "Dikonfirmasi" && (
          <div className="bg-slate-500/10 border border-white/[0.08] rounded-2xl p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-500/20 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">Tiket ini telah ditutup permanen.</p>
          </div>
        )}

      </div>

      {/* ========== CUSTOM MODAL KONFIRMASI PEMBATALAN ========== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPendingCancel && setShowCancelModal(false)}></div>

          {/* Modal Dialog */}
          <div className="relative w-full max-w-md bg-slate-900 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-2">Batalkan Laporan?</h3>
              <p className="text-slate-400 text-sm text-center tracking-wide leading-relaxed mb-8 px-2">
                Tindakan ini tidak dapat dibatalkan. Laporan yang sudah dibatalkan tidak akan diproses oleh teknisi kami. Apakah Anda yakin?
              </p>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => !isPendingCancel && setShowCancelModal(false)}
                  disabled={isPendingCancel}
                  className="flex-1 py-3 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-semibold rounded-xl border border-white/[0.1] transition-all disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  onClick={executeCancel}
                  disabled={isPendingCancel}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  {isPendingCancel ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : "Ya, Batalkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
