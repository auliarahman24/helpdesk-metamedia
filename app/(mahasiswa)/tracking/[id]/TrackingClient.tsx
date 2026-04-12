"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTicket, confirmTicketClosed, reopenTicket, type TicketDetail } from "@/app/actions/ticketActions";
import { getTicketStatusColor } from "@/lib/utils";
import StatusTimeline from "@/app/components/StatusTimeline";

// ============================================================
// Helpers
// ============================================================

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
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-campus-primary transition-colors duration-200"
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
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-medium flex items-center justify-between shadow-sm">
            {apiError}
            <button onClick={() => setApiError(null)} className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ========== HEADER CARD ========== */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-campus-primary"></span>
                  <span className="font-mono tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {ticket.ticketId || ticket._id}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {ticket.namaLayanan}
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Departemen:</span>{" "}
                  <span className="text-slate-700 font-bold">{ticket.departmentId}</span>
                </p>
              </div>

              {/* Status Badge */}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border shadow-sm shrink-0 ${getTicketStatusColor(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Layanan</p>
                <p className="text-sm text-slate-800 font-bold">{ticket.namaLayanan}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Dibuat</p>
                <p className="text-sm text-slate-800 font-bold">{formatWaktuShort(ticket.createdAt)}</p>
              </div>
            </div>

            {/* Detail Laporan dari formSnapshot × dynamicData */}
            {snapshotEntries.length > 0 && (
              <>
                <hr className="border-slate-100" />
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-800 border-l-4 border-campus-primary pl-3">Detail Laporan</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {snapshotEntries.map(({ id, label, type, value }) => (
                      <div key={id} className="flex items-start justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 gap-3 shadow-inner">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mt-0.5">{label}</span>
                        {/* Jika type file: tampilkan sebagai link/preview gambar */}
                        {type === "file" && typeof value === "string" ? (
                          value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={value} alt={label} className="max-w-[120px] rounded-lg border border-slate-200 object-cover shadow-sm bg-white p-1" />
                          ) : (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-campus-primary font-bold underline hover:text-blue-700 text-right">
                              Lihat Dokumen →
                            </a>
                          )
                        ) : (
                          <span className="text-sm text-slate-900 font-bold text-right leading-relaxed">{String(value)}</span>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Batalkan Laporan
            </button>
          </div>
        )}

        {/* ========== VERTICAL TIMELINE ========== */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-campus-primary/10 shadow-sm border border-campus-primary/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-campus-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Riwayat Status</h2>
              <p className="text-xs text-slate-500 font-medium">Lacak perkembangan laporan Anda</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
            <StatusTimeline history={ticket.statusHistory} />
          </div>
        </div>

        {/* ========== STUDENT CONFIRMATION ========== */}
        {currentStatus === "Selesai" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="text-center">
              <h3 className="text-emerald-700 font-bold text-xl mb-2">Konfirmasi Penyelesaian</h3>
              <p className="text-emerald-600/80 text-sm font-medium max-w-xl mx-auto">
                Teknisi menandai laporan ini telah selesai dikerjakan. Jika permasalahan Anda sudah teratasi, mohon konfirmasi untuk menutup tiket ini secara permanen. Jika belum, Anda dapat mengajukan komplain.
              </p>
            </div>

            {!showComplaintForm ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintForm(true)}
                  disabled={isPendingConfirm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Belum Selesai / Komplain
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelesai}
                  disabled={isPendingConfirm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-emerald-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isPendingConfirm ? "Memproses..." : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Konfirmasi Tiket Selesai
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="mt-4 p-5 sm:p-6 bg-white border border-rose-200 rounded-2xl space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="text-rose-600 font-bold text-sm">Formulir Komplain Resolusi</h4>
                <div className="space-y-2">
                  <label htmlFor="complaint" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsikan mengapa masalah Anda belum selesai:</label>
                  <textarea
                    id="complaint"
                    value={complaintNote}
                    onChange={(e) => setComplaintNote(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Aplikasi masih crash saat saya mengklik tombol simpan..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none shadow-inner"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowComplaintForm(false);
                      setComplaintNote("");
                    }}
                    disabled={isPendingReopen}
                    className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 bg-transparent rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleReopenSubmit}
                    disabled={isPendingReopen || !complaintNote.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-rose-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                  >
                    {isPendingReopen ? "Mengirim..." : "Kirim Komplain"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStatus === "Dikonfirmasi" && (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-slate-600 font-bold text-lg">Tiket ini telah ditutup permanen.</p>
          </div>
        )}

      </div>

      {/* ========== CUSTOM MODAL KONFIRMASI PEMBATALAN ========== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isPendingCancel && setShowCancelModal(false)}></div>

          {/* Modal Dialog */}
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-6 border-8 border-rose-50/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-slate-900 text-center mb-3">Batalkan Laporan?</h3>
              <p className="text-slate-500 text-sm text-center tracking-wide leading-relaxed mb-8 px-2 font-medium">
                Tindakan ini tidak dapat dibatalkan. Laporan yang sudah dibatalkan tidak akan diproses oleh teknisi kami. Apakah Anda yakin?
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button
                  onClick={() => !isPendingCancel && setShowCancelModal(false)}
                  disabled={isPendingCancel}
                  className="w-full sm:flex-1 py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  onClick={executeCancel}
                  disabled={isPendingCancel}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
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
