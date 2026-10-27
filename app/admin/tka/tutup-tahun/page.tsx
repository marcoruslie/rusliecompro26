import { requireTkaAdmin } from "@/lib/tka/auth";
import TutupTahunClient from "@/components/tka/TutupTahunClient";

export const metadata = { title: "Tutup Tahun — TKA" };

export default async function TkaTutupTahunPage() {
  await requireTkaAdmin();
  return <TutupTahunClient />;
}
