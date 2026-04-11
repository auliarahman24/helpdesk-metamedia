"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createDepartment, updateDepartment, DepartmentRow } from "@/app/actions/departmentActions";

type FormData = {
  departmentId: string;
  namaDepartemen: string;
};

export default function DepartmentsClient({ initialDepartments }: { initialDepartments: DepartmentRow[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModeId, setEditModeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  function formatTanggal(iso: string) {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const onSubmit = (data: FormData) => {
    setResultMsg(null);
    startTransition(async () => {
      if (editModeId) {
        const res = await updateDepartment(editModeId, { namaDepartemen: data.namaDepartemen });
        if (res.success) {
          setIsModalOpen(false);
          setEditModeId(null);
          reset();
        } else {
          setResultMsg({ type: "error", text: res.error || "Gagal memperbarui departemen." });
        }
      } else {
        const res = await createDepartment(data);
        if (res.success) {
          setIsModalOpen(false);
          reset();
        } else {
          setResultMsg({ type: "error", text: res.error || "Gagal menyimpan departemen." });
        }
      }
    });
  };

  const openEditModal = (dept: DepartmentRow) => {
    setEditModeId(dept._id);
    reset({
      departmentId: dept.departmentId,
      namaDepartemen: dept.namaDepartemen,
    });
    setResultMsg(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Master Departemen</h1>
          <p className="text-sm text-slate-400">Kelola master data departemen untuk referensi layanan dan tiket.</p>
        </div>
        <button
          onClick={() => {
            setEditModeId(null);
            reset({ departmentId: "", namaDepartemen: "" });
            setResultMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold rounded-xl
                     shadow-lg shadow-red-500/25 transition-all duration-200
                     hover:from-red-500 hover:to-orange-500 hover:shadow-red-500/30 hover:-translate-y-0.5
                     active:translate-y-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Departemen
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Department ID</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Departemen</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tgl Dibuat</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {initialDepartments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">
                    Belum ada data departemen.
                  </td>
                </tr>
              ) : (
                initialDepartments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="px-6 py-4 text-white font-mono text-xs">{dept.departmentId}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{dept.namaDepartemen}</td>
                    <td className="px-6 py-4 text-slate-400">{formatTanggal(dept.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L5.319 18q.491-1.748 1.13-1.897l10.413-10.413z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Departemen */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">
                {editModeId ? "Edit Departemen" : "Tambah Departemen Baru"}
              </h2>
              <button
                onClick={() => !isPending && setIsModalOpen(false)}
                disabled={isPending}
                className="text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-5">

                {resultMsg && (
                  <div className={`p-3 rounded-lg text-sm border ${resultMsg.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}>
                    {resultMsg.text}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    <span>Department ID</span>
                  </label>
                  <input
                    {...register("departmentId", {
                      required: "Department ID wajib diisi",
                      pattern: {
                        value: /^[A-Z0-9-]+$/,
                        message: "Gunakan huruf kapital, angka, atau strip (-)"
                      }
                    })}
                    type="text"
                    disabled={!!editModeId}
                    placeholder="Contoh: DEPT-BAAK"
                    className={`w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all font-mono text-sm placeholder:text-slate-600 placeholder:font-sans ${editModeId ? 'opacity-60 cursor-not-allowed bg-white/[0.02]' : ''
                      }`}
                  />
                  {errors.departmentId && <p className="text-xs text-red-400">{errors.departmentId.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Nama Departemen</label>
                  <input
                    {...register("namaDepartemen", { required: "Nama Departemen wajib diisi" })}
                    type="text"
                    placeholder="Contoh: Biro Administrasi Akademik"
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all text-sm placeholder:text-slate-600"
                  />
                  {errors.namaDepartemen && <p className="text-xs text-red-400">{errors.namaDepartemen.message}</p>}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:hover:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center min-w-[140px] px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : editModeId ? "Simpan Perubahan" : "Simpan Departemen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
