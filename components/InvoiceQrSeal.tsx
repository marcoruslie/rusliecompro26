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
    <div className="flex flex-col items-center gap-1.5">
      <QRCodeSVG value={value} size={72} level="M" />
      <p className="text-[0.6rem] text-gray-500 text-center leading-tight max-w-[120px]">
        {transactionId ? (
          <>Scan untuk buka faktur</>
        ) : (
          <>
            Faktur sah dari <span className="font-semibold">Ruslie Spring</span>
          </>
        )}
      </p>
    </div>
  );
}
