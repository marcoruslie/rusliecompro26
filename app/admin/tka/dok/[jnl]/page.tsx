import { notFound } from "next/navigation";
import { requireTkaAdmin } from "@/lib/tka/auth";
import { DOC_BY_JNL } from "@/lib/tka/docs";
import DocListClient from "@/components/tka/DocListClient";

export function generateMetadata({ params }: { params: { jnl: string } }) {
  return { title: `${DOC_BY_JNL[params.jnl]?.title ?? "Dokumen"} — TKA` };
}

export default async function TkaDocListPage({ params }: { params: { jnl: string } }) {
  if (!DOC_BY_JNL[params.jnl]) notFound();
  await requireTkaAdmin();
  return <DocListClient jnl={params.jnl} />;
}
