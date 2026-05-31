import PublicInvoiceClient from "@/components/PublicInvoiceClient";

export const metadata = { title: "Faktur — Ruslie Spring" };

export default function PublicInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  return <PublicInvoiceClient id={params.id} />;
}
