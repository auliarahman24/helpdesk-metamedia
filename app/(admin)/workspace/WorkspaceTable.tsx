"use client";

import { useState, useTransition } from "react";
import { updateTicketStatus, claimTicket, type TicketRow } from "@/app/actions/ticketActions";
import { getTicketStatusColor } from "@/lib/utils";
import StatusTimeline from "@/app/components/StatusTimeline";

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getContactLink(contact: string) {
  const clean = contact.trim();
  if (clean.includes("@")) return `mailto:${clean}`;
  // Basic WA logic: 08xx or +62xx or 62xx
  let phone = clean.replace(/[^0-9+]/g, "");
  if (phone.startsWith("08")) phone = "628" + phone.slice(2);
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("62")) return `https://wa.me/${phone}`;
  return null;
}

function ReporterAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase() || "?";
  return (
    <div className="w-8 h-8 rounded-full bg-campus-primary/10 border border-campus-primary/20 flex items-center justify-center text-campus-primary font-bold text-xs shrink-0">
      {initial}
    </div>
  );
}

function PrioritasBadge({ prioritas }: { prioritas: string }) {
  const cls: Record<string, string> = {
    "Rendah": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Sedang": "bg-blue-100 text-blue-700 border-blue-200",
    "Tinggi": "bg-orange-100 text-orange-700 border-orange-200",
    "Kritis": "bg-red-100 text-red-700 border-red-200",
  };
  const badgeClass = cls[prioritas] || cls["Sedang"];
  return <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${badgeClass}`}>{prioritas}</span>;
}



function getAvailableNextStatuses(currentStatus: string): string[] {
  if (currentStatus === "Masuk" || currentStatus === "Komplain") {
    return ["Diproses", "Tertunda", "Ditolak"];
  }
  if (currentStatus === "Diproses") {
    return ["Selesai", "Tertunda", "Ditolak"];
  }
  if (currentStatus === "Tertunda") {
    return ["Diproses", "Selesai", "Ditolak"];
  }
  // Default fallback if unknown
  return ["Diproses", "Tertunda", "Selesai", "Ditolak"];
}

interface WorkspaceTableProps { tickets: TicketRow[]; adminNama: string; adminNimNip: string; }

export default function WorkspaceTable({ tickets: initialTickets, adminNama, adminNimNip }: WorkspaceTableProps) {
  const [tickets, setTickets]           = useState<TicketRow[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [statusBaru, setStatusBaru]     = useState("Diproses");
  const [catatan, setCatatan]           = useState("");
  const [isPending, startTransition]    = useTransition();
  const [result, setResult]             = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [claimingId, setClaimingId]     = useState<string | null>(null);

  function openModal(ticket: TicketRow) {
    setSelectedTicket(ticket);
    setStatusBaru(ticket.statusTerkini);
    setCatatan("");
    setResult(null);
  }
  function closeModal() { setSelectedTicket(null); setResult(null); }

  // ── Smart One-Click Manage: Gabungkan Klaim & Buka Modal ──
  function handleManageTicket(ticket: TicketRow) {
    // Jika belum diklaim, klaim dulu secara otomatis
    if (!ticket.assigneeId && ticket.statusTerkini === "Masuk") {
      setClaimingId(ticket._id);
      startTransition(async () => {
        const res = await claimTicket(ticket._id);
        if (res.error) {
          alert(res.error);
        } else {
          // Update state local
          const updatedTicket = { ...ticket, status: "Diproses", statusTerkini: "Diproses", assigneeId: adminNimNip };
          setTickets((prev) => prev.map((t) => t._id === ticket._id ? updatedTicket : t));
          // Langsung buka modal pengerjaan
          openModal(updatedTicket);
        }
        setClaimingId(null);
      });
    } else {
      // Jika sudah diklaim (oleh saya atau orang lain/sudah terpola), langsung buka modal
      openModal(ticket);
    }
  }

  function handleUpdate() {
    if (!selectedTicket) return;
    if (statusBaru === "Ditolak" && !catatan.trim()) {
      setResult({ type: "error", message: "Alasan penolakan wajib diisi!" });
      return;
    }
    startTransition(async () => {
      const res = await updateTicketStatus(selectedTicket._id, statusBaru, catatan, adminNama);
      if (res.error) {
        setResult({ type: "error", message: res.error });
      } else {
        setResult({ type: "success", message: res.message || "Status berhasil diperbarui!" });
        setTickets((prev) =>
          prev.map((t) =>
            t._id === selectedTicket._id
              ? { ...t, status: statusBaru, statusTerkini: statusBaru, statusHistory: [...t.statusHistory, { status: statusBaru, timestamp: new Date().toISOString(), actor: adminNama, note: catatan }] }
              : t
          )
        );
        setTimeout(() => closeModal(), 1500);
      }
    });
  }

  const isLocked       = selectedTicket?.statusTerkini === "Selesai" || selectedTicket?.statusTerkini === "Dikonfirmasi";
  const isTerminal     = ["Ditutup", "Ditolak", "Dibatalkan"].includes(selectedTicket?.statusTerkini || "");
  const isProgressOnly = selectedTicket ? statusBaru === selectedTicket.statusTerkini : false;
  const isNoteRequired = isProgressOnly || statusBaru === "Tertunda" || statusBaru === "Ditolak";
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pengajuan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PELAPOR</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">WAKTU MASUK</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prioritas</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status Saat Ini</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[220px] group-hover:text-campus-primary transition-colors">
                        {ticket.namaLayanan || ticket.departmentId}
                      </p>
                      <p className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-slate-600 font-mono text-[10px] font-bold tracking-wider border border-slate-200 bg-slate-100">
                        {ticket.ticketId || ticket._id.slice(-8).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <ReporterAvatar name={ticket.isGuest ? (ticket.guestName || "T") : (ticket.mahasiswaNama || "M")} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {ticket.isGuest ? (ticket.guestName || "Tamu") : (ticket.mahasiswaNama || "Mahasiswa")}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono italic">
                              {ticket.isGuest ? "Internal Guest" : ticket.mahasiswaId}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest border shadow-sm ${ticket.isGuest ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                              {ticket.isGuest ? "Tamu" : "Mahasiswa"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-600">
                        {formatTanggal(ticket.waktuMasuk)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PrioritasBadge prioritas={ticket.prioritas || "Sedang"} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center cursor-default px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${getTicketStatusColor(ticket.statusTerkini)}`}>
                        {ticket.statusTerkini}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleManageTicket(ticket)}
                        disabled={claimingId === ticket._id || !!(ticket.assigneeId && ticket.assigneeId !== adminNimNip)}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 ${
                           ticket.assigneeId && ticket.assigneeId !== adminNimNip
                           ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                           : "bg-campus-primary hover:bg-blue-700 text-white border-blue-600 hover:shadow-md"
                        }`}
                      >
                        {claimingId === ticket._id ? (
                           <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                           </svg>
                        ) : ticket.assigneeId && ticket.assigneeId !== adminNimNip ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        )}
                        {claimingId === ticket._id ? "Proses..." : ticket.assigneeId && ticket.assigneeId !== adminNimNip ? "Terkunci" : "Kelola Laporan"}
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16" onClick={closeModal}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-2xl max-h-[85vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 shrink-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Detail & Proses Pengajuan</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono text-slate-700 tracking-wider font-semibold">{selectedTicket.ticketId || selectedTicket._id.slice(-8).toUpperCase()}</span>
                </p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* §1 Detail Laporan */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-l-4 border-campus-primary pl-3">
                  Detail Pengajuan
                </h3>
                
                {/* Reporter Profile Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl text-slate-400 font-bold">
                        {(selectedTicket.isGuest ? selectedTicket.guestName : selectedTicket.mahasiswaNama)?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {selectedTicket.isGuest ? (selectedTicket.guestName || "Tamu Tanpa Nama") : (selectedTicket.mahasiswaNama || "Mahasiswa")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${selectedTicket.isGuest ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                            {selectedTicket.isGuest ? "Tamu Publik" : "Mahasiswa"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
                            {selectedTicket.isGuest ? "Internal Tracking ID" : selectedTicket.mahasiswaId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedTicket.isGuest && selectedTicket.guestContact && (
                      <div className="flex items-center gap-2">
                        {getContactLink(selectedTicket.guestContact) && (
                          <a
                            href={getContactLink(selectedTicket.guestContact)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2.5 rounded-xl border transition-all duration-200 shadow-sm ${
                              selectedTicket.guestContact.includes("@")
                                ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                            }`}
                            title={selectedTicket.guestContact.includes("@") ? "Kirim Email" : "Chat WhatsApp"}
                          >
                            {selectedTicket.guestContact.includes("@") ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
                                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.7 69.3 27 106.1 27 122.4 0 222-99.6 222-222 0-59.3-23-115.1-65-157.1zM223.9 446.3c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 365.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 54 81.2 54.1 130.5 0 101.7-82.8 184.6-184.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.6-2.8-23.6-8.7-45-27.7-16.6-14.8-27.8-33.1-31.1-38.6-3.2-5.6-.3-8.5 2.5-11.3 2.5-2.5 5.5-6.5 8.3-9.8 2.8-3.3 3.7-5.6 5.6-9.3s.9-6.9-.5-9.7c-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.7 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                              </svg>
                            )}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Waktu Masuk</p>
                      <p className="text-xs text-slate-700 font-semibold">{formatTanggal(selectedTicket.waktuMasuk)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kontak Pelapor</p>
                      <p className="text-xs text-slate-700 font-semibold truncate">
                        {selectedTicket.isGuest ? (selectedTicket.guestContact || "—") : selectedTicket.mahasiswaId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-slate-900 font-bold text-lg">{selectedTicket.namaLayanan || selectedTicket.departmentId}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider font-semibold px-2 py-0.5 bg-slate-200 inline-block rounded-md">{selectedTicket.ticketId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-200 pt-4">
                    {[
                      { label: "Prioritas",       val: <PrioritasBadge prioritas={selectedTicket.prioritas || "Sedang"} /> },
                      { label: "Status Saat Ini", val: <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getTicketStatusColor(selectedTicket.statusTerkini)}`}>{selectedTicket.statusTerkini}</span> },
                      { label: "Departemen",      val: selectedTicket.departmentId || "—" },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">{label}</span>
                        <div className="text-slate-800 font-bold mt-1 block leading-relaxed">{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* formSnapshot × dynamicData */}
                  {selectedTicket.formSnapshot?.length > 0 && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 pl-1">Informasi Tambahan</p>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedTicket.formSnapshot.map((field) => {
                          const value = selectedTicket.dynamicData?.[field.id];
                          if (value === undefined || value === null || value === "") return null;
                          return (
                            <div key={field.id} className={`bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm text-xs ${field.type === "file" ? "col-span-2" : ""}`}>
                              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">{field.label}</span>
                              {field.type === "file" && typeof value === "string" ? (
                                value.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={value} alt={field.label} className="mt-2 max-w-[200px] rounded-xl border border-slate-200 object-cover shadow-sm" />
                                  : <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-campus-primary/10 text-campus-primary rounded-lg font-bold hover:bg-campus-primary/20 transition-colors">Lihat Dokumen <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg></a>
                              ) : (
                                <span className="text-slate-800 font-bold mt-1 block leading-relaxed">{String(value)}</span>
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
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                  Riwayat Status
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 ml-1">
                    {selectedTicket.statusHistory.length} Entri
                  </span>
                </h3>
                <div className="pt-2">
                  <StatusTimeline history={selectedTicket.statusHistory} compact={true} />
                </div>
              </div>

              {/* §3 Update Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                  Perbarui Status Tiket
                </h3>

                {isLocked ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-600">
                      Tindakan Terkunci — Pengajuan ini telah ditandai Selesai dan menunggu konfirmasi akhir pelapor.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <div className="space-y-1.5">
                      <label htmlFor="statusBaru" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Ubah Ke Status <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="statusBaru"
                          value={statusBaru}
                          onChange={(e) => setStatusBaru(e.target.value)}
                          disabled={isTerminal}
                          className={`w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none transition-all duration-200 appearance-none focus:bg-white focus:border-campus-primary focus:ring-4 focus:ring-campus-primary/10 shadow-sm ${isTerminal ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white cursor-pointer"}`}
                        >
                          <option value={selectedTicket.statusTerkini} className="hidden">{selectedTicket.statusTerkini}</option>
                          {getAvailableNextStatuses(selectedTicket.statusTerkini).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <div className="absolute top-[10px] right-3 flex items-center pointer-events-none text-slate-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="catatan" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Catatan Teknisi {isNoteRequired && <span className="text-rose-500">*</span>}
                      </label>
                      <textarea
                        id="catatan"
                        rows={3}
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        disabled={isTerminal}
                        placeholder="Berikan bukti atau catatan terkait tindakan..."
                        className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 resize-none focus:border-campus-primary focus:ring-4 focus:ring-campus-primary/10 shadow-sm placeholder:text-slate-400 font-medium ${isTerminal ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"}`}
                      />
                    </div>
                    {isTerminal && (
                       <p className="mt-2.5 text-[11px] font-bold text-rose-500 bg-rose-50 p-2.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>
                         Tiket ini telah mencapai status akhir dan tidak dapat diubah lagi.
                       </p>
                    )}
                  </div>
                )}
              </div>

              {result && (
                <div className={`flex items-start gap-2.5 p-4 rounded-xl text-sm font-bold border shadow-sm ${result.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                   {result.type === "error" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  <span>{result.message}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-3xl">
              <button onClick={closeModal} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer">
                {isLocked || isTerminal ? "Tutup" : "Batal"}
              </button>
              {!isLocked && !isTerminal && (
                <button
                  id="btn-update-status"
                  onClick={handleUpdate}
                  disabled={isUpdateDisabled}
                  className="min-w-[160px] inline-flex items-center justify-center px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <span className="inline-flex items-center gap-2">
                       <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Menyimpan...
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
