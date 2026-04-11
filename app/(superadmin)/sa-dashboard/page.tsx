export const dynamic = "force-dynamic";

export default function SADashboardPage() {
  const stats = [
    {
      label: "Total Pengajuan Masuk",
      value: "1.284",
      delta: "+12,5% bulan ini",
      up: true,
      color: "text-campus-primary",
      iconBg: "bg-blue-50",
      iconColor: "text-campus-primary",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      ),
    },
    {
      label: "Pengajuan Diselesaikan",
      value: "1.102",
      delta: "+8,2% bulan ini",
      up: true,
      color: "text-green-700",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Rata-rata Penyelesaian",
      value: "4,2 Jam",
      delta: "1,1 jam lebih cepat",
      up: false,
      color: "text-purple-700",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const recentActivity = [
    { id: "TKT-260411-0012", layanan: "Perbaikan AC Kelas", dept: "DEPT-SARPRAS", status: "Diproses", waktu: "10 menit lalu" },
    { id: "TKT-260411-0011", layanan: "Reset Password SIAKAD", dept: "DEPT-TI",      status: "Selesai",  waktu: "25 menit lalu" },
    { id: "TKT-260410-0044", layanan: "Peminjaman Proyektor", dept: "DEPT-SARPRAS", status: "Masuk",    waktu: "1 jam lalu" },
    { id: "TKT-260410-0043", layanan: "Kebersihan Toilet Lt.3", dept: "DEPT-KEBERSIHAN", status: "Selesai", waktu: "2 jam lalu" },
    { id: "TKT-260410-0042", layanan: "Konsultasi Keuangan", dept: "DEPT-KEUANGAN", status: "Pending Verifikasi", waktu: "3 jam lalu" },
  ];

  const statusBadge: Record<string, string> = {
    "Masuk":              "badge badge-masuk",
    "Diproses":           "badge badge-diproses",
    "Selesai":            "badge badge-selesai",
    "Pending Verifikasi": "badge badge-pending",
    "Dibatalkan":         "badge badge-dibatalkan",
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dasbor Global</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan performa Portal Layanan Terpadu Universitas Metamedia</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          Data Statis (Demo)
        </span>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="card-light p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                <span className={s.iconColor}>{s.icon}</span>
              </div>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${s.up ? "text-green-600" : "text-blue-600"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                {s.up
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                }
              </svg>
              {s.delta}
            </p>
          </div>
        ))}
      </div>

      {/* ── Aktivitas Terbaru ── */}
      <div className="card-light overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Aktivitas Terbaru</h2>
          <a href="/monitoring" className="text-xs text-campus-primary hover:underline font-medium">
            Lihat semua →
          </a>
        </div>
        <table className="table-light">
          <thead>
            <tr>
              <th>ID Pengajuan</th>
              <th>Layanan</th>
              <th>Departemen</th>
              <th className="text-center">Status</th>
              <th className="text-right">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {recentActivity.map((row) => (
              <tr key={row.id}>
                <td><span className="font-mono text-xs text-slate-600">{row.id}</span></td>
                <td className="text-slate-800 font-medium">{row.layanan}</td>
                <td><span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{row.dept}</span></td>
                <td className="text-center"><span className={statusBadge[row.status] ?? "badge badge-default"}>{row.status}</span></td>
                <td className="text-right text-xs text-slate-400">{row.waktu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Placeholder Chart ── */}
      <div className="card-light p-8 flex flex-col items-center justify-center h-52 border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-slate-400 text-sm font-medium">Grafik Tren Pengajuan</p>
        <p className="text-xs text-slate-300 mt-1">Visualisasi data akan ditampilkan di sini</p>
      </div>
    </div>
  );
}
