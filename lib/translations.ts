// Central translation dictionary for the marketing homepage.
// `en` is the source of truth; `id` and `zh` mirror its shape (enforced by the
// `Dict` type). Only display text lives here — icons, hrefs, image paths,
// animation variants, and numeric specs stay in the components.

export type Lang = "en" | "id" | "zh";

const en = {
  nav: {
    // Order matches NAV_LINKS in components/Navbar.tsx
    links: ["About", "Process", "Products", "Capabilities", "Gallery", "Contact"],
    getQuote: "Get Quote",
  },
  hero: {
    badge: "Precision Spring Manufacturing · ID",
    headline: ["Engineering", "Every", "Coil."],
    paragraph:
      "Strengthening industry with Indonesian-made precision springs — engineered to international tolerances, forged and tested under one roof.",
    ctaProducts: "Explore Products",
    ctaProcess: "See the Process",
    stats: ["Years Forging Steel", "Springs / Day", "Industries Served"],
    scroll: "Scroll",
  },
  about: {
    label: "Who We Are",
    heading: ["Two Decades of", "Springmaking Mastery"],
    p1: "Ruslie Spring has grown from a small local workshop into a trusted Indonesian spring manufacturer. Today we support domestic industry with precision springs engineered to international standards.",
    p2: "We serve applications where failure is not an option — automotive, electronics, defense, and heavy engineering — holding the tightest tolerances with zero compromise.",
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
    label: "How It's Made",
    step: "STEP",
    steps: [
      {
        title: "Raw Wire Selection",
        text: "High-tensile carbon and stainless wire is gauged and fed into the line — the starting point of every spring we make.",
        spec: "Ø 0.1 – 50 mm",
      },
      {
        title: "CNC Precision Coiling",
        text: "Computer-controlled coilers form each spring to an exact pitch, diameter, and free length — repeatable to the micron.",
        spec: "OD 1 – 500 mm",
      },
      {
        title: "Stress-Relief & Heat-Treat",
        text: "Coils are tempered to lock in elasticity and resist permanent set, giving the spring its long working life under load.",
        spec: "Tempered · set-resistant",
      },
      {
        title: "Load-Test & Quality Control",
        text: "Every batch is load-tested and dimensionally inspected before it ships — proof the tolerance holds in the real world.",
        spec: "± 0.01 mm verified",
      },
    ],
  },
  products: {
    label: "What We Make",
    heading: ["The", "Spring Catalog"],
    detail: "Detail",
    items: [
      {
        name: "Compression Springs",
        desc: "High-load bearing springs for industrial machinery and automotive systems.",
        tag: "Push",
      },
      {
        name: "Extension Springs",
        desc: "Precision-engineered for consistent tension in heavy-duty applications.",
        tag: "Pull",
      },
      {
        name: "Torsion Springs",
        desc: "Custom torque solutions for machinery and manufacturing.",
        tag: "Torque",
      },
      {
        name: "Wire Forms",
        desc: "Complex custom wire shapes engineered to exact client specifications.",
        tag: "Custom",
      },
      {
        name: "Zigzag Springs",
        desc: "Durable zigzag springs for furniture seating — long-lasting support and elasticity.",
        tag: "Seating",
      },
      {
        name: "Battery Springs",
        desc: "Reliable electrical contact for battery compartments and electronic assemblies.",
        tag: "Contact",
      },
    ],
  },
  capabilities: {
    label: "Technical Specs",
    heading: ["Manufacturing", "Capabilities"],
    caps: ["Wire Diameter", "Spring OD", "Free Length", "Tolerance"],
    industriesTitle: "Industries We Serve",
    industries: [
      "Automotive",
      "Aerospace",
      "Medical Devices",
      "Electronics",
      "Defense",
      "Oil & Gas",
      "Marine",
      "Construction",
      "Agriculture",
      "Railway",
    ],
  },
  gallery: {
    label: "Our Work",
    heading: ["Spring", "Gallery"],
    description:
      "A visual showcase of springs we've engineered across industries and applications.",
    behindProcess: "Behind the Process",
    productionVideos: "Production Videos",
    productionProcess: "Production Process",
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
    label: "Get In Touch",
    heading: ["Ready to Engineer", "Your Next Spring?"],
    paragraph:
      "Send us your drawings, specs, or ideas. Our engineers respond within 24 hours with a detailed quote and technical consultation.",
    placeholders: {
      name: "Your Name",
      company: "Company / Industry",
      email: "Email Address",
      message: "Describe your spring requirements...",
    },
    button: "Request a Quote",
    sentTitle: "Message Sent",
    sentText: "Our team will get back to you within 24 hours.",
  },
  footer: {
    rights: "All rights reserved.",
    tagline: "Precision · Reliability · Innovation",
  },
};

export type Dict = typeof en;

const id: Dict = {
  nav: {
    links: ["Tentang", "Proses", "Produk", "Kapabilitas", "Galeri", "Kontak"],
    getQuote: "Minta Penawaran",
  },
  hero: {
    badge: "Manufaktur Pegas Presisi · ID",
    headline: ["Merekayasa", "Setiap", "Lilitan."],
    paragraph:
      "Memperkuat industri dengan pegas presisi buatan Indonesia — direkayasa sesuai toleransi internasional, dibentuk dan diuji dalam satu atap.",
    ctaProducts: "Jelajahi Produk",
    ctaProcess: "Lihat Prosesnya",
    stats: ["Tahun Menempa Baja", "Pegas / Hari", "Industri Dilayani"],
    scroll: "Gulir",
  },
  about: {
    label: "Siapa Kami",
    heading: ["Dua Dekade", "Keahlian Membuat Pegas"],
    p1: "Ruslie Spring tumbuh dari bengkel lokal kecil menjadi produsen pegas Indonesia yang tepercaya. Kini kami mendukung industri dalam negeri dengan pegas presisi yang direkayasa sesuai standar internasional.",
    p2: "Kami melayani aplikasi di mana kegagalan bukan pilihan — otomotif, elektronik, pertahanan, dan rekayasa berat — menjaga toleransi paling ketat tanpa kompromi.",
    stats: ["Tahun Keunggulan", "Pegas Harian", "Perusahaan Dilayani"],
    features: [
      {
        title: "Keunggulan Manufaktur Indonesia",
        text: "Manufaktur pegas presisi tinggi yang dengan bangga dibuat di Indonesia, menghadirkan kualitas standar global tanpa bergantung pada impor.",
      },
      {
        title: "Dengan Bangga Buatan Indonesia",
        text: "Pegas kelas dunia yang diproduksi secara lokal untuk mendukung industri nasional dan mengurangi ketergantungan pada komponen impor.",
      },
      {
        title: "Solusi Industri Kustom",
        text: "Pegas yang direkayasa khusus sesuai kebutuhan otomotif, mesin, dan manufaktur di seluruh industri Indonesia.",
      },
      {
        title: "Kualitas Domestik Tepercaya",
        text: "Setiap pegas diperiksa dan diuji beban untuk menjamin performa yang konsisten — bukti bahwa produk lokal memenuhi standar kelas dunia.",
      },
    ],
  },
  process: {
    label: "Cara Pembuatannya",
    step: "LANGKAH",
    steps: [
      {
        title: "Pemilihan Kawat Mentah",
        text: "Kawat karbon dan stainless berkekuatan tarik tinggi diukur dan dimasukkan ke lini produksi — titik awal dari setiap pegas yang kami buat.",
        spec: "Ø 0.1 – 50 mm",
      },
      {
        title: "Penggulungan Presisi CNC",
        text: "Mesin penggulung terkontrol komputer membentuk setiap pegas pada pitch, diameter, dan panjang bebas yang tepat — berulang hingga mikron.",
        spec: "OD 1 – 500 mm",
      },
      {
        title: "Pelepasan Tegangan & Perlakuan Panas",
        text: "Lilitan ditempa untuk mengunci elastisitas dan menahan deformasi permanen, memberi pegas umur kerja panjang di bawah beban.",
        spec: "Ditempa · tahan set",
      },
      {
        title: "Uji Beban & Kontrol Kualitas",
        text: "Setiap batch diuji beban dan diperiksa dimensinya sebelum dikirim — bukti bahwa toleransi bertahan di dunia nyata.",
        spec: "± 0.01 mm terverifikasi",
      },
    ],
  },
  products: {
    label: "Apa yang Kami Buat",
    heading: ["Katalog", "Pegas"],
    detail: "Detail",
    items: [
      {
        name: "Pegas Tekan",
        desc: "Pegas penahan beban tinggi untuk mesin industri dan sistem otomotif.",
        tag: "Tekan",
      },
      {
        name: "Pegas Tarik",
        desc: "Direkayasa presisi untuk tegangan konsisten pada aplikasi tugas berat.",
        tag: "Tarik",
      },
      {
        name: "Pegas Puntir",
        desc: "Solusi torsi kustom untuk mesin dan manufaktur.",
        tag: "Torsi",
      },
      {
        name: "Bentuk Kawat",
        desc: "Bentuk kawat kustom kompleks yang direkayasa sesuai spesifikasi klien.",
        tag: "Kustom",
      },
      {
        name: "Pegas Zigzag",
        desc: "Pegas zigzag tahan lama untuk dudukan furnitur — dukungan dan elastisitas yang awet.",
        tag: "Dudukan",
      },
      {
        name: "Pegas Baterai",
        desc: "Kontak listrik andal untuk kompartemen baterai dan rakitan elektronik.",
        tag: "Kontak",
      },
    ],
  },
  capabilities: {
    label: "Spesifikasi Teknis",
    heading: ["Kapabilitas", "Manufaktur"],
    caps: ["Diameter Kawat", "OD Pegas", "Panjang Bebas", "Toleransi"],
    industriesTitle: "Industri yang Kami Layani",
    industries: [
      "Otomotif",
      "Dirgantara",
      "Alat Kesehatan",
      "Elektronik",
      "Pertahanan",
      "Minyak & Gas",
      "Maritim",
      "Konstruksi",
      "Pertanian",
      "Perkeretaapian",
    ],
  },
  gallery: {
    label: "Hasil Kerja Kami",
    heading: ["Galeri", "Pegas"],
    description:
      "Pameran visual pegas yang telah kami rekayasa di berbagai industri dan aplikasi.",
    behindProcess: "Di Balik Proses",
    productionVideos: "Video Produksi",
    productionProcess: "Proses Produksi",
    items: [
      { label: "Pegas Tekan Stainless Steel", tag: "Tekan" },
      { label: "Pegas Koil Standar — Penggunaan Umum", tag: "Tekan" },
      { label: "Pegas Tarik Baja", tag: "Tarik" },
      { label: "Pegas Koil Tekan", tag: "Tekan" },
      { label: "Pegas Baterai", tag: "Pegas Baterai" },
      { label: "Pegas Baterai", tag: "Pegas Baterai" },
      { label: "Pegas Tekan Mini — Elektronik", tag: "Tekan" },
      { label: "Pegas Tekan Baja", tag: "Tekan" },
      { label: "Pegas Tekan Ujung Rata", tag: "Tekan" },
      { label: "Pembentukan Kawat Stainless Steel", tag: "Bentuk Kawat" },
      { label: "Pegas Bentuk Kawat", tag: "Bentuk Kawat" },
      { label: "Pegas Puntir Stainless Steel", tag: "Tekan" },
      { label: "Klem Selang Intercooler", tag: "Bentuk Kawat" },
      { label: "Pegas Tekan Stainless Steel", tag: "Tekan" },
      { label: "Kawat Bulat Produksi — Penggulungan Pegas", tag: "Produksi" },
    ],
    videos: ["Kawat Bulat — Produksi Langsung", "Pegas Tekan — Produksi Langsung"],
  },
  contact: {
    label: "Hubungi Kami",
    heading: ["Siap Merekayasa", "Pegas Berikutnya Anda?"],
    paragraph:
      "Kirimkan gambar, spesifikasi, atau ide Anda. Insinyur kami merespons dalam 24 jam dengan penawaran terperinci dan konsultasi teknis.",
    placeholders: {
      name: "Nama Anda",
      company: "Perusahaan / Industri",
      email: "Alamat Email",
      message: "Jelaskan kebutuhan pegas Anda...",
    },
    button: "Minta Penawaran",
    sentTitle: "Pesan Terkirim",
    sentText: "Tim kami akan menghubungi Anda kembali dalam 24 jam.",
  },
  footer: {
    rights: "Semua hak dilindungi.",
    tagline: "Presisi · Keandalan · Inovasi",
  },
};

const zh: Dict = {
  nav: {
    links: ["关于", "工艺", "产品", "能力", "图库", "联系"],
    getQuote: "获取报价",
  },
  hero: {
    badge: "精密弹簧制造 · ID",
    headline: ["精工", "细作", "每一圈"],
    paragraph:
      "以印尼制造的精密弹簧强化工业 — 按国际公差标准设计，在同一屋檐下成型与检测。",
    ctaProducts: "探索产品",
    ctaProcess: "了解工艺",
    stats: ["锻钢年数", "弹簧 / 天", "服务行业"],
    scroll: "滚动",
  },
  about: {
    label: "关于我们",
    heading: ["二十载", "制簧匠心"],
    p1: "Ruslie Spring 从一家小型本地工坊成长为值得信赖的印尼弹簧制造商。如今我们以符合国际标准的精密弹簧支持国内工业。",
    p2: "我们服务于不容失败的领域 — 汽车、电子、国防与重型工程 — 以零妥协坚守最严苛的公差。",
    stats: ["卓越年数", "每日弹簧", "服务企业"],
    features: [
      {
        title: "印尼制造卓越品质",
        text: "高精密弹簧自豪地在印尼制造，呈现全球标准品质而无需依赖进口。",
      },
      {
        title: "自豪的印尼制造",
        text: "本地生产的世界级弹簧，支持民族工业并减少对进口部件的依赖。",
      },
      {
        title: "定制行业解决方案",
        text: "为印尼汽车、机械与制造业量身定制的弹簧解决方案。",
      },
      {
        title: "值得信赖的国产品质",
        text: "每一支弹簧均经过检验与负载测试，保证性能稳定 — 证明本地产品达到世界级标准。",
      },
    ],
  },
  process: {
    label: "如何制造",
    step: "步骤",
    steps: [
      {
        title: "原材料选线",
        text: "高抗拉碳钢与不锈钢丝经测量后送入生产线 — 这是我们制造每支弹簧的起点。",
        spec: "Ø 0.1 – 50 mm",
      },
      {
        title: "CNC 精密绕簧",
        text: "电脑控制的绕簧机以精确的节距、直径与自由长度成型每支弹簧 — 微米级可重复。",
        spec: "OD 1 – 500 mm",
      },
      {
        title: "去应力与热处理",
        text: "线圈经回火以锁定弹性并抵抗永久变形，使弹簧在负载下拥有长久工作寿命。",
        spec: "回火 · 抗永久变形",
      },
      {
        title: "负载测试与质量控制",
        text: "每批产品出厂前均经过负载测试与尺寸检验 — 证明公差在实际应用中稳定可靠。",
        spec: "± 0.01 mm 已验证",
      },
    ],
  },
  products: {
    label: "我们的产品",
    heading: ["弹簧", "目录"],
    detail: "详情",
    items: [
      {
        name: "压缩弹簧",
        desc: "用于工业机械与汽车系统的高负载弹簧。",
        tag: "压",
      },
      {
        name: "拉伸弹簧",
        desc: "精密设计，为重载应用提供稳定张力。",
        tag: "拉",
      },
      {
        name: "扭转弹簧",
        desc: "为机械与制造提供定制扭矩解决方案。",
        tag: "扭矩",
      },
      {
        name: "线成型",
        desc: "按客户精确规格设计的复杂定制线材造型。",
        tag: "定制",
      },
      {
        name: "锯齿弹簧",
        desc: "耐用的锯齿弹簧，适用于家具座椅 — 持久支撑与弹性。",
        tag: "座椅",
      },
      {
        name: "电池弹簧",
        desc: "为电池仓与电子组件提供可靠电气接触。",
        tag: "接触",
      },
    ],
  },
  capabilities: {
    label: "技术规格",
    heading: ["制造", "能力"],
    caps: ["线径", "弹簧外径", "自由长度", "公差"],
    industriesTitle: "我们服务的行业",
    industries: [
      "汽车",
      "航空航天",
      "医疗器械",
      "电子",
      "国防",
      "石油与天然气",
      "船舶",
      "建筑",
      "农业",
      "铁路",
    ],
  },
  gallery: {
    label: "我们的作品",
    heading: ["弹簧", "图库"],
    description: "展示我们为各行业与应用打造的弹簧的视觉集锦。",
    behindProcess: "工艺幕后",
    productionVideos: "生产视频",
    productionProcess: "生产工艺",
    items: [
      { label: "不锈钢压缩弹簧", tag: "压缩" },
      { label: "标准线圈弹簧 — 通用", tag: "压缩" },
      { label: "钢制拉伸弹簧", tag: "拉伸" },
      { label: "压缩线圈弹簧", tag: "压缩" },
      { label: "电池弹簧", tag: "电池弹簧" },
      { label: "电池弹簧", tag: "电池弹簧" },
      { label: "微型压缩弹簧 — 电子", tag: "压缩" },
      { label: "钢制压缩弹簧", tag: "压缩" },
      { label: "平磨端压缩弹簧", tag: "压缩" },
      { label: "不锈钢线成型", tag: "线成型" },
      { label: "线成型弹簧", tag: "线成型" },
      { label: "不锈钢扭转弹簧", tag: "压缩" },
      { label: "中冷器软管夹", tag: "线成型" },
      { label: "不锈钢压缩弹簧", tag: "压缩" },
      { label: "生产圆线 — 弹簧绕制", tag: "生产" },
    ],
    videos: ["圆线 — 现场生产", "压缩弹簧 — 现场生产"],
  },
  contact: {
    label: "联系我们",
    heading: ["准备好打造", "您的下一支弹簧了吗？"],
    paragraph:
      "把您的图纸、规格或想法发给我们。我们的工程师将在 24 小时内回复详细报价与技术咨询。",
    placeholders: {
      name: "您的姓名",
      company: "公司 / 行业",
      email: "电子邮箱",
      message: "描述您的弹簧需求……",
    },
    button: "请求报价",
    sentTitle: "消息已发送",
    sentText: "我们的团队将在 24 小时内与您联系。",
  },
  footer: {
    rights: "保留所有权利。",
    tagline: "精密 · 可靠 · 创新",
  },
};

export const translations: Record<Lang, Dict> = { en, id, zh };
