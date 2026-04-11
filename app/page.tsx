import { getPublicFeed } from "@/app/actions/publicActions";
import LandingClient from "./LandingClient";

export const dynamic = "force-dynamic"; // selalu fresh feed

export default async function HomePage() {
  const feed = await getPublicFeed();

  return <LandingClient feed={feed} />;
}
