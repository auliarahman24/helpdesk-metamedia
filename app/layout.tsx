import type { Metadata } from "next";
import { Merriweather, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// ── Merriweather: untuk H1, H2 — kesan wibawa akademik ──────
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-merriweather",
  display: "swap",
});

// ── Plus Jakarta Sans: untuk body, nav, button ───────────────
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Layanan Terpadu | Universitas Metamedia",
  description:
    "Sistem pelaporan dan pengajuan layanan kampus secara digital — Universitas Metamedia.",
  keywords: ["portal layanan", "universitas metamedia", "pengajuan", "laporan kampus"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${merriweather.variable} ${jakarta.variable}`}>
      <body className="bg-campus-dark font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
