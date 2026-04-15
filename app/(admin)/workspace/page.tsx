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
    <div className="min-h-screen bg-bg-page">
      {/* ── Top Nav ── */}
      <header className="bg-campus-dark border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-none">Portal Layanan Terpadu</p>
            <p className="text-white/50 text-[10px]">Ruang Kerja Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/70 text-xs">
              {session.role === "admin_departemen" ? "Admin Departemen" : session.role}
            </span>
          </div>
          <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center">
            <span className="text-[10px] font-bold text-campus-dark">
              {session.nama?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-white text-xs font-medium">{session.nama}</span>
          <a href="/" className="ml-1 text-white/40 hover:text-red-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </a>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ruang Kerja Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Selamat datang, <span className="text-campus-primary font-semibold">{session.nama}</span>
            {" "}— <span className="text-slate-600">{session.departmentId || "Departemen"}</span>
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Pengajuan Masuk",    val: totalMasuk,        color: "text-amber-700",   bg: "bg-amber-50",  border: "border-l-amber-500" },
            { label: "Sedang Diproses",    val: totalDiproses,     color: "text-campus-primary", bg: "bg-blue-50", border: "border-l-campus-primary" },
            { label: "Selesai",            val: totalSelesai,      color: "text-green-700",   bg: "bg-green-50",  border: "border-l-green-500" },
            { label: "Pending Verifikasi", val: pendingVerifikasi, color: "text-purple-700",  bg: "bg-purple-50", border: "border-l-purple-500" },
          ].map(({ label, val, color, bg, border }) => (
            <div key={label} className={`card-light p-5 border-l-4 ${border}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Daftar Pengajuan Masuk</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {tickets.length} pengajuan
            </span>
          </div>
          <WorkspaceTable tickets={tickets} adminNama={session.nama} adminNimNip={session.nim_nip} />
        </div>
      </div>
    </div>
  );
}

