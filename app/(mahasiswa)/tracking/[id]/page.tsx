import { notFound } from "next/navigation";
import { getTicketById } from "@/app/actions/ticketActions";
import TrackingClient from "./TrackingClient";

// ============================================================
// Page Component (Server Component)
// ============================================================
export default async function TrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicketById(id);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">

      <TrackingClient ticket={ticket} />
    </div>
  );
}
