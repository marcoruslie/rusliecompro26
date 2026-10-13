import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  tool,
  isStepCount,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { ORG_NAME, ORG_PHONE, ORG_EMAIL, SITE_URL } from "@/lib/seo";
import { translations, type Lang } from "@/lib/translations";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateCompression, materialOf, quoteConstant, type Material } from "@/lib/springQuote";

// OpenAI "Luna". Overridable so the model can be swapped without a code change.
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
const API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;
const openai = createOpenAI({ apiKey: API_KEY });

// Public endpoint — cap what a single request can send to keep cost bounded.
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

const LANG_NAME: Record<Lang, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  zh: "Simplified Chinese",
};

/* ── Wire types from Supabase (cached 10 min; falls back to the seeded pair) ── */
type WireOption = { name: string; material: Material };
let wireCache: { at: number; list: WireOption[] } | null = null;

async function wireTypes(): Promise<WireOption[]> {
  if (wireCache && Date.now() - wireCache.at < 10 * 60_000) return wireCache.list;
  let names = ["BAJA", "SUS304"];
  const supabase = createAdminClient();
  if (supabase) {
    const { data } = await supabase.from("wire_types").select("name").order("name");
    if (data?.length) names = data.map((t) => t.name as string);
  }
  const list = names.flatMap((name) => {
    const material = materialOf(name);
    return material ? [{ name, material }] : [];
  });
  wireCache = { at: Date.now(), list };
  return list;
}

function instructions(lang: Lang, wires: WireOption[]) {
  const products = translations.en.products.items
    .map((p) => `- ${p.name}: ${p.desc}`)
    .join("\n");
  const wireList = wires
    .map((w) => `- ${w.name} (${w.material === "steel" ? "carbon steel" : "stainless steel"})`)
    .join("\n");

  return `You are the website assistant for ${ORG_NAME}, a custom spring manufacturer in Surabaya, Indonesia (${SITE_URL}).
You ONLY answer questions about price and availability of our springs. Politely decline anything else and steer back to price/availability or contact.

Products (all made to order):
${products}

Wire materials we use:
${wireList}

Price estimates:
- Use the estimate_price tool for COMPRESSION springs. Never calculate or invent a price yourself.
- Specs are usually written "wire x OD x length" in mm, e.g. "1.2x10x30" = 1.2 mm wire, 10 mm outer diameter, 30 mm free length.
- If the customer doesn't say the spring type, assume compression. If they don't say the material, ask (or quote both).
- If wire diameter, outer diameter or length is missing, ask for it before quoting.
- Always present the result as an ESTIMATED price per piece, and say the final price (quantity, finishing, lead time) is confirmed via WhatsApp.
- Extension, torsion and wire-form springs: no estimate. Ask for specs/drawing and send them to WhatsApp for a quote.

Availability:
- You have no live stock data. Do not claim an item is in stock or out of stock.
- Springs are produced to order; lead time depends on quantity and the production queue, confirmed with the quote.

Contact for quotes:
- WhatsApp / phone: ${ORG_PHONE} (https://wa.me/${ORG_PHONE.replace(/\D/g, "")})
- Email: ${ORG_EMAIL}

Reply in ${LANG_NAME[lang]} unless the user writes in another language, then match theirs.
Keep replies short (2-5 sentences), friendly, plain text. Format Rupiah like "Rp 1.250".`;
}

const estimatePrice = tool({
  description:
    "Estimate the per-piece price (IDR) of a compression spring using Ruslie Spring's price formula.",
  inputSchema: z.object({
    wireDiameter: z.number().positive().max(30).describe("Wire diameter in mm"),
    outerDiameter: z.number().positive().max(500).describe("Spring outer diameter (OD) in mm"),
    length: z.number().positive().max(2000).describe("Free length in mm"),
    material: z.enum(["steel", "stainless"]).describe("steel = BAJA, stainless = SUS304"),
  }),
  execute: async ({ wireDiameter, outerDiameter, length, material }) => {
    const constant = quoteConstant(material);
    if (!constant) return { ok: false, reason: "Online estimates unavailable; refer to WhatsApp." };
    const est = estimateCompression({ wireDiameter, outerDiameter, length, material, constant });
    if (!est) return { ok: false, reason: "Specs are not a valid compression spring (OD must exceed 2 × wire)." };
    return { ok: true, estimatedPricePerPcsIDR: est.pricePerPcs, material, coils: est.coils };
  },
});

export async function POST(req: Request) {
  if (!API_KEY) {
    return new Response("Assistant is not configured.", { status: 503 });
  }

  const { messages, lang }: { messages: UIMessage[]; lang?: Lang } = await req.json();

  const recent = (messages ?? []).slice(-MAX_MESSAGES);
  const tooLong = recent.some((m) =>
    m.parts.some((p) => p.type === "text" && p.text.length > MAX_CHARS),
  );
  if (recent.length === 0 || tooLong) {
    return new Response("Invalid request.", { status: 400 });
  }

  const result = streamText({
    model: openai(MODEL),
    instructions: instructions(lang && lang in LANG_NAME ? lang : "en", await wireTypes()),
    messages: await convertToModelMessages(recent),
    tools: { estimate_price: estimatePrice },
    stopWhen: isStepCount(4),
    maxOutputTokens: 400,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
