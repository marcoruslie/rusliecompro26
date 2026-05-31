import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listWires, listWireTypes } from "@/lib/wires";
import WiresClient from "@/components/WiresClient";

export const metadata = { title: "Wires — Ruslie Spring Admin" };

export default async function AdminWiresPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const [wires, types] = await Promise.all([
    listWires(supabase),
    listWireTypes(supabase),
  ]);
  return <WiresClient initialWires={wires} initialTypes={types} />;
}
