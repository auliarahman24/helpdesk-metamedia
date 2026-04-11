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
    <div className="p-6 sm:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola data pengguna dan hak akses sistem. Total: <strong>{users.length}</strong> pengguna.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleImportCsv} disabled={isPending} className="btn-secondary disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => { setEditUser(null); setFormData({ nim_nip: "", nama: "", role: "mahasiswa", password: "" }); setResultMsg(null); setIsModalOpen(true); }}
            className="btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Pengguna
          </button>
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className="card-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-light">
            <thead>
              <tr>
                <th>#</th>
                <th>NIM / NIP</th>
                <th>Nama Lengkap</th>
                <th>Role</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada pengguna di database.
                  </td>
                </tr>
              )}
              {users.map((user, idx) => (
                <tr key={user._id ?? user.nim_nip}>
                  <td className="text-slate-400 text-xs font-mono">{String(idx + 1).padStart(2, "0")}</td>
                  <td><span className="font-mono text-sm font-semibold text-slate-800">{user.nim_nip}</span></td>
                  <td className="text-slate-700 font-medium">{user.nama}</td>
                  <td><span className={roleBadge(user.role)}>{roleLabel[user.role] ?? user.role}</span></td>
                  <td className="text-right">
                    <button
                      onClick={() => openEditModal(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-campus-primary/10 hover:bg-campus-primary/20 text-campus-primary text-xs font-semibold rounded-lg border border-campus-primary/20 transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      Edit
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-border-light rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h2 className="text-lg font-bold text-slate-900">{editUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                {resultMsg && (
                  <div className={`p-3 rounded-lg text-sm border ${resultMsg.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                    {resultMsg.text}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">NIM / NIP</label>
                  <input
                    type="text" value={formData.nim_nip}
                    onChange={e => setFormData({ ...formData, nim_nip: e.target.value })}
                    disabled={!!editUser} placeholder="Masukkan NIM atau NIP"
                    className={`input-light ${editUser ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Nama Lengkap</label>
                  <input type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} required placeholder="Masukkan nama lengkap" className="input-light" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-light appearance-none cursor-pointer">
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="admin_departemen">Admin Departemen</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                {editUser && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <label className="block text-sm font-semibold text-slate-700">
                      Reset Kata Sandi <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Biarkan kosong jika tidak direset" className="input-light" />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-border-light space-y-3">
                {!editUser && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    Kata sandi default: <strong className="font-bold ml-1">metamedia2026</strong>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Batal</button>
                  <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
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
