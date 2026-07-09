import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listWires, listWireTypes } from "@/lib/wires";
import WiresClient from "@/components/WiresClient";

export const metadata = { title: "Wires — Ruslie Spring Admin" };

export default async function AdminWiresPage() {
  const supabase = createClient();
  // Auth check and the data queries don't depend on each other, so fire them
  // together instead of awaiting auth first (removes a request waterfall).
  const [
    {
      data: { user },
    },
    wires,
    types,
  ] = await Promise.all([
    supabase.auth.getUser(),
    listWires(supabase),
    listWireTypes(supabase),
  ]);
  if (!user) redirect("/admin");

  return <WiresClient initialWires={wires} initialTypes={types} />;
}
