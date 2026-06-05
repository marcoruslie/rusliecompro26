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
