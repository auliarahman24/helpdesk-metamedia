// ============================================================
// Utilitas Global untuk Desain Komponen
// ============================================================

/**
 * Mengembalikan string class Tailwind CSS untuk styling badge status tiket.
 * Desain mengikuti prinsip Glassmorphism dengan warna spesifik (sesuai ITIL).
 *
 * @param status Status tiket saat ini (contoh: "Masuk", "Diproses")
 * @returns String class CSS gabungan
 */
export function getTicketStatusColor(status: string): string {
  switch (status) {
    case "Masuk":
      // Orange: Urgensi, laporan baru butuh perhatian
      return "bg-orange-50 text-orange-700 border-orange-200 font-bold";
    case "Diproses":
      // Blue: Sedang berjalan, aktif, aman
      return "bg-blue-50 text-blue-700 border-blue-200 font-bold";
    case "Tertunda":
      // Amber: Menunggu tindak lanjut mahasiswa/vendor
      return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
    case "Selesai":
      // Emerald: Sukses ditangani teknisi
      return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
    case "Dikonfirmasi":
      // Indigo: Eksklusif, final, tutup buku
      return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
    case "Ditolak":
    case "Dibatalkan":
      // Rose: Batal/Komplain, lebih elegan dari merah murni
      return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 font-bold";
  }
}
