import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireTkaAdmin } from "@/lib/tka/auth";
import { REPORT_BY_KEY } from "@/lib/tka/reports";
import ReportClient from "@/components/tka/ReportClient";

export function generateMetadata({ params }: { params: { key: string } }) {
  return { title: `${REPORT_BY_KEY[params.key]?.title ?? "Laporan"} — TKA` };
}

export default async function TkaReportPage({ params }: { params: { key: string } }) {
  if (!REPORT_BY_KEY[params.key]) notFound();
  await requireTkaAdmin();
  return (
    <Suspense>
      <ReportClient key={params.key} reportKey={params.key} />
    </Suspense>
  );
}
