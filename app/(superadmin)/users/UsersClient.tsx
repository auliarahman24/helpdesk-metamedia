"use client";

import { useState, useTransition } from "react";
import { updateUser, importUsersCsvMock } from "@/app/actions/userActions";

export default function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers]         = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser]   = useState<any>(null);
  const [formData, setFormData]   = useState({ nim_nip: "", nama: "", role: "mahasiswa", password: "" });
  const [isPending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openEditModal = (user: any) => {
    setEditUser(user);
    setFormData({ nim_nip: user.nim_nip, nama: user.nama, role: user.role, password: "" });
    setResultMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) { setIsModalOpen(false); return; }
    setResultMsg(null);
    startTransition(async () => {
      const payload: any = { nama: formData.nama, role: formData.role };
      if (formData.password) payload.password = formData.password;
      const res = await updateUser(formData.nim_nip, payload);
      if (res.success) {
        setResultMsg({ type: "success", text: res.message || "Berhasil di-update." });
        setUsers(users.map(u => u.nim_nip === formData.nim_nip ? { ...u, nama: formData.nama, role: formData.role } : u));
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setResultMsg({ type: "error", text: res.error || "Gagal mengupdate pengguna." });
      }
    });
  };

  const handleImportCsv = () => {
    startTransition(async () => {
      const res = await importUsersCsvMock();
      if (res.success) alert(res.message);
    });
  };

  const roleBadge = (role: string) => {
    if (role === "superadmin")       return "badge badge-dibatalkan";
    if (role === "admin_departemen") return "badge badge-pending";
    return "badge badge-diproses";
  };

  const roleLabel: Record<string, string> = {
    superadmin:       "Super Admin",
    admin_departemen: "Admin Departemen",
    mahasiswa:        "Mahasiswa",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-campus-primary/10 text-campus-primary rounded-xl shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna</h1>
            <p className="text-xs sm:text-sm text-slate-500">Kelola pengguna, otorisasi peran, dan kredensial sistem.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between sm:justify-start gap-3 shadow-inner mr-0 sm:mr-3">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Data</span>
            <span className="text-base font-bold text-slate-900">{users.length}</span>
          </div>
          <button onClick={handleImportCsv} disabled={isPending} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl font-semibold text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            Impor CSV
          </button>
          <button
            onClick={() => { setEditUser(null); setFormData({ nim_nip: "", nama: "", role: "mahasiswa", password: "" }); setResultMsg(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Pengguna
          </button>
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-16">#</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Identitas Induk (NIM / NIP)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role Otorisasi</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-16 h-16 mx-auto bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                      </div>
                      <p className="text-slate-600 font-medium text-sm">Tidak ada pengguna terpaut.</p>
                      <p className="text-slate-400 text-xs mt-1">Silakan tambah pengguna baru atau impor CSV.</p>
                    </div>
                  </td>
                </tr>
              )}
              {users.map((user, idx) => (
                <tr key={user._id ?? user.nim_nip} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-4 text-slate-400 text-xs font-mono font-medium">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-bold tracking-widest border border-slate-200/60">
                      {user.nim_nip}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-campus-primary transition-colors">
                      {user.nama}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center pointer-events-none px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border shadow-sm ${roleBadge(user.role)}`}>
                      {roleLabel[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(user)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      Edit Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-campus-primary/10 flex items-center justify-center border border-campus-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-campus-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{editUser ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-6 space-y-5 bg-white">
                {resultMsg && (
                  <div className={`p-4 rounded-xl text-sm font-medium border flex items-start gap-2 shadow-sm ${resultMsg.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                    {resultMsg.type === "error" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    {resultMsg.text}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">NIM / NIP</label>
                  <input
                    type="text" value={formData.nim_nip}
                    onChange={e => setFormData({ ...formData, nim_nip: e.target.value })}
                    disabled={!!editUser} placeholder="Masukkan identitas..."
                    className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 font-semibold shadow-sm placeholder:font-normal placeholder:text-slate-400 ${editUser ? "opacity-75 cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nama Lengkap</label>
                  <input 
                    type="text" value={formData.nama} 
                    onChange={e => setFormData({ ...formData, nama: e.target.value })} 
                    required placeholder="Masukkan nama..." 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 font-semibold shadow-sm placeholder:font-normal placeholder:text-slate-400" 
                  />
                </div>
                
                <div className="relative space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Otorisasi Akses</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({ ...formData, role: e.target.value })} 
                    className="w-full px-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 font-semibold appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="admin_departemen">Admin Departemen</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                  <div className="absolute top-[28px] right-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
                  </div>
                </div>
                
                {editUser && (
                  <div className="space-y-1.5 pt-3 mt-3 border-t border-slate-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      Reset Kata Sandi
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">Opsional</span>
                    </label>
                    <input 
                      type="text" value={formData.password} 
                      onChange={e => setFormData({ ...formData, password: e.target.value })} 
                      placeholder="Biarkan kosong jika tidak mereset..." 
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-400 outline-none text-sm transition-all text-slate-800 font-semibold shadow-sm placeholder:font-normal placeholder:text-slate-400 font-mono" 
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 space-y-4">
                {!editUser && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                      Kata sandi default pengguna baru adalah <strong className="font-bold font-mono text-[13px] bg-blue-100/50 px-1 py-0.5 rounded border border-blue-200/50">metamedia2026</strong>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isPending} className="px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPending ? "Memproses..." : editUser ? "Simpan Perubahan" : "Simpan Pengguna"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
