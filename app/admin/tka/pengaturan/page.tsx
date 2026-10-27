import { requireTkaAdmin } from "@/lib/tka/auth";
import SettingClient from "@/components/tka/SettingClient";

export const metadata = { title: "Pengaturan Akun — TKA" };

export default async function TkaSettingPage() {
  await requireTkaAdmin();
  return <SettingClient />;
}
