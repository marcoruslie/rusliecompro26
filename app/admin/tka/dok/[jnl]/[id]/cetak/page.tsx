import { notFound } from "next/navigation";
import { requireTkaAdmin } from "@/lib/tka/auth";
import { DOC_BY_JNL } from "@/lib/tka/docs";
import DocPrintClient from "@/components/tka/DocPrintClient";

export const metadata = { title: "Cetak — TKA" };

export default async function TkaDocPrintPage({
  params,
  searchParams,
}: {
  params: { jnl: string; id: string };
  searchParams: { v?: string };
}) {
  if (!DOC_BY_JNL[params.jnl] || !/^\d+$/.test(params.id)) notFound();
  await requireTkaAdmin();
  return <DocPrintClient jnl={params.jnl} id={params.id} variant={searchParams.v} />;
}
