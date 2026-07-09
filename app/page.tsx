import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/seo";

// The marketing site lives under /[locale]; send the bare root to the default.
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
