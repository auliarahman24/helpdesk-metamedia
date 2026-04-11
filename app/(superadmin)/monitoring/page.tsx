export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Department from "@/models/Department";
import { getAllTickets } from "@/app/actions/ticketActions";
import MonitoringClient from "./MonitoringClient";

async function getSession() {
  const cookieStore = await cookies();
  const sc = cookieStore.get("user_session");
  if (!sc) return null;
  try { return JSON.parse(sc.value) as { role: string; nama: string }; }
  catch { return null; }
}

interface SearchParams {
  q?: string;
  dept?: string;
  status?: string;
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const params = await searchParams;
  const q      = (params.q      || "").trim();
  const dept   = (params.dept   || "");
  const status = (params.status || "");

  // Ambil semua tiket dari DB (query sudah di ticketActions)
  let tickets = await getAllTickets();

  // ── Filter client-side (data sudah di memory — max beberapa ratus tiket) ──
  if (q) {
    const ql = q.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.ticketId.toLowerCase().includes(ql) ||
        t.mahasiswaId.toLowerCase().includes(ql)
    );
  }
  if (dept)   tickets = tickets.filter((t) => t.departmentId === dept);
  if (status) tickets = tickets.filter((t) => t.statusTerkini === status);

  // Departemen untuk dropdown filter (dari Master Data)
  await dbConnect();
  const departments = await Department.find({})
    .select("departmentId namaDepartemen")
    .sort({ namaDepartemen: 1 })
    .lean();

  const deptOptions = departments.map((d) => ({
    id:   d.departmentId,
    nama: d.namaDepartemen,
  }));

  return (
    <MonitoringClient
      tickets={tickets}
      departments={deptOptions}
      activeQ={q}
      activeDept={dept}
      activeStatus={status}
      totalAll={tickets.length}
    />
  );
}
