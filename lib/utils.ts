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
      return "bg-orange-500/15 text-orange-400 border-orange-500/20";
    case "Diproses":
      // Sky: Sedang berjalan, aktif, aman
      return "bg-sky-500/15 text-sky-400 border-sky-500/20";
    case "Tertunda":
      // Amber: Menunggu tindak lanjut mahasiswa/vendor
      return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    case "Selesai":
      // Emerald: Sukses ditangani teknisi
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    case "Dikonfirmasi":
      // Violet: Eksklusif, final, tutup buku
      return "bg-violet-500/15 text-violet-400 border-violet-500/20";
    case "Ditolak":
    case "Dibatalkan":
      // Rose: Batal/Komplain, lebih elegan dari merah murni
      return "bg-rose-500/15 text-rose-400 border-rose-500/20";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/20";
  }
}
