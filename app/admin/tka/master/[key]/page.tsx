import { notFound } from "next/navigation";
import { requireTkaAdmin } from "@/lib/tka/auth";
import { MASTER_BY_KEY } from "@/lib/tka/masters";
import MasterClient from "@/components/tka/MasterClient";

export function generateMetadata({ params }: { params: { key: string } }) {
  return { title: `${MASTER_BY_KEY[params.key]?.title ?? "Master"} — TKA` };
}

export default async function TkaMasterPage({ params }: { params: { key: string } }) {
  if (!MASTER_BY_KEY[params.key]) notFound();
  await requireTkaAdmin();
  return <MasterClient key={params.key} masterKey={params.key} />;
}
