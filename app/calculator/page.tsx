import type { Metadata } from "next";
import CalculatorClient from "@/components/CalculatorClient";

export const metadata: Metadata = {
  title: "Spring Price Calculator — Ruslie Spring",
  description:
    "Calculate estimated spring weight and material price based on wire diameter, inner diameter, length, and coil specifications.",
};

export default function CalculatorPage() {
  return <CalculatorClient />;
}
