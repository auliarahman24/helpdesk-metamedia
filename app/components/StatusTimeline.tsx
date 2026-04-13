"use client";

import React from "react";
import { getTicketStatusColor } from "@/lib/utils";

// ============================================================
// Types
// ============================================================
export interface TicketHistoryItem {
  status: string;
  timestamp: string | Date;
  actor: string;
  note?: string;
}

interface StatusTimelineProps {
  history: TicketHistoryItem[];
  compact?: boolean;
}

// ============================================================
// Helpers & Icon Mapping
// ============================================================
function formatWaktu(iso: string | Date) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case "Masuk":
      // Inbox (Warna: Orange/Amber)
      return {
        color: "bg-orange-500",
        ring: "ring-orange-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        ),
      };
    case "Diproses":
      // RefreshCw (Warna: Biru)
      return {
        color: "bg-blue-500",
        ring: "ring-blue-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        ),
      };
    case "Tertunda":
    case "Pending Verifikasi":
      // Clock (Warna: Abu-abu/Slate)
      return {
        color: "bg-slate-500",
        ring: "ring-slate-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        ),
      };
    case "Selesai":
    case "Dikonfirmasi":
      // CheckCircle (Warna: Hijau/Emerald)
      return {
        color: "bg-emerald-500",
        ring: "ring-emerald-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
        ),
      };
    case "Komplain":
      // AlertCircle (Warna: Merah/Rose/Destructive)
      return {
        color: "bg-rose-500",
        ring: "ring-rose-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      };
    case "Ditolak":
    case "Dibatalkan":
      // XCircle (Warna: Merah/Red)
      return {
        color: "bg-red-500",
        ring: "ring-red-500/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ),
      };
    case "Ditutup":
      // Lock (Warna: Abu-abu Gelap/Slate-700)
      return {
        color: "bg-slate-700",
        ring: "ring-slate-700/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      };
    default:
      // Fallback
      return {
        color: "bg-slate-400",
        ring: "ring-slate-400/20",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      };
  }
}

// ============================================================
// Main Component
// ============================================================
export default function StatusTimeline({ history, compact = false }: StatusTimelineProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="relative pl-1 pr-2 pt-2">
      {history.map((entry, index) => {
        const config = getStatusIcon(entry.status);
        const isFirst = index === 0;
        const isLast = index === history.length - 1;

        return (
          <div key={index} className="relative flex gap-4 md:gap-5 group">
            {/* 1. Vertical Line + Circle Dot */}
            <div className="flex flex-col items-center">
              <div 
                className={`relative z-10 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full ${config.color} ring-4 ${config.ring} shadow-md transition-transform duration-200 group-hover:scale-110`}
              >
                {config.icon}
              </div>
              {!isLast && <div className="w-0.5 flex-1 min-h-[40px] bg-slate-200 my-2" />}
            </div>

            {/* 2. Content Body */}
            <div className={`flex-1 ${isLast ? '' : 'pb-8'}`}>
              <div 
                className={`w-full overflow-hidden transition-all duration-200 bg-white border border-slate-200 shadow-sm rounded-2xl ${
                  compact ? 'p-4' : 'p-5'
                } group-hover:shadow-md group-hover:border-slate-300`}
              >
                {/* Waktu */}
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-wide">
                  {formatWaktu(entry.timestamp)}
                </p>
                
                {/* Header/Status */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">{entry.status}</h3>
                  {isLast && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Terkini
                    </span>
                  )}
                  {isFirst && !isLast && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Awal
                    </span>
                  )}
                </div>
                
                {/* Aktor */}
                <p className="text-[11px] sm:text-xs text-slate-500">
                  <span className="text-slate-400 font-medium">Oleh:</span>{" "}
                  <span className="text-slate-700 font-bold">{entry.actor}</span>
                </p>
                
                {/* Keterangan / Note Bubble */}
                {entry.note && (
                  <div className="mt-3.5 flex items-start gap-2.5 bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-200 rounded-xl px-4 py-3 sm:py-3.5 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium italic leading-relaxed">
                      {entry.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
