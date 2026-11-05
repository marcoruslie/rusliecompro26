import { permanentRedirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/seo";

// The marketing site lives under /[locale]; send the bare root to the default.
// Permanent (308), so search engines consolidate "/" onto the default locale.
export default function RootPage() {
  permanentRedirect(`/${DEFAULT_LOCALE}`);
}
