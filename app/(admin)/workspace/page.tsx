import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTicketsByDepartment } from "@/app/actions/ticketActions";
import WorkspaceTable from "./WorkspaceTable";

// ============================================================
// Helper: baca session dari cookie
// ============================================================
async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");

  if (!sessionCookie) return null;

  try {
    return JSON.parse(sessionCookie.value) as {
      nim_nip: string;
      role: string;
      nama: string;
      departmentId: string;
    };
  } catch {
    return null;
  }
}

// ============================================================
// Server Component: Workspace Admin
// ============================================================
function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-campus-primary/5 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[80px]" />
    </div>
  );
}

export default async function WorkspacePage() {
  const session = await getSession();

  // Redirect ke login jika belum login
  if (!session) {
    redirect("/");
  }

  // Ambil tiket berdasarkan departmentId milik admin yang login
  const tickets = await getTicketsByDepartment(session.departmentId || "");

  // Hitung statistik
  const totalMasuk = tickets.filter(
    (t) => t.statusTerkini === "Masuk"
  ).length;
  const totalDiproses = tickets.filter(
    (t) => t.statusTerkini === "Diproses"
  ).length;
  const totalSelesai = tickets.filter(
    (t) => t.statusTerkini === "Selesai"
  ).length;

  const pendingVerifikasi = tickets.filter((t) => t.statusTerkini === "Pending Verifikasi").length;

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-campus-primary/10">
      <MeshGradient />

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-40 bg-campus-dark backdrop-blur-xl border-b border-white/10 shadow-lg shadow-campus-dark/10">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg text-white font-black text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-lg leading-tight tracking-tight">Portal Layanan Terpadu</p>
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-0.5">Ruang Kerja Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-white/20">
               <div className="flex items-center gap-2 mr-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                 <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">
                   {session.role === "admin_departemen" ? "Admin Dept" : session.role}
                 </span>
               </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-brand-gold/20 border border-yellow-400/50">
                <span className="text-sm font-black text-slate-900">
                  {session.nama?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                 <p className="text-white text-sm font-black">{session.nama}</p>
                 <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{session.departmentId || "DEPT"}</p>
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

      {/* ── Content ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ruang Kerja Departemen</h1>
          <p className="text-sm font-bold text-slate-500 mt-2">
            Kelola pengajuan masuk untuk departemen <span className="text-campus-primary font-black uppercase">{session.departmentId || "Departemen"}</span>
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Pengajuan Masuk",    val: totalMasuk,        color: "text-amber-600",   bg: "bg-amber-50",  iconPath: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
            { label: "Sedang Diproses",    val: totalDiproses,     color: "text-blue-600",    bg: "bg-blue-50",   iconPath: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" },
            { label: "Selesai",            val: totalSelesai,      color: "text-emerald-600", bg: "bg-emerald-50",iconPath: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "Pending Verifikasi", val: pendingVerifikasi, color: "text-purple-600",  bg: "bg-purple-50", iconPath: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map(({ label, val, color, bg, iconPath }) => (
            <div key={label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-5">
              <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center shrink-0`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                 </svg>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                 <p className={`text-3xl font-black mt-1 ${color}`}>{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
               <h2 className="text-xl font-black text-slate-900 tracking-tight">Daftar Pengajuan Masuk</h2>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Trek progres dan riwayat pelaporan departemen</p>
            </div>
            <span className="text-xs text-slate-600 font-black bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 uppercase tracking-widest shadow-sm">
              {tickets.length} Total Pengajuan
            </span>
          </div>
          <WorkspaceTable tickets={tickets} adminNama={session.nama} adminNimNip={session.nim_nip} />
        </div>
      </div>
    </div>
  );
}

