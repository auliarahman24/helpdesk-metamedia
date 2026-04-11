"use client";

import { useState, useTransition } from "react";
import { updateTicketStatus, type TicketRow } from "@/app/actions/ticketActions";

// ─── Badge status (light mode readable) ─────────────────────
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

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface WorkspaceTableProps { tickets: TicketRow[]; adminNama: string; }

export default function WorkspaceTable({ tickets: initialTickets, adminNama }: WorkspaceTableProps) {
  const [tickets, setTickets]           = useState<TicketRow[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [statusBaru, setStatusBaru]     = useState("Diproses");
  const [catatan, setCatatan]           = useState("");
  const [isPending, startTransition]    = useTransition();
  const [result, setResult]             = useState<{ type: "success" | "error"; message: string } | null>(null);

  function openModal(ticket: TicketRow) {
    setSelectedTicket(ticket);
    setStatusBaru(ticket.statusTerkini);
    setCatatan("");
    setResult(null);
  }
  function closeModal() { setSelectedTicket(null); setResult(null); }

  function handleUpdate() {
    if (!selectedTicket) return;
    startTransition(async () => {
      const res = await updateTicketStatus(selectedTicket._id, statusBaru, catatan, adminNama);
      if (res.error) {
        setResult({ type: "error", message: res.error });
      } else {
        setResult({ type: "success", message: res.message || "Status berhasil diperbarui!" });
        setTickets((prev) =>
          prev.map((t) =>
            t._id === selectedTicket._id
              ? { ...t, statusTerkini: statusBaru, statusHistory: [...t.statusHistory, { status: statusBaru, timestamp: new Date().toISOString(), actor: adminNama, note: catatan }] }
              : t
          )
        );
        setTimeout(() => closeModal(), 1500);
      }
    });
  }

  const isLocked      = selectedTicket?.statusTerkini === "Selesai" || selectedTicket?.statusTerkini === "Dikonfirmasi";
  const isProgressOnly = selectedTicket ? statusBaru === selectedTicket.statusTerkini : false;
  const isNoteRequired = isProgressOnly || statusBaru === "Tertunda";
  const isUpdateDisabled = isPending || (isNoteRequired && !catatan.trim());
  const btnText        = isProgressOnly ? "Tambah Catatan Progres" : "Ubah Status Pengajuan";

  return (
    <>
      {/* ═══════ TABEL ═══════ */}
      {tickets.length === 0 ? (
        <div className="card-light p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
          </svg>
          <p className="text-slate-500 text-sm">Belum ada pengajuan masuk untuk departemen ini.</p>
        </div>
      ) : (
        <div className="card-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-light">
              <thead>
                <tr>
                  <th>Pengajuan</th>
                  <th>Kategori Layanan</th>
                  <th>Waktu Masuk</th>
                  <th>Status</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td>
                      <p className="text-slate-900 font-semibold truncate max-w-[220px]">
                        {ticket.namaLayanan || ticket.departmentId}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5 font-mono">
                        {ticket.ticketId || ticket._id.slice(-8).toUpperCase()}
                      </p>
                    </td>
                    <td className="text-slate-700">
                      {ticket.namaLayanan || ticket.departmentId}
                    </td>
                    <td className="text-slate-500 text-xs whitespace-nowrap">
                      {formatTanggal(ticket.waktuMasuk)}
                    </td>
                    <td>
                      <StatusBadge status={ticket.statusTerkini} />
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => openModal(ticket)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-campus-primary/10 hover:bg-campus-primary/20 text-campus-primary text-xs font-semibold rounded-lg border border-campus-primary/20 transition-all duration-150 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Proses
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ MODAL PROSES ═══════ */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-border-light rounded-2xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Detail & Proses Pengajuan</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {selectedTicket.ticketId || selectedTicket._id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* §1 Detail Laporan */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-campus-primary/10 flex items-center justify-center text-[10px] text-campus-primary font-bold">1</span>
                  Detail Pengajuan
                </h3>
                <div className="card-light p-4 space-y-3">
                  <div>
                    <p className="text-slate-900 font-semibold">{selectedTicket.namaLayanan || selectedTicket.departmentId}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono tracking-wider">{selectedTicket.ticketId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "NIM Pelapor",   val: selectedTicket.mahasiswaId },
                      { label: "Status Saat Ini", val: <StatusBadge status={selectedTicket.statusTerkini} /> },
                      { label: "Waktu Masuk",   val: formatTanggal(selectedTicket.waktuMasuk) },
                      { label: "Departemen",    val: selectedTicket.departmentId || "—" },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">{label}</span>
                        <span className="text-slate-800 font-medium mt-0.5 block">{val as string}</span>
                      </div>
                    ))}
                  </div>

                  {/* formSnapshot × dynamicData */}
                  {selectedTicket.formSnapshot?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Informasi Tambahan</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTicket.formSnapshot.map((field) => {
                          const value = selectedTicket.dynamicData?.[field.id];
                          if (value === undefined || value === null || value === "") return null;
                          return (
                            <div key={field.id} className={`bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 text-xs ${field.type === "file" ? "col-span-2" : ""}`}>
                              <span className="text-slate-500 block">{field.label}</span>
                              {field.type === "file" && typeof value === "string" ? (
                                value.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={value} alt={field.label} className="mt-1.5 max-w-[200px] rounded-lg border border-slate-200 object-cover" />
                                  : <a href={value} target="_blank" rel="noopener noreferrer" className="text-campus-primary underline">Lihat File →</a>
                              ) : (
                                <span className="text-slate-800 font-medium">{String(value)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* §2 Riwayat Status */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-campus-primary/10 flex items-center justify-center text-[10px] text-campus-primary font-bold">2</span>
                  Riwayat Status
                  <span className="text-xs text-slate-400 font-normal">({selectedTicket.statusHistory.length} entri)</span>
                </h3>
                <div className="card-light p-4 space-y-0">
                  {selectedTicket.statusHistory.map((h, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${idx === selectedTicket.statusHistory.length - 1 ? "bg-campus-primary ring-2 ring-campus-primary/30" : "bg-slate-300"}`} />
                        {idx < selectedTicket.statusHistory.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className={`pb-4 ${idx === selectedTicket.statusHistory.length - 1 ? "pb-0" : ""}`}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={h.status} />
                          <span className="text-[10px] text-slate-400">{formatTanggal(h.timestamp)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">oleh <span className="text-slate-700 font-medium">{h.actor}</span></p>
                        {h.note && <p className="text-xs text-slate-500 mt-0.5 italic">"{h.note}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* §3 Update Status */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-campus-primary/10 flex items-center justify-center text-[10px] text-campus-primary font-bold">3</span>
                  Perbarui Status
                </h3>

                {isLocked ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm font-medium text-blue-800 text-center">
                      Tindakan Terkunci — Pengajuan ini telah ditandai Selesai dan menunggu konfirmasi dari pelapor.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="statusBaru" className="block text-sm font-medium text-slate-700">
                        Status Baru <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="statusBaru"
                        value={statusBaru}
                        onChange={(e) => setStatusBaru(e.target.value)}
                        className="input-light appearance-none cursor-pointer"
                      >
                        <option value="Masuk" className="hidden">Masuk</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Tertunda">Tertunda</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Ditolak">Ditolak</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="catatan" className="block text-sm font-medium text-slate-700">
                        Catatan Teknisi {isNoteRequired && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        id="catatan"
                        rows={3}
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Berikan catatan terkait tindakan yang dilakukan..."
                        className="input-light resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {result && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${result.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  {result.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light shrink-0 bg-slate-50/50">
              <button onClick={closeModal} className="btn-secondary">
                {isLocked ? "Tutup" : "Batal"}
              </button>
              {!isLocked && (
                <button
                  id="btn-update-status"
                  onClick={handleUpdate}
                  disabled={isUpdateDisabled}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memperbarui...
                    </span>
                  ) : btnText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
