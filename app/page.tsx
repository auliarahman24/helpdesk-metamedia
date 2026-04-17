import { getTransparencyTickets, getPublicServices } from "@/app/actions/publicActions";
import LandingClient from "./LandingClient";

export const revalidate = 60; // SSR with auto-refresh every 60s

export default async function HomePage() {
  const [tickets, services] = await Promise.all([
    getTransparencyTickets(),
    getPublicServices()
  ]);

  return <LandingClient initialTickets={tickets} services={services} />;
}
