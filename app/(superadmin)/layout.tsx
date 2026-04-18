"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Dasbor Global",
    href: "/sa-dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Pantauan Pengajuan",
    href: "/monitoring",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    label: "Manajemen Pengguna",
    href: "/users",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Master Departemen",
    href: "/departments",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    label: "Master Layanan",
    href: "/services",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.658 3.286a.75.75 0 01-1.087-.835l1.478-6.335-4.916-4.267a.75.75 0 01.425-1.303l6.484-.56 2.533-5.982a.75.75 0 011.342 0l2.533 5.982 6.484.56a.75.75 0 01.425 1.303l-4.916 4.267 1.478 6.335a.75.75 0 01-1.087.835L12 15.17z" />
      </svg>
    ),
  },
];

function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-campus-primary/5 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[80px]" />
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      {/* ═══════ SIDEBAR — Brand Navy ═══════ */}
      <aside className="sidebar">

        {/* Logo / Branding */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center shadow-lg shadow-brand-blue/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">Portal Layanan</p>
              <p className="text-slate-500 text-[10px]">Universitas Metamedia</p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/15 border border-brand-blue/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
            Super Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <span className={isActive ? "text-blue-400" : "text-slate-500"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Divider + Footer */}
        <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
          {/* Logout link */}
          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Keluar
          </a>
          {/* User info */}
          <div className="flex items-center gap-2.5 px-3">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/20 flex items-center justify-center">
              <span className="text-xs text-blue-400 font-bold">SA</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">Super Admin</p>
              <p className="text-[10px] text-slate-500">NIP: 999999</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════ CONTENT AREA — Light ═══════ */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative selection:bg-campus-primary/10">
        <MeshGradient />
        {children}
      </main>
    </div>
  );
}
