import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMyTickets } from "@/app/actions/ticketActions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sc = cookieStore.get("user_session");
  if (!sc) redirect("/");

  let session: { nim_nip: string; role: string; nama: string };
  try { 
    session = JSON.parse(sc.value); 
  } catch { 
    redirect("/"); 
  }

  // ── Server Action: menjalankan applyAutoCloseSLA() + fetch tiket ──
  const tickets = await getMyTickets();

  // Konversi dokumen mongoose ke string/POJO agar bisa di-serialize ke Client Component
  const serializedTickets = tickets.map(t => ({
    _id: t._id?.toString() || "",
    ticketId: t.ticketId,
    namaLayanan: t.namaLayanan,
    departmentId: t.departmentId,
    departmentName: (t as any).departmentName,
    status: t.status,
    waktuMasuk: t.waktuMasuk ? new Date(t.waktuMasuk).toISOString() : new Date().toISOString(),
  }));

  return <DashboardClient session={session} tickets={serializedTickets} />;
}
