"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createDepartment, updateDepartment, softDeleteDepartment, DepartmentRow } from "@/app/actions/departmentActions";

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

  const handleDelete = (dept: DepartmentRow) => {
    if (window.confirm("Hapus departemen ini? Riwayat tiket lama tidak akan terpengaruh.")) {
      startTransition(async () => {
        const res = await softDeleteDepartment(dept.departmentId);
        if (!res.success) {
          alert(res.error || "Gagal menghapus departemen.");
        }
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-campus-primary/10 text-campus-primary rounded-xl shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Master Departemen</h1>
            <p className="text-xs sm:text-sm text-slate-500">Kelola master data departemen untuk referensi layanan dan tiket.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between sm:justify-start gap-3 shadow-inner mr-0 sm:mr-3">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-slate-900">{initialDepartments.length}</span>
          </div>
          <button
            onClick={() => {
              setEditModeId(null);
              reset({ departmentId: "", namaDepartemen: "" });
              setResultMsg(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Departemen
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Departemen</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl Dibuat</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {initialDepartments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-16 h-16 mx-auto bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                        </svg>
                      </div>
                      <p className="text-slate-600 font-medium text-sm">Belum ada data departemen.</p>
                      <p className="text-slate-400 text-xs mt-1">Silakan tambahkan departemen pertama Anda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                initialDepartments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-bold tracking-widest border border-slate-200/60">
                        {dept.departmentId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-campus-primary transition-colors">
                        {dept.namaDepartemen}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 font-medium">{formatTanggal(dept.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(dept)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all duration-200 cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 shadow-sm transition-all duration-200 cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Hapus
                        </button>
                      </div>
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isPending && setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-campus-primary/10 flex items-center justify-center border border-campus-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-campus-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editModeId ? "Edit Departemen" : "Tambah Departemen"}
                </h2>
              </div>
              <button
                onClick={() => !isPending && setIsModalOpen(false)}
                disabled={isPending}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    ID Departemen
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
                    className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 font-semibold shadow-sm placeholder:font-normal placeholder:text-slate-400 font-mono tracking-wider uppercase ${editModeId ? "opacity-75 cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
                  />
                  {errors.departmentId && <p className="text-xs text-rose-500 font-medium mt-1">{errors.departmentId.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nama Departemen
                  </label>
                  <input
                    {...register("namaDepartemen", { required: "Nama Departemen wajib diisi" })}
                    type="text"
                    placeholder="Contoh: Biro Administrasi Akademik"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-campus-primary/10 focus:border-campus-primary outline-none text-sm transition-all text-slate-800 font-semibold shadow-sm placeholder:font-normal placeholder:text-slate-400"
                  />
                  {errors.namaDepartemen && <p className="text-xs text-rose-500 font-medium mt-1">{errors.namaDepartemen.message}</p>}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center min-w-[140px] px-5 py-2.5 bg-campus-primary hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
