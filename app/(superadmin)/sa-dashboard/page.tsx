export const dynamic = "force-dynamic";

import { getTicketStatusColor } from "@/lib/utils";
import { getAllTickets } from "@/app/actions/ticketActions";
import { getSession } from "@/app/actions/authActions";
import { redirect } from "next/navigation";


function PrioritasBadge({ prioritas }: { prioritas: string }) {
  const cls: Record<string, string> = {
    "Rendah": "bg-emerald-50 text-emerald-600 border-emerald-200",
    "Sedang": "bg-blue-50 text-blue-600 border-blue-200",
    "Tinggi": "bg-orange-50 text-orange-600 border-orange-200",
    "Kritis": "bg-red-50 text-red-600 border-red-200",
  };
  const badgeClass = cls[prioritas] || cls["Sedang"];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${badgeClass}`}>{prioritas}</span>;
}

export default async function SADashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    redirect("/");
  }

  // Ambil semua tiket
  const tickets = await getAllTickets();

  // Hitung metrik
  const totalTickets = tickets.length;
  const pendingTickets = tickets.filter(t => t.statusTerkini === 'Masuk' || t.statusTerkini === 'Pending Verifikasi').length;
  const prosesTickets = tickets.filter(t => t.statusTerkini === 'Diproses').length;
  const resolvedTickets = tickets.filter(t => t.statusTerkini === 'Selesai').length;

  // Hitung performa per departemen
  const deptStats: Record<string, { count: number, resolved: number }> = {};
  tickets.forEach(t => {
    const deptId = t.departmentId || "Umum";
    if (!deptStats[deptId]) {
      deptStats[deptId] = { count: 0, resolved: 0 };
    }
    deptStats[deptId].count++;
    if (t.statusTerkini === "Selesai") {
      deptStats[deptId].resolved++;
    }
  });

  const departmentStats = Object.keys(deptStats).map(key => ({
    _id: key,
    count: deptStats[key].count,
    resolved: deptStats[key].resolved
  })).sort((a, b) => b.count - a.count).slice(0, 5); // 5 dept dengan tiket terbanyak

  // Ambil tiket terbaru (max 6)
  const recentTickets = tickets.slice(0, 6);

  return (
    <div className="max-w-[1400px] mx-auto p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dasbor Global</h1>
          <p className="text-sm font-bold text-slate-500 mt-2">
            Pantauan kinerja keseluruhan layanan Universitas Metamedia.
          </p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akses</p>
           <p className="text-sm font-black text-slate-700">Level Super Admin</p>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Total Tiket",      value: totalTickets,     color: "text-slate-800",   bg: "bg-slate-100",  icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
          { label: "Menunggu",         value: pendingTickets,   color: "text-amber-600",   bg: "bg-amber-50",   icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "Dalam Proses",     value: prosesTickets,    color: "text-blue-600",    bg: "bg-blue-50",    icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" },
          { label: "Tiket Selesai",    value: resolvedTickets,  color: "text-emerald-600", bg: "bg-emerald-50", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
               </svg>
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
               <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KOLOM KIRI (Daftar Departemen) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <h2 className="text-lg font-black text-slate-900 tracking-tight mb-5">Performa Departemen</h2>
            <div className="space-y-4">
              {departmentStats.map((dept, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 hover:border-campus-primary/30 transition-colors bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-wide">{dept._id}</p>
                    <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm text-slate-600">{dept.count} Total</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                     <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 uppercase tracking-widest">
                        {dept.resolved} Selesai
                     </span>
                     <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase tracking-widest">
                        {dept.count - dept.resolved} Sisa
                     </span>
                  </div>
                </div>
              ))}
              {departmentStats.length === 0 && (
                 <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                   Belum ada data
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (Aktivitas Terbaru) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 h-full">
            <div className="flex items-center justify-between mb-6">
               <div>
                 <h2 className="text-xl font-black text-slate-900 tracking-tight">Aktivitas Terkini</h2>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Pantauan Laporan Terbaru</p>
               </div>
               <a href="/monitoring" className="text-xs font-black text-campus-primary hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                 Lihat Semua &rarr;
               </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Layanan & No</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Pelapor</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Waktu</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Status & Prioritas</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket, idx) => (
                    <tr key={idx} className="group bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg hover:shadow-slate-200/40 transition-all rounded-2xl">
                      <td className="px-4 py-4 rounded-l-2xl">
                        <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-campus-primary transition-colors max-w-[200px] truncate">
                          {ticket.namaLayanan || ticket.departmentId}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                          {ticket.ticketId || ticket._id.slice(-8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          {ticket.isGuest ? (ticket.guestName || "Tamu") : (ticket.mahasiswaNama || "Mahasiswa")}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest border ${ticket.isGuest ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                            {ticket.isGuest ? "Tamu" : "Siswa"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
                          {new Date(ticket.waktuMasuk).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-4 rounded-r-2xl">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${getTicketStatusColor(ticket.statusTerkini)}`}>
                            {ticket.statusTerkini}
                          </span>
                          <PrioritasBadge prioritas={ticket.prioritas || "Sedang"} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recentTickets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-widest bg-slate-50/50 rounded-2xl">
                        Belum ada aktivitas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
