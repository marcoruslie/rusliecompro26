import { requireTkaAdmin } from "@/lib/tka/auth";
import GiroClient from "@/components/tka/GiroClient";

export const metadata = { title: "Pencairan Cek/Giro — TKA" };

export default async function TkaGiroPage() {
  await requireTkaAdmin();
  return <GiroClient />;
}
