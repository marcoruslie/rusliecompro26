import { notFound } from "next/navigation";
import { requireTkaAdmin } from "@/lib/tka/auth";
import { DOC_BY_JNL } from "@/lib/tka/docs";
import DocFormClient from "@/components/tka/DocFormClient";

export function generateMetadata({ params }: { params: { jnl: string } }) {
  return { title: `${DOC_BY_JNL[params.jnl]?.short ?? "Dokumen"} — TKA` };
}

export default async function TkaDocPage({ params }: { params: { jnl: string; id: string } }) {
  if (!DOC_BY_JNL[params.jnl] || (params.id !== "baru" && !/^\d+$/.test(params.id))) notFound();
  await requireTkaAdmin();
  return <DocFormClient key={params.id} jnl={params.jnl} id={params.id} />;
}
