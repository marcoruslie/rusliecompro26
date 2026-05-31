import { QRCodeSVG } from "qrcode.react";

export default function InvoiceQrSeal({
  invoiceNumber,
}: {
  invoiceNumber: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <QRCodeSVG value={invoiceNumber || "INV"} size={72} level="M" />
      <p className="text-[0.6rem] text-gray-500 text-center leading-tight max-w-[120px]">
        Faktur sah dari <span className="font-semibold">Ruslie Spring</span>
      </p>
    </div>
  );
}
