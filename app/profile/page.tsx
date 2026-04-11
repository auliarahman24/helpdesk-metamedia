"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/actions/authActions";

export default function ProfilePage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResultMsg(null);

    if (newPassword !== confirmPassword) {
      setResultMsg({ type: "error", text: "Password baru dan konfirmasi tidak cocok." });
      return;
    }

    if (newPassword.length < 6) {
      setResultMsg({ type: "error", text: "Password minimal 6 karakter." });
      return;
    }

    startTransition(async () => {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setResultMsg({ type: "success", text: res.message || "Password berhasil diubah!" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Simulasikan force relogin
        setTimeout(() => {
          alert("Sandi berhasil diubah. Harap login kembali.");
          // Anda dapat memanggil logout action di sini jika ada,
          // untuk MVP kita redirect saja ke homepage (yang akan minta login)
          router.push("/");
        }, 1500);
      } else {
        setResultMsg({ type: "error", text: res.error || "Gagal mengubah password." });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
      <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Dekorasi Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative">
          <button 
            onClick={() => router.back()}
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Kembali
          </button>

          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
              Ubah Kata Sandi
            </h1>
            <p className="text-sm text-slate-400">
              Ganti kata sandi default Anda untuk menjaga keamanan akun.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {resultMsg && (
              <div className={`p-4 rounded-xl text-sm border flex items-start gap-3 backdrop-blur-md ${
                resultMsg.type === "error" 
                  ? "bg-red-500/10 border-red-500/20 text-red-300"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              }`}>
                <div className="mt-0.5">
                  {resultMsg.type === "error" ? (
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                {resultMsg.text}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password Lama</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-slate-900 border border-white/[0.08] rounded-2xl text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password Baru</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-5 py-3.5 bg-slate-900 border border-white/[0.08] rounded-2xl text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-5 py-3.5 bg-slate-900 border border-white/[0.08] rounded-2xl text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-[52px] bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-2xl
                         shadow-lg shadow-orange-500/25 transition-all duration-300
                         hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-500/40 hover:-translate-y-1
                         active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-4"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </span>
              ) : (
                "Simpan Password Baru"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
