# Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an EN / ID / 中文 language toggle to the public marketing page so visitors can switch all section copy instantly, with the choice remembered across visits.

**Architecture:** A typed translation dictionary (`lib/i18n.ts`) holds one fully-populated content object per language. A client-side React context (`LanguageProvider`) holds the active language, persists it to `localStorage`, and exposes the active-language content as `tr` plus `lang` / `setLang`. The provider wraps only the marketing stack in `app/page.tsx`; each section component reads `useLanguage()` and renders `tr.*` instead of hardcoded English. A three-pill toggle (`EN · ID · 中文`) lives in `Navbar`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, lucide-react. No test runner exists in this repo — verification is `npm run build`, `npm run lint`, and manual browser checks.

---

## Notes for the implementer

- **No test suite exists.** Do not add one. Each task is verified by `npm run build` (type-checks the typed dictionary) and, where noted, a manual browser check via `npm run dev`.
- **Why a typed structured object instead of `t('dot.key')`:** the content has arrays of objects (features, products, process steps, gallery items). A typed `Content` interface forces every language to provide every field, so a missing translation fails the build instead of silently rendering blank. There is therefore no runtime fallback to write.
- **Do not touch** `app/calculator`, `app/invoice`, `app/admin`, or any component they use. Only the nine marketing components and `app/page.tsx` change.
- **Keep all non-text values exactly as they are:** counter numbers (`20`, `50`, `80`), spec strings (`Ø 0.1 – 50 mm`, `± 0.01`, `mm`), image/video paths, hash links, icon components, animation variants, phone number, email.
- The Indonesian and Chinese strings below are drafts to ship; flag to the user that a native speaker should proofread before launch.
- Commit after every task.

---

## File Structure

- **Create** `lib/i18n.ts` — `Lang` type, `LANGS` list, `Content` interface, `content: Record<Lang, Content>`.
- **Create** `components/LanguageProvider.tsx` — context, provider, `useLanguage()` hook.
- **Modify** `app/page.tsx` — wrap stack in `<LanguageProvider>`.
- **Modify** all nine marketing components to consume `useLanguage()`:
  `Navbar`, `Hero`, `About`, `Process`, `Products`, `Capabilities`, `Gallery`, `Contact`, `Footer`.

---

## Task 1: Translation dictionary (`lib/i18n.ts`)

**Files:**
- Create: `lib/i18n.ts`

- [ ] **Step 1: Create `lib/i18n.ts` with the types and full trilingual content**

Create `lib/i18n.ts` with exactly this content:

```ts
export type Lang = "en" | "id" | "zh";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
  { code: "zh", label: "中文" },
];

export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "rs-lang";

export interface Content {
  nav: {
    links: string[]; // 6 labels: About, Process, Products, Capabilities, Gallery, Contact
    getQuote: string;
  };
  hero: {
    badge: string;
    headline: [string, string, string];
    tagline: string;
    exploreProducts: string;
    seeProcess: string;
    scroll: string;
    stats: string[]; // 3 labels
  };
  about: {
    index: string;
    titleLine1: string;
    titleLine2: string;
    paragraph1: string;
    paragraph2: string;
    stats: string[]; // 3 labels
    features: { title: string; text: string }[]; // 4
  };
  process: {
    index: string;
    stepWord: string;
    steps: { title: string; text: string }[]; // 4
  };
  products: {
    index: string;
    titlePrefix: string;
    titleAccent: string;
    detail: string;
    items: { name: string; desc: string; tag: string }[]; // 6
  };
  capabilities: {
    index: string;
    titlePrefix: string;
    titleAccent: string;
    caps: string[]; // 4 labels
    industriesHeading: string;
    industries: string[]; // 10
  };
  gallery: {
    index: string;
    titlePrefix: string;
    titleAccent: string;
    description: string;
    behindProcess: string;
    productionVideos: string;
    productionCaption: string;
    items: { label: string; tag: string }[]; // 15
    videos: string[]; // 2 labels
  };
  contact: {
    index: string;
    titleLine1: string;
    titleLine2: string;
    paragraph: string;
    placeholders: { name: string; company: string; email: string; message: string };
    requestQuote: string;
    sentTitle: string;
    sentBody: string;
    address: string;
  };
  footer: {
    rights: string;
    tagline: string;
  };
}

const en: Content = {
  nav: {
    links: ["About", "Process", "Products", "Capabilities", "Gallery", "Contact"],
    getQuote: "Get Quote",
  },
  hero: {
    badge: "Precision Spring Manufacturing · ID",
    headline: ["Engineering", "Every", "Coil."],
    tagline:
      "Strengthening industry with Indonesian-made precision springs — engineered to international tolerances, forged and tested under one roof.",
    exploreProducts: "Explore Products",
    seeProcess: "See the Process",
    scroll: "Scroll",
    stats: ["Years Forging Steel", "Springs / Day", "Industries Served"],
  },
  about: {
    index: "Who We Are",
    titleLine1: "Two Decades of",
    titleLine2: "Springmaking Mastery",
    paragraph1:
      "Ruslie Spring has grown from a small local workshop into a trusted Indonesian spring manufacturer. Today we support domestic industry with precision springs engineered to international standards.",
    paragraph2:
      "We serve applications where failure is not an option — automotive, electronics, defense, and heavy engineering — holding the tightest tolerances with zero compromise.",
    stats: ["Years of Excellence", "Springs Daily", "Companies Served"],
    features: [
      {
        title: "Indonesian Manufacturing Excellence",
        text: "High-precision spring manufacturing proudly made in Indonesia, delivering global-standard quality without relying on imports.",
      },
      {
        title: "Proudly Made in Indonesia",
        text: "World-class springs manufactured locally to support national industry and reduce dependence on imported components.",
      },
      {
        title: "Custom Industry Solutions",
        text: "Custom-engineered springs tailored to automotive, machinery, and manufacturing needs across Indonesian industry.",
      },
      {
        title: "Trusted Domestic Quality",
        text: "Every spring is inspected and load-tested to guarantee consistent performance — proof that local products meet world-class standards.",
      },
    ],
  },
  process: {
    index: "How It's Made",
    stepWord: "STEP",
    steps: [
      {
        title: "Raw Wire Selection",
        text: "High-tensile carbon and stainless wire is gauged and fed into the line — the starting point of every spring we make.",
      },
      {
        title: "CNC Precision Coiling",
        text: "Computer-controlled coilers form each spring to an exact pitch, diameter, and free length — repeatable to the micron.",
      },
      {
        title: "Stress-Relief & Heat-Treat",
        text: "Coils are tempered to lock in elasticity and resist permanent set, giving the spring its long working life under load.",
      },
      {
        title: "Load-Test & Quality Control",
        text: "Every batch is load-tested and dimensionally inspected before it ships — proof the tolerance holds in the real world.",
      },
    ],
  },
  products: {
    index: "What We Make",
    titlePrefix: "The",
    titleAccent: "Spring Catalog",
    detail: "Detail",
    items: [
      { name: "Compression Springs", desc: "High-load bearing springs for industrial machinery and automotive systems.", tag: "Push" },
      { name: "Extension Springs", desc: "Precision-engineered for consistent tension in heavy-duty applications.", tag: "Pull" },
      { name: "Torsion Springs", desc: "Custom torque solutions for machinery and manufacturing.", tag: "Torque" },
      { name: "Wire Forms", desc: "Complex custom wire shapes engineered to exact client specifications.", tag: "Custom" },
      { name: "Zigzag Springs", desc: "Durable zigzag springs for furniture seating — long-lasting support and elasticity.", tag: "Seating" },
      { name: "Battery Springs", desc: "Reliable electrical contact for battery compartments and electronic assemblies.", tag: "Contact" },
    ],
  },
  capabilities: {
    index: "Technical Specs",
    titlePrefix: "Manufacturing",
    titleAccent: "Capabilities",
    caps: ["Wire Diameter", "Spring OD", "Free Length", "Tolerance"],
    industriesHeading: "Industries We Serve",
    industries: [
      "Automotive", "Aerospace", "Medical Devices", "Electronics", "Defense",
      "Oil & Gas", "Marine", "Construction", "Agriculture", "Railway",
    ],
  },
  gallery: {
    index: "Our Work",
    titlePrefix: "Spring",
    titleAccent: "Gallery",
    description: "A visual showcase of springs we've engineered across industries and applications.",
    behindProcess: "Behind the Process",
    productionVideos: "Production Videos",
    productionCaption: "Production Process",
    items: [
      { label: "Stainless Steel Compression Spring", tag: "Compression" },
      { label: "Standard Coil Spring — General Use", tag: "Compression" },
      { label: "Steel Tension Spring", tag: "Tension" },
      { label: "Compression Coil Spring", tag: "Compression" },
      { label: "Battery Spring", tag: "Battery Spring" },
      { label: "Battery Spring", tag: "Battery Spring" },
      { label: "Mini Compression Spring — Electronics", tag: "Compression" },
      { label: "Steel Compression Spring", tag: "Compression" },
      { label: "Flat-Ground End Compression Spring", tag: "Compression" },
      { label: "Stainless Steel Wire Forming", tag: "Wire Forming" },
      { label: "Wire Forming Spring", tag: "Wire Forming" },
      { label: "Stainless Steel Torsion Spring", tag: "Compression" },
      { label: "Intercoller Hose Clamp", tag: "Wire Forming" },
      { label: "Stainless Steel Compression Spring", tag: "Compression" },
      { label: "Production Round Wire — Spring Coiling", tag: "Production" },
    ],
    videos: ["Round Wire — Live Production", "Compression Spring — Live Production"],
  },
  contact: {
    index: "Get In Touch",
    titleLine1: "Ready to Engineer",
    titleLine2: "Your Next Spring?",
    paragraph:
      "Send us your drawings, specs, or ideas. Our engineers respond within 24 hours with a detailed quote and technical consultation.",
    placeholders: {
      name: "Your Name",
      company: "Company / Industry",
      email: "Email Address",
      message: "Describe your spring requirements...",
    },
    requestQuote: "Request a Quote",
    sentTitle: "Message Sent",
    sentBody: "Our team will get back to you within 24 hours.",
    address: "Jl. Sikatan 45, Manukan Wetan, Tandes",
  },
  footer: {
    rights: "All rights reserved.",
    tagline: "Precision · Reliability · Innovation",
  },
};

const id: Content = {
  nav: {
    links: ["Tentang", "Proses", "Produk", "Kapabilitas", "Galeri", "Kontak"],
    getQuote: "Minta Penawaran",
  },
  hero: {
    badge: "Manufaktur Per Presisi · ID",
    headline: ["Merekayasa", "Setiap", "Lilitan."],
    tagline:
      "Memperkuat industri dengan per presisi buatan Indonesia — direkayasa dengan toleransi standar internasional, dibuat dan diuji dalam satu atap.",
    exploreProducts: "Lihat Produk",
    seeProcess: "Lihat Prosesnya",
    scroll: "Gulir",
    stats: ["Tahun Menempa Baja", "Per / Hari", "Industri Dilayani"],
  },
  about: {
    index: "Siapa Kami",
    titleLine1: "Dua Dekade",
    titleLine2: "Keahlian Pembuatan Per",
    paragraph1:
      "Ruslie Spring tumbuh dari bengkel kecil lokal menjadi produsen per Indonesia yang terpercaya. Kini kami mendukung industri dalam negeri dengan per presisi berstandar internasional.",
    paragraph2:
      "Kami melayani aplikasi yang tidak menoleransi kegagalan — otomotif, elektronik, pertahanan, dan rekayasa berat — dengan menjaga toleransi paling ketat tanpa kompromi.",
    stats: ["Tahun Keunggulan", "Per per Hari", "Perusahaan Dilayani"],
    features: [
      {
        title: "Keunggulan Manufaktur Indonesia",
        text: "Manufaktur per presisi tinggi yang bangga dibuat di Indonesia, menghadirkan kualitas berstandar global tanpa bergantung pada impor.",
      },
      {
        title: "Bangga Buatan Indonesia",
        text: "Per kelas dunia yang diproduksi secara lokal untuk mendukung industri nasional dan mengurangi ketergantungan pada komponen impor.",
      },
      {
        title: "Solusi Industri Kustom",
        text: "Per yang direkayasa khusus sesuai kebutuhan otomotif, permesinan, dan manufaktur di seluruh industri Indonesia.",
      },
      {
        title: "Kualitas Domestik Terpercaya",
        text: "Setiap per diperiksa dan diuji beban untuk menjamin kinerja yang konsisten — bukti bahwa produk lokal memenuhi standar kelas dunia.",
      },
    ],
  },
  process: {
    index: "Cara Pembuatannya",
    stepWord: "TAHAP",
    steps: [
      {
        title: "Pemilihan Kawat Baku",
        text: "Kawat karbon dan stainless bertegangan tinggi diukur dan dimasukkan ke lini produksi — titik awal setiap per yang kami buat.",
      },
      {
        title: "Penggulungan Presisi CNC",
        text: "Mesin penggulung terkontrol komputer membentuk setiap per dengan pitch, diameter, dan panjang bebas yang presisi — berulang hingga mikron.",
      },
      {
        title: "Pelepasan Tegangan & Perlakuan Panas",
        text: "Lilitan ditempa panas untuk mengunci elastisitas dan menahan set permanen, memberi per umur kerja yang panjang di bawah beban.",
      },
      {
        title: "Uji Beban & Kontrol Kualitas",
        text: "Setiap batch diuji beban dan diperiksa dimensinya sebelum dikirim — bukti toleransi tetap terjaga di dunia nyata.",
      },
    ],
  },
  products: {
    index: "Yang Kami Buat",
    titlePrefix: "Katalog",
    titleAccent: "Per Kami",
    detail: "Detail",
    items: [
      { name: "Per Kompresi", desc: "Per penahan beban tinggi untuk mesin industri dan sistem otomotif.", tag: "Tekan" },
      { name: "Per Tarik", desc: "Direkayasa presisi untuk tegangan yang konsisten pada aplikasi berat.", tag: "Tarik" },
      { name: "Per Torsi", desc: "Solusi torsi kustom untuk permesinan dan manufaktur.", tag: "Torsi" },
      { name: "Bentuk Kawat", desc: "Bentuk kawat kustom kompleks yang direkayasa sesuai spesifikasi klien.", tag: "Kustom" },
      { name: "Per Zigzag", desc: "Per zigzag tahan lama untuk dudukan furnitur — penyangga dan elastisitas yang awet.", tag: "Dudukan" },
      { name: "Per Baterai", desc: "Kontak listrik andal untuk kompartemen baterai dan rakitan elektronik.", tag: "Kontak" },
    ],
  },
  capabilities: {
    index: "Spesifikasi Teknis",
    titlePrefix: "Kapabilitas",
    titleAccent: "Manufaktur",
    caps: ["Diameter Kawat", "OD Per", "Panjang Bebas", "Toleransi"],
    industriesHeading: "Industri yang Kami Layani",
    industries: [
      "Otomotif", "Kedirgantaraan", "Alat Medis", "Elektronik", "Pertahanan",
      "Minyak & Gas", "Maritim", "Konstruksi", "Pertanian", "Perkeretaapian",
    ],
  },
  gallery: {
    index: "Karya Kami",
    titlePrefix: "Galeri",
    titleAccent: "Per",
    description: "Etalase visual per yang telah kami rekayasa di berbagai industri dan aplikasi.",
    behindProcess: "Di Balik Proses",
    productionVideos: "Video Produksi",
    productionCaption: "Proses Produksi",
    items: [
      { label: "Per Kompresi Baja Nirkarat", tag: "Kompresi" },
      { label: "Per Lilit Standar — Umum", tag: "Kompresi" },
      { label: "Per Tarik Baja", tag: "Tarik" },
      { label: "Per Lilit Kompresi", tag: "Kompresi" },
      { label: "Per Baterai", tag: "Per Baterai" },
      { label: "Per Baterai", tag: "Per Baterai" },
      { label: "Per Kompresi Mini — Elektronik", tag: "Kompresi" },
      { label: "Per Kompresi Baja", tag: "Kompresi" },
      { label: "Per Kompresi Ujung Rata", tag: "Kompresi" },
      { label: "Pembentukan Kawat Baja Nirkarat", tag: "Bentuk Kawat" },
      { label: "Per Bentuk Kawat", tag: "Bentuk Kawat" },
      { label: "Per Torsi Baja Nirkarat", tag: "Kompresi" },
      { label: "Klem Selang Intercooler", tag: "Bentuk Kawat" },
      { label: "Per Kompresi Baja Nirkarat", tag: "Kompresi" },
      { label: "Produksi Kawat Bulat — Penggulungan Per", tag: "Produksi" },
    ],
    videos: ["Kawat Bulat — Produksi Langsung", "Per Kompresi — Produksi Langsung"],
  },
  contact: {
    index: "Hubungi Kami",
    titleLine1: "Siap Merekayasa",
    titleLine2: "Per Anda Berikutnya?",
    paragraph:
      "Kirim gambar, spesifikasi, atau ide Anda. Insinyur kami merespons dalam 24 jam dengan penawaran rinci dan konsultasi teknis.",
    placeholders: {
      name: "Nama Anda",
      company: "Perusahaan / Industri",
      email: "Alamat Email",
      message: "Jelaskan kebutuhan per Anda...",
    },
    requestQuote: "Minta Penawaran",
    sentTitle: "Pesan Terkirim",
    sentBody: "Tim kami akan menghubungi Anda dalam 24 jam.",
    address: "Jl. Sikatan 45, Manukan Wetan, Tandes",
  },
  footer: {
    rights: "Hak cipta dilindungi.",
    tagline: "Presisi · Keandalan · Inovasi",
  },
};

const zh: Content = {
  nav: {
    links: ["关于我们", "工艺流程", "产品", "生产能力", "作品展示", "联系我们"],
    getQuote: "获取报价",
  },
  hero: {
    badge: "精密弹簧制造 · 印尼",
    headline: ["精工", "每一", "圈。"],
    tagline:
      "以印尼制造的精密弹簧强化工业——按国际公差标准设计，在同一厂房内锻造与测试。",
    exploreProducts: "浏览产品",
    seeProcess: "了解工艺",
    scroll: "向下滚动",
    stats: ["年钢材锻造经验", "弹簧 / 天", "服务行业"],
  },
  about: {
    index: "我们是谁",
    titleLine1: "二十年",
    titleLine2: "弹簧制造匠艺",
    paragraph1:
      "Ruslie Spring 从一家小型本地工坊成长为值得信赖的印尼弹簧制造商。如今，我们以符合国际标准的精密弹簧支持国内工业。",
    paragraph2:
      "我们服务于不容失误的应用领域——汽车、电子、国防与重型工程——以零妥协的态度保持最严格的公差。",
    stats: ["年卓越经验", "每日产量", "服务企业"],
    features: [
      {
        title: "印尼制造卓越品质",
        text: "高精度弹簧制造，自豪地在印尼生产，无需依赖进口即可交付全球标准品质。",
      },
      {
        title: "印尼制造，引以为傲",
        text: "本地生产的世界级弹簧，支持国家工业并减少对进口零部件的依赖。",
      },
      {
        title: "定制行业解决方案",
        text: "为印尼各行业的汽车、机械与制造需求量身打造的定制弹簧。",
      },
      {
        title: "值得信赖的国产品质",
        text: "每件弹簧均经过检验与负载测试以确保性能稳定——证明本地产品达到世界级标准。",
      },
    ],
  },
  process: {
    index: "制造方式",
    stepWord: "步骤",
    steps: [
      {
        title: "原料线材选用",
        text: "高抗拉碳钢与不锈钢线材经测量后送入生产线——这是我们每一件弹簧的起点。",
      },
      {
        title: "CNC 精密卷绕",
        text: "电脑控制的卷簧机将每件弹簧成形至精确的节距、直径与自由长度——精度可重复至微米级。",
      },
      {
        title: "去应力与热处理",
        text: "线圈经回火处理以锁定弹性并抵抗永久变形，使弹簧在负载下拥有长久的使用寿命。",
      },
      {
        title: "负载测试与质量控制",
        text: "每一批次出货前都经过负载测试与尺寸检验——证明公差在实际应用中依然稳定。",
      },
    ],
  },
  products: {
    index: "我们的产品",
    titlePrefix: "弹簧",
    titleAccent: "产品目录",
    detail: "详情",
    items: [
      { name: "压缩弹簧", desc: "用于工业机械与汽车系统的高负载承重弹簧。", tag: "推压" },
      { name: "拉伸弹簧", desc: "精密设计，在重载应用中保持稳定张力。", tag: "拉伸" },
      { name: "扭转弹簧", desc: "为机械与制造业提供定制扭矩解决方案。", tag: "扭矩" },
      { name: "线材成型件", desc: "按客户精确规格设计的复杂定制线材造型。", tag: "定制" },
      { name: "锯齿弹簧", desc: "用于家具座椅的耐用锯齿弹簧——支撑持久、弹性耐用。", tag: "座椅" },
      { name: "电池弹簧", desc: "为电池仓与电子组件提供可靠的电气接触。", tag: "接触" },
    ],
  },
  capabilities: {
    index: "技术规格",
    titlePrefix: "制造",
    titleAccent: "生产能力",
    caps: ["线材直径", "弹簧外径", "自由长度", "公差"],
    industriesHeading: "我们服务的行业",
    industries: [
      "汽车", "航空航天", "医疗器械", "电子", "国防",
      "石油天然气", "船舶", "建筑", "农业", "铁路",
    ],
  },
  gallery: {
    index: "我们的作品",
    titlePrefix: "弹簧",
    titleAccent: "作品展示",
    description: "展示我们为各行业及应用领域所设计弹簧的视觉集锦。",
    behindProcess: "工艺幕后",
    productionVideos: "生产视频",
    productionCaption: "生产工艺",
    items: [
      { label: "不锈钢压缩弹簧", tag: "压缩" },
      { label: "标准卷簧 — 通用", tag: "压缩" },
      { label: "钢制拉伸弹簧", tag: "拉伸" },
      { label: "压缩卷簧", tag: "压缩" },
      { label: "电池弹簧", tag: "电池弹簧" },
      { label: "电池弹簧", tag: "电池弹簧" },
      { label: "微型压缩弹簧 — 电子", tag: "压缩" },
      { label: "钢制压缩弹簧", tag: "压缩" },
      { label: "平磨端面压缩弹簧", tag: "压缩" },
      { label: "不锈钢线材成型", tag: "线材成型" },
      { label: "线材成型弹簧", tag: "线材成型" },
      { label: "不锈钢扭转弹簧", tag: "压缩" },
      { label: "中冷器软管夹", tag: "线材成型" },
      { label: "不锈钢压缩弹簧", tag: "压缩" },
      { label: "圆线生产 — 弹簧卷绕", tag: "生产" },
    ],
    videos: ["圆线 — 实时生产", "压缩弹簧 — 实时生产"],
  },
  contact: {
    index: "取得联系",
    titleLine1: "准备好打造",
    titleLine2: "您的下一款弹簧了吗？",
    paragraph:
      "把您的图纸、规格或想法发给我们。我们的工程师将在 24 小时内回复，提供详细报价与技术咨询。",
    placeholders: {
      name: "您的姓名",
      company: "公司 / 行业",
      email: "电子邮箱",
      message: "描述您的弹簧需求……",
    },
    requestQuote: "请求报价",
    sentTitle: "消息已发送",
    sentBody: "我们的团队将在 24 小时内与您联系。",
    address: "Jl. Sikatan 45, Manukan Wetan, Tandes",
  },
  footer: {
    rights: "版权所有。",
    tagline: "精密 · 可靠 · 创新",
  },
};

export const content: Record<Lang, Content> = { en, id, zh };
```

- [ ] **Step 2: Type-check the dictionary**

Run: `npm run build`
Expected: PASS. Because `Content` is a single interface and all three objects (`en`, `id`, `zh`) are annotated `: Content`, any missing or misnamed field fails compilation here. (The marketing components still render English at this point — nothing imports `content` yet.)

- [ ] **Step 3: Commit**

```bash
git add lib/i18n.ts
git commit -m "Add trilingual translation dictionary"
```

---

## Task 2: Language provider + hook (`components/LanguageProvider.tsx`)

**Files:**
- Create: `components/LanguageProvider.tsx`

- [ ] **Step 1: Create the provider**

Create `components/LanguageProvider.tsx` with exactly this content:

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  content,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  type Content,
  type Lang,
} from "@/lib/i18n";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Content;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(value: string | null): value is Lang {
  return value === "en" || value === "id" || value === "zh";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start at DEFAULT_LANG so server and first client paint match
  // (no hydration mismatch). The saved choice is applied after mount.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: content[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: PASS. (Still unused by pages, so no behavior change yet.)

- [ ] **Step 3: Commit**

```bash
git add components/LanguageProvider.tsx
git commit -m "Add LanguageProvider context and useLanguage hook"
```

---

## Task 3: Wrap the marketing page (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Wrap the stack in the provider**

Replace the entire content of `app/page.tsx` with:

```tsx
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Process from "@/components/Process";
import Products from "@/components/Products";
import Gallery from "@/components/Gallery";
import Capabilities from "@/components/Capabilities";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function Home() {
  return (
    <LanguageProvider>
      <main className="hud-root">
        <Navbar />
        <Hero />
        <About />
        <Process />
        <Products />
        <Capabilities />
        <Gallery />
        <Contact />
        <Footer />
      </main>
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS. The page renders identically (components still hold their own English). The provider is now available to all sections.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Wrap marketing page in LanguageProvider"
```

---

## Task 4: Navbar — nav labels, Get Quote, and the toggle UI

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Replace the static `NAV_LINKS` array and consume translations**

In `components/Navbar.tsx`:

1. Add the import after the existing `import Link from "next/link";` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
import { LANGS } from "@/lib/i18n";
```

2. Replace the top-level `NAV_LINKS` constant (lines 8-15) with a hrefs/number-only constant (labels now come from translations):

```tsx
const NAV_META = [
  { href: "#about", n: "01" },
  { href: "#process", n: "02" },
  { href: "#products", n: "03" },
  { href: "#capabilities", n: "04" },
  { href: "#gallery", n: "05" },
  { href: "#contact", n: "06" },
];
```

3. Inside `export default function Navbar()`, after the existing `const { scrollYProgress } = useScroll();` line, add:

```tsx
  const { lang, setLang, tr } = useLanguage();
  const navLinks = NAV_META.map((m, i) => ({ ...m, label: tr.nav.links[i] }));
```

- [ ] **Step 2: Render the toggle + translated labels**

1. Replace the desktop nav block (the `<div className="hidden md:flex items-center gap-7">` ... matching `</div>`, lines 55-75) with:

```tsx
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative font-mono text-[0.74rem] tracking-[0.18em] uppercase text-hud-silver/55 hover:text-cyan transition-colors duration-200"
              >
                <span className="text-cyan/40 mr-1.5 text-[0.62rem] align-top">
                  {link.n}
                </span>
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-cyan transition-all duration-300 group-hover:w-full" />
              </a>
            ))}

            {/* Language toggle */}
            <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`px-2.5 py-1 rounded-full font-mono text-[0.66rem] tracking-[0.08em] uppercase transition-colors duration-200 ${
                    lang === l.code
                      ? "bg-cyan text-graphite"
                      : "text-hud-silver/55 hover:text-cyan"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <a
              href="#contact"
              className="relative font-mono text-[0.74rem] font-medium tracking-[0.16em] uppercase text-graphite bg-cyan px-4 py-2 rounded hover:shadow-cyan-glow transition-shadow duration-300"
            >
              {tr.nav.getQuote}
            </a>
          </div>
```

2. In the mobile menu, replace the `{NAV_LINKS.map(...)}` block and the "Get Quote" link (lines 104-121) with:

```tsx
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="font-mono text-sm tracking-[0.16em] uppercase text-hud-silver/70 hover:text-cyan transition-colors"
                >
                  <span className="text-cyan/40 mr-2 text-xs">{link.n}</span>
                  {link.label}
                </a>
              ))}

              {/* Language toggle (mobile) */}
              <div className="flex items-center gap-1.5 mt-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    aria-pressed={lang === l.code}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs tracking-[0.08em] uppercase border transition-colors ${
                      lang === l.code
                        ? "bg-cyan text-graphite border-cyan"
                        : "text-hud-silver/60 border-white/15 hover:text-cyan"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="bg-cyan text-graphite text-center py-3 rounded font-mono font-medium text-sm tracking-[0.16em] uppercase mt-2"
              >
                {tr.nav.getQuote}
              </a>
```

- [ ] **Step 3: Build + manual check**

Run: `npm run build` — Expected: PASS.
Then `npm run dev`, open http://localhost:3000: the navbar shows `EN · ID · 中文` pills. Clicking ID/中文 changes nav labels + "Get Quote" instantly. Reload — the last choice persists.

- [ ] **Step 4: Commit**

```bash
git add components/Navbar.tsx
git commit -m "Add language toggle and translated nav to Navbar"
```

---

## Task 5: Hero

**Files:**
- Modify: `components/Hero.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { BlueprintGrid, ... } from "./hud";` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
```

2. Delete the top-level `HEADLINE` constant (line 13) and the `label` fields in `STATS` (keep `to`/`suffix`). Replace the `STATS` constant (lines 15-19) with:

```tsx
const STAT_VALUES = [
  { to: 20, suffix: "+" },
  { to: 50, suffix: "K+" },
  { to: 80, suffix: "+" },
];
```

3. Inside `export default function Hero()`, after `const reduce = useReducedMotion();`, add:

```tsx
  const { tr } = useLanguage();
```

- [ ] **Step 2: Swap the strings**

- Replace `<SpecTag active>Precision Spring Manufacturing · ID</SpecTag>` with `<SpecTag active>{tr.hero.badge}</SpecTag>`.
- In the headline `<h1>`, replace `{HEADLINE.map((word, i) => (` with `{tr.hero.headline.map((word, i) => (`.
- Replace the tagline `<motion.p>` text (the "Strengthening industry..." string) with `{tr.hero.tagline}`.
- Replace `<MagneticButton href="#products">Explore Products</MagneticButton>` with `<MagneticButton href="#products">{tr.hero.exploreProducts}</MagneticButton>`.
- Replace `See the Process` inside the ghost `<MagneticButton>` with `{tr.hero.seeProcess}`.
- Replace the trust-counter `{STATS.map((s) => (` with `{STAT_VALUES.map((s, i) => (`, change `key={s.label}` to `key={i}`, and replace the label `<div>` text `{s.label}` with `{tr.hero.stats[i]}`.
- Replace the scroll indicator text `Scroll` with `{tr.hero.scroll}`.

- [ ] **Step 3: Build + check**

Run: `npm run build` — Expected: PASS. In the browser, toggling language updates the hero badge, headline, tagline, buttons, stat labels, and "Scroll".

- [ ] **Step 4: Commit**

```bash
git add components/Hero.tsx
git commit -m "Translate Hero section"
```

---

## Task 6: About

**Files:**
- Modify: `components/About.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { ... } from "./hud";` block:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
```

2. Replace the top-level `STATS` constant (lines 13-17) with value-only data, and replace `FEATURES` (lines 19-40) with an icon-only array (text now comes from `tr`):

```tsx
const STAT_VALUES = [
  { to: 20, suffix: "+" },
  { to: 50, suffix: "K+" },
  { to: 80, suffix: "+" },
];

const FEATURE_ICONS = [Factory, MapPin, Cog, ShieldCheck];
```

3. Inside `export default function About()`, after `const inView = useInView(...);`, add:

```tsx
  const { tr } = useLanguage();
```

- [ ] **Step 2: Swap the strings**

- Replace `<SectionIndex index="01" label="Who We Are" ... />` `label` value with `{tr.about.index}` → `label={tr.about.index}`.
- Replace the `<h2>` text `Two Decades of` with `{tr.about.titleLine1}` and the accent `<span>` `Springmaking Mastery` with `{tr.about.titleLine2}`.
- Replace paragraph 1 text with `{tr.about.paragraph1}` and paragraph 2 text with `{tr.about.paragraph2}`.
- Replace the stats `{STATS.map((s, i) => (` with `{STAT_VALUES.map((s, i) => (`, set `key={i}`, and the label `<div>` `{s.label}` with `{tr.about.stats[i]}`.
- Replace the features `{FEATURES.map((item, i) => {` with `{tr.about.features.map((item, i) => {`, set `const Icon = FEATURE_ICONS[i];` (instead of `item.icon`), `key={item.title}`, and use `{item.title}` / `{item.text}` as before.

- [ ] **Step 3: Build + check**

Run: `npm run build` — Expected: PASS. Toggling updates the heading, both paragraphs, stat labels, and all four feature cards.

- [ ] **Step 4: Commit**

```bash
git add components/About.tsx
git commit -m "Translate About section"
```

---

## Task 7: Process

**Files:**
- Modify: `components/Process.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { BlueprintGrid, SectionIndex } from "./hud";` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
```

2. In the top-level `STEPS` constant (lines 18-55), remove the `title` and `text` fields from each step, keeping `n`, `key`, `spec`, `compress`, `coils`. The result:

```tsx
const STEPS = [
  { n: "01", key: "wire", spec: "Ø 0.1 – 50 mm", compress: 0, coils: 8 },
  { n: "02", key: "coil", spec: "OD 1 – 500 mm", compress: 0.16, coils: 9 },
  { n: "03", key: "heat", spec: "Tempered · set-resistant", compress: 0.42, coils: 9 },
  { n: "04", key: "qc", spec: "± 0.01 mm verified", compress: 0.24, coils: 8 },
];
```

3. Inside `export default function Process()`, after `const [active, setActive] = useState(0);`, add:

```tsx
  const { tr } = useLanguage();
```

- [ ] **Step 2: Swap the strings**

- Replace `<SectionIndex index="02" label="How It's Made" ... />` → `label={tr.process.index}`.
- Replace `STEP {step.n} / ...` so the word `STEP` becomes `{tr.process.stepWord}`: `{tr.process.stepWord} {step.n} / {String(STEPS.length).padStart(2, "0")}`.
- The morphing copy block reads `step.title` / `step.text`. Replace `step.title` (in the `<h3>`) with `tr.process.steps[active].title` and `step.text` (in the `<p>`) with `tr.process.steps[active].text`. `step.spec` stays.
- In the bottom progress rail, the label uses `{s.title.split(" ")[0]}`. Replace it with `{tr.process.steps[i].title.split(" ")[0]}` (the `.map((s, i) => ...)` already exposes `i`).

- [ ] **Step 3: Build + check**

Run: `npm run build` — Expected: PASS. Scroll through Process; the step title/body and the "STEP" word and rail labels reflect the active language. (Chinese has no spaces, so `split(" ")[0]` returns the full short title — acceptable for the rail chip.)

- [ ] **Step 4: Commit**

```bash
git add components/Process.tsx
git commit -m "Translate Process section"
```

---

## Task 8: Products

**Files:**
- Modify: `components/Products.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { SectionIndex, CornerBrackets, type CardEntrance } from "./hud";` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
```

2. The `PRODUCTS` array (lines 93-142) carries `name`, `desc`, `tag` (translatable) plus `icon`, `span`, `variant` (structural). Strip the translatable fields, keeping structural data keyed by index:

```tsx
const PRODUCT_META: { icon: LucideIcon; span: string; variant: VariantKey }[] = [
  { icon: ArrowDownUp, span: "lg:col-span-2", variant: "compress" },
  { icon: MoveVertical, span: "", variant: "extend" },
  { icon: RotateCw, span: "", variant: "torsion" },
  { icon: Spline, span: "", variant: "unspool" },
  { icon: Activity, span: "", variant: "zigzag" },
  { icon: BatteryCharging, span: "lg:col-span-2", variant: "charge" },
];
```

Also delete the now-unused `Product` type (lines 84-91) — `ProductCard` will take its data via props described below.

3. Change `ProductCard`'s signature and internals. Replace `function ProductCard({ p, index }: { p: Product; index: number }) {` with:

```tsx
function ProductCard({
  meta,
  text,
  index,
}: {
  meta: (typeof PRODUCT_META)[number];
  text: { name: string; desc: string; tag: string };
  index: number;
}) {
```

Then inside `ProductCard`, replace `const Icon = p.icon;` with `const Icon = meta.icon;`, replace `const entrance = VARIANTS[p.variant];` with `const entrance = VARIANTS[meta.variant];`, replace `className={p.span}` with `className={meta.span}`, replace `p.variant === "charge"` with `meta.variant === "charge"`, replace `{p.tag}` with `{text.tag}`, `{p.name}` with `{text.name}`, and `{p.desc}` with `{text.desc}`. Replace the hover "Detail" label text with `{useLanguage().tr.products.detail}` — but since hooks can't be called inline in JSX, instead add near the top of `ProductCard` (after `const Icon = meta.icon;`):

```tsx
  const { tr } = useLanguage();
```

and use `{tr.products.detail}` for the Detail label.

- [ ] **Step 2: Swap the section strings + render loop**

In `export default function Products()`:

1. After `const headerY = useTransform(...);` add:

```tsx
  const { tr } = useLanguage();
```

2. Replace `<SectionIndex index="03" label="What We Make" ... />` → `label={tr.products.index}`.
3. Replace the `<h2>` content `The <span ...>Spring Catalog</span>` with `{tr.products.titlePrefix}{" "}<span className="text-cyan hud-glow-cyan">{tr.products.titleAccent}</span>`.
4. Replace the render loop `{PRODUCTS.map((p, i) => (<ProductCard key={p.name} p={p} index={i} />))}` with:

```tsx
          {PRODUCT_META.map((meta, i) => (
            <ProductCard
              key={i}
              meta={meta}
              text={tr.products.items[i]}
              index={i}
            />
          ))}
```

- [ ] **Step 3: Build + check**

Run: `npm run build` — Expected: PASS. Each product card's name, description, tag, and the hover "Detail" label translate. Card layout/animations unchanged.

- [ ] **Step 4: Commit**

```bash
git add components/Products.tsx
git commit -m "Translate Products section"
```

---

## Task 9: Capabilities

**Files:**
- Modify: `components/Capabilities.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { SectionIndex, TiltSpotlightCard, type CardEntrance } from "./hud";` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
```

2. In the `CAPS` array (lines 10-68), remove the `label` field from each entry, keeping `value`, `unit`, `entrance`. The label comes from `tr.capabilities.caps[i]` by index. Update the type to `{ value: string; unit: string; entrance: CardEntrance }[]`.
3. Delete the top-level `INDUSTRIES` constant (lines 70-81) — it now comes from `tr`.
4. Inside `export default function Capabilities()`, after `const headerY = ...`, add:

```tsx
  const { tr } = useLanguage();
```

- [ ] **Step 2: Swap the strings**

- Replace `<SectionIndex index="04" label="Technical Specs" ... />` → `label={tr.capabilities.index}`.
- Replace the `<h2>` content `Manufacturing{" "}<span ...>Capabilities</span>` with `{tr.capabilities.titlePrefix}{" "}<span className="text-cyan hud-glow-cyan">{tr.capabilities.titleAccent}</span>`.
- In `{CAPS.map((c, i) => (`, the `<TiltSpotlightCard key={c.label}` must change to `key={i}`, and the label `<div>` `{c.label}` becomes `{tr.capabilities.caps[i]}`. `c.value` and `c.unit` stay.
- Replace the `Industries We Serve` paragraph text with `{tr.capabilities.industriesHeading}`.
- Replace `{INDUSTRIES.map((ind, i) => (` with `{tr.capabilities.industries.map((ind, i) => (`. `key={ind}` and `{ind}` stay valid.

- [ ] **Step 3: Build + check**

Run: `npm run build` — Expected: PASS. Cap labels, heading + accent, "Industries We Serve", and the industry chips all translate; numeric values/units stay.

- [ ] **Step 4: Commit**

```bash
git add components/Capabilities.tsx
git commit -m "Translate Capabilities section"
```

---

## Task 10: Gallery

**Files:**
- Modify: `components/Gallery.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { SectionIndex } from "./hud"` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider"
```

2. The `GALLERY_ITEMS` array (lines 16-32) carries `label`, `image`, `tag`. `label` and `tag` are translatable; `image` is structural. Replace it with an image-only array (labels/tags come from `tr.gallery.items[i]`):

```tsx
const GALLERY_IMAGES = [
  "/spring/gallery1.jpg", "/spring/item1.jpg", "/spring/gallery2.jpg",
  "/spring/gallery4.jpg", "/spring/gallery3.jpg", "/spring/item3.jpg",
  "/spring/gallery5.jpg", "/spring/gallery7.jpg", "/spring/gallery8.jpg",
  "/spring/item2.jpg", "/spring/item4.jpg", "/spring/item5.jpg",
  "/spring/gallery6.jpg", "/spring/item6.jpg", "/spring/Mesin1.jpg",
]
```

3. The `VIDEO_ITEMS` array (lines 34-37) carries `label` (translatable) + `src` (structural). Replace with a src-only array (labels come from `tr.gallery.videos[i]`):

```tsx
const VIDEO_SRCS = ["/spring/Mesin1Vid.mp4", "/spring/Mesin2Vid.mp4"]
```

- [ ] **Step 2: Update `GalleryTile` to take label/tag as props**

`GalleryTile` currently takes `item: (typeof GALLERY_ITEMS)[number]`. Change its props to receive `image`, `label`, `tag` directly. Replace the `GalleryTile` signature with:

```tsx
function GalleryTile({
	image,
	label,
	tag,
	index,
	onOpen,
}: {
	image: string
	label: string
	tag: string
	index: number
	onOpen: () => void
}) {
```

Inside `GalleryTile`, replace `item.image` with `image` (in `<Image src=...>` and `alt`), `item.tag` with `tag` (two places: hover overlay span and the tag badge), and `item.label` with `label` (hover overlay + `alt`).

- [ ] **Step 3: Swap section strings + render loops**

In `export default function Gallery()`:

1. After `const [lightbox, setLightbox] = useState<number | null>(null)` add:

```tsx
	const { tr } = useLanguage()
	const total = VIDEO_SRCS.length
```

   and delete the earlier `const total = VIDEO_ITEMS.length` line (line 146) to avoid a duplicate declaration.

2. Replace `<SectionIndex index="05" label="Our Work" ... />` → `label={tr.gallery.index}`.
3. Replace the `<h2>` content `Spring <span ...>Gallery</span>` with `{tr.gallery.titlePrefix}{" "}<span className="text-cyan hud-glow-cyan">{tr.gallery.titleAccent}</span>`.
4. Replace the description `<p>` text ("A visual showcase...") with `{tr.gallery.description}`.
5. Replace the photo-grid loop `{GALLERY_ITEMS.map((item, i) => (<GalleryTile key={i} item={item} index={i} onOpen={() => setLightbox(i)} />))}` with:

```tsx
						{GALLERY_IMAGES.map((image, i) => (
							<GalleryTile
								key={i}
								image={image}
								label={tr.gallery.items[i].label}
								tag={tr.gallery.items[i].tag}
								index={i}
								onOpen={() => setLightbox(i)}
							/>
						))}
```

6. Replace `Behind the Process` text with `{tr.gallery.behindProcess}` and `Production Videos` with `{tr.gallery.productionVideos}`.
7. In the video deck loop `{VIDEO_ITEMS.map((vid, i) => {`, change to `{VIDEO_SRCS.map((src, i) => {` and replace `src={vid.src}` with `src={src}`.
8. Replace the caption `Production Process · {topIndex + 1} / {total}` with `{tr.gallery.productionCaption} · {topIndex + 1} / {total}`.
9. Replace the active caption `{VIDEO_ITEMS[topIndex].label}` with `{tr.gallery.videos[topIndex]}`.
10. In the lightbox, replace `GALLERY_ITEMS[lightbox].image` with `GALLERY_IMAGES[lightbox]`, `GALLERY_ITEMS[lightbox].label` (two places: `alt` and the `<p>`) with `tr.gallery.items[lightbox].label`, `GALLERY_ITEMS[lightbox].tag` with `tr.gallery.items[lightbox].tag`, and `GALLERY_ITEMS.length` with `GALLERY_IMAGES.length`.

- [ ] **Step 4: Build + check**

Run: `npm run build` — Expected: PASS. Tile labels/tags, header, description, video section headings, captions, and lightbox text translate. Images, videos, layout unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/Gallery.tsx
git commit -m "Translate Gallery section"
```

---

## Task 11: Contact

**Files:**
- Modify: `components/Contact.tsx`

- [ ] **Step 1: Consume translations**

1. Add after the `import { SectionIndex } from "./hud";` line:

```tsx
import { useLanguage } from "@/components/LanguageProvider";
```

2. The `CONTACT_INFO` array (lines 8-12) holds `icon` (structural) + `text`. Address is translatable; phone and email are not. Replace with icon-only metadata; build the text list inside the component:

```tsx
const CONTACT_ICONS = [MapPin, Phone, Mail];
const CONTACT_FIXED = ["+62851 0481 5151", "rusliespring@gmail.com"];
```

3. Inside `export default function Contact()`, after `const [sent, setSent] = useState(false);`, add:

```tsx
  const { tr } = useLanguage();
  const contactInfo = [
    { Icon: CONTACT_ICONS[0], text: tr.contact.address },
    { Icon: CONTACT_ICONS[1], text: CONTACT_FIXED[0] },
    { Icon: CONTACT_ICONS[2], text: CONTACT_FIXED[1] },
  ];
```

- [ ] **Step 2: Swap the strings**

- Replace `<SectionIndex index="06" label="Get In Touch" />` → `label={tr.contact.index}`.
- Replace the `<h2>` text `Ready to Engineer` with `{tr.contact.titleLine1}` and the accent span `Your Next Spring?` with `{tr.contact.titleLine2}`.
- Replace the paragraph text ("Send us your drawings...") with `{tr.contact.paragraph}`.
- Replace the inputs map `{["Your Name", "Company / Industry", "Email Address"].map((ph) => (` with `{[tr.contact.placeholders.name, tr.contact.placeholders.company, tr.contact.placeholders.email].map((ph) => (`.
- Replace the textarea `placeholder="Describe your spring requirements..."` with `placeholder={tr.contact.placeholders.message}`.
- Replace the button text `Request a Quote` with `{tr.contact.requestQuote}`.
- Replace the sent state `Message Sent` with `{tr.contact.sentTitle}` and `Our team will get back to you within 24 hours.` with `{tr.contact.sentBody}`.
- Replace the contact info loop `{CONTACT_INFO.map(({ icon: Icon, text }) => (` with `{contactInfo.map(({ Icon, text }) => (`. The body keeps `<Icon ... />` and `{text}` (now destructured as `Icon`).

- [ ] **Step 3: Build + check**

Run: `npm run build` — Expected: PASS. Heading, paragraph, all four input placeholders, the button, the sent-confirmation, and the address translate; phone/email stay.

- [ ] **Step 4: Commit**

```bash
git add components/Contact.tsx
git commit -m "Translate Contact section"
```

---

## Task 12: Footer

**Files:**
- Modify: `components/Footer.tsx`

- [ ] **Step 1: Make it a client component and consume translations**

Replace the entire content of `components/Footer.tsx` with:

```tsx
"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function Footer() {
  const { tr } = useLanguage();
  return (
    <footer className="relative bg-graphite border-t border-white/[0.06] overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 h-16 hud-blueprint pointer-events-none"
        style={{ opacity: 0.4 }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap">
        <span className="font-tech text-hud-silver/45 text-[0.88rem]">
          © 2026{" "}
          <span className="text-cyan">Ruslie Spring</span>. {tr.footer.rights}
        </span>
        <span className="font-mono text-hud-mute text-[0.66rem] tracking-[0.22em] uppercase">
          {tr.footer.tagline}
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Build + check**

Run: `npm run build` — Expected: PASS. Footer "All rights reserved." and the tagline translate.

- [ ] **Step 3: Commit**

```bash
git add components/Footer.tsx
git commit -m "Translate Footer section"
```

---

## Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: PASS with no type errors and no warnings about missing translation fields.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (no new errors; in particular no `no-unused-vars` for the old constants you removed).

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` and open http://localhost:3000.
- Toggle EN → ID → 中文. Every section (Hero, About, Process, Products, Capabilities, Gallery, Contact, Footer, nav, Get Quote) updates instantly.
- Open browser devtools console — confirm **no hydration mismatch warning** on load.
- Reload the page — the last selected language persists (localStorage).
- Visit http://localhost:3000/calculator and http://localhost:3000/invoice — confirm they are visually unchanged (no toggle, still Indonesian as before).

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "Finalize language toggle"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** i18n core → Task 1; provider/localStorage/SSR-safety → Task 2; page wiring → Task 3; navbar toggle (desktop + mobile) → Task 4; all nine marketing components → Tasks 4–12; verification (build + manual + untouched tools) → Task 13. All spec sections covered.
- **Refinement vs spec:** spec described `t('dot.key')` with a runtime English fallback; this plan uses a typed `Content` object (`tr.*`) instead, which makes missing translations a compile error — strictly stronger, so the runtime fallback is intentionally dropped. Flagged to the user.
- **Placeholders:** none — every string in all three languages is written out in Task 1; every edit names exact identifiers.
- **Type consistency:** context exposes `{ lang, setLang, tr }` (Task 2) and every component consumes `tr` (Tasks 4–12); `LANGS`/`Lang`/`content`/`DEFAULT_LANG`/`LANG_STORAGE_KEY` names match between `lib/i18n.ts` and consumers; `STAT_VALUES`, `FEATURE_ICONS`, `PRODUCT_META`, `GALLERY_IMAGES`, `VIDEO_SRCS`, `CONTACT_ICONS` are each defined in the task that uses them.
- **No-test-suite adaptation:** all verification is `npm run build` / `npm run lint` / manual browser checks, consistent with CLAUDE.md ("There is no test suite in this repo").
