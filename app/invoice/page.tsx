import type { Metadata } from "next";
import InvoiceClient from "@/components/InvoiceClient";

export const metadata: Metadata = {
  title: "Invoice Generator — Ruslie Spring",
  description: "Create and print professional invoices for Ruslie Spring.",
};

export default function InvoicePage() {
  return <InvoiceClient />;
}
