import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyTickets } from "@/app/actions/ticketActions";

function formatTanggal(date: Date) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

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

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sc = cookieStore.get("user_session");
  if (!sc) redirect("/");

  let session: { nim_nip: string; role: string; nama: string };
  try { session = JSON.parse(sc.value); }
  catch { redirect("/"); }

  // ── Server Action: menjalankan applyAutoCloseSLA() + fetch tiket ──
  const tickets = await getMyTickets();

  // Statistik
  const total    = tickets.length;
  const diproses = tickets.filter((t) => t.status === "Diproses").length;
  const selesai  = tickets.filter((t) => t.status === "Selesai").length;

  return (
    <div className="min-h-screen bg-bg-page">
      {/* ── Top Nav Bar Mahasiswa ── */}
      <header className="bg-campus-dark border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-none">Portal Layanan Terpadu</p>
            <p className="text-white/50 text-[10px]">Universitas Metamedia</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1">
            {[
              { label: "Portal Saya", href: "/dashboard" },
              { label: "Buat Pengajuan", href: "/pengajuan" },
              { label: "Lacak Pengajuan", href: "/tracking" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="px-3 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-all">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 pl-4 border-l border-white/20">
            <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center">
              <span className="text-[10px] font-bold text-campus-dark">
                {session.nama?.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white text-xs font-medium">{session.nama}</p>
            <a href="/" className="ml-1 text-white/40 hover:text-red-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Portal Mahasiswa
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Selamat datang, <span className="text-campus-primary font-semibold">{session.nama}</span>
            </p>
          </div>
          <Link
            href="/pengajuan"
            className="btn-primary shadow-md shadow-campus-primary/20 self-start"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Buat Pengajuan Baru
          </Link>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Pengajuan", val: total,    color: "text-campus-primary", bg: "bg-campus-primary/8" },
            { label: "Sedang Diproses", val: diproses, color: "text-blue-600",        bg: "bg-blue-50" },
            { label: "Selesai",         val: selesai,  color: "text-green-700",       bg: "bg-green-50" },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="card-light p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* ── Pengajuan Saya — Card Grid ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Pengajuan Saya
            </h2>
            <span className="text-xs text-slate-400">{tickets.length} pengajuan</span>
          </div>

          {tickets.length === 0 ? (
            <div className="card-light p-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-slate-500 text-sm">Belum ada pengajuan. Klik "Buat Pengajuan Baru" untuk memulai.</p>
            </div>
          ) : (
            /* CARD GRID 3 kolom */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map((ticket) => {
                return (
                  <Link
                    key={ticket._id}
                    href={`/tracking/${ticket._id}`}
                    className="ticket-card group"
                  >
                    {/* Status badge top */}
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={ticket.status} />
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-300 group-hover:text-campus-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>

                    {/* Nama layanan */}
                    <h3 className="text-slate-900 font-semibold text-sm leading-snug truncate group-hover:text-campus-primary transition-colors">
                      {ticket.namaLayanan || ticket.departmentId || "Layanan"}
                    </h3>

                    {/* Ticket ID */}
                    <p className="text-slate-400 text-[11px] font-mono mt-1">{ticket.ticketId}</p>

                    {/* Divider */}
                    <div className="my-3 border-t border-slate-100" />

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{ticket.departmentId}</span>
                      <span>{formatTanggal(new Date(ticket.waktuMasuk))}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
