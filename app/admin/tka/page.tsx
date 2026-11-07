import { requireTkaAdmin } from "@/lib/tka/auth";
import TkaDashboardClient from "@/components/tka/TkaDashboardClient";

export const metadata = { title: "Dashboard — TKA" };

export default async function TkaDashboardPage() {
  await requireTkaAdmin();
  return <TkaDashboardClient />;
}
