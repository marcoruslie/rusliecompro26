"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function InvoiceQrSeal({
  invoiceNumber,
  transactionId,
}: {
  invoiceNumber: string;
  /** When the transaction is saved, the QR links straight to its page. */
  transactionId?: string | null;
}) {
  // Build the absolute URL on the client so the QR is scannable as a link.
  // Falls back to the invoice number text for an unsaved draft (no id yet).
  const [value, setValue] = useState(invoiceNumber || "INV");

  useEffect(() => {
    if (transactionId) {
      // Public, customer-facing invoice page (gated by last 4 phone digits).
      setValue(`${window.location.origin}/invoice/${transactionId}`);
    } else {
      setValue(invoiceNumber || "INV");
    }
  }, [transactionId, invoiceNumber]);

  return (
    <div className="flex flex-col items-center gap-1 max-w-[128px]">
      <QRCodeSVG value={value} size={72} level="M" />
      <p
        className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-center leading-tight"
        style={{ color: "#021d47" }}
      >
        Tanda Tangan Digital
      </p>
      <p className="text-[0.55rem] text-gray-500 text-center leading-snug">
        {transactionId ? (
          <>
            Seluruh dokumen <span className="font-semibold">Ruslie Spring</span> telah
            tergabung dalam satu jaringan terverifikasi. Pindai untuk memverifikasi keaslian.
          </>
        ) : (
          <>
            Dokumen <span className="font-semibold">Ruslie Spring</span> — satu jaringan
            terverifikasi. Simpan faktur untuk mengaktifkan tanda tangan digital.
          </>
        )}
      </p>
    </div>
  );
}
