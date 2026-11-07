// Master tables of the TKA module (legacy "Master" menus). Drives the generic master editor.

export type MasterField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "acc";
  options?: { value: string; label: string }[];
  list?: boolean; // show as a column in the list
  required?: boolean;
  span?: 1 | 2;
};

export type MasterConfig = {
  key: string;
  title: string;
  table: string;
  pk: string[];
  order: string[];
  fields: MasterField[];
  lookupKey: "acc" | "cus" | "sup" | "inv" | "pekerja" | "gol" | null; // cache to invalidate after edits
};

const ADDRESS: MasterField[] = [
  { key: "address1", label: "Alamat 1", span: 2 },
  { key: "address2", label: "Alamat 2", span: 2 },
  { key: "address3", label: "Alamat 3" },
  { key: "address4", label: "Alamat 4" },
];

export const MASTERS: MasterConfig[] = [
  {
    key: "akun",
    title: "Daftar Akun",
    table: "tka_acc",
    pk: ["acc"],
    order: ["acc"],
    lookupKey: "acc",
    fields: [
      { key: "acc", label: "Kode Akun", list: true, required: true },
      { key: "name", label: "Nama Akun", list: true, required: true, span: 2 },
      {
        key: "accgroup",
        label: "Kelompok",
        type: "select",
        list: true,
        options: [
          { value: "1", label: "1 Aktiva" },
          { value: "2", label: "2 Hutang" },
          { value: "3", label: "3 Modal" },
          { value: "4", label: "4 Penjualan" },
          { value: "5", label: "5 HPP & Biaya" },
          { value: "6", label: "6 Pendapatan Lain" },
          { value: "7", label: "7 Biaya Lain" },
        ],
      },
      { key: "accinduk", label: "Akun Induk", type: "acc", list: true },
      { key: "detil", label: "Jenis", type: "select", list: true, options: [{ value: "D", label: "Detail" }, { value: "I", label: "Induk" }] },
      { key: "level", label: "Level", type: "number" },
      { key: "dk", label: "Saldo Normal", type: "select", options: [{ value: "D", label: "Debet" }, { value: "K", label: "Kredit" }] },
    ],
  },
  {
    key: "customer",
    title: "Customer",
    table: "tka_cus",
    pk: ["cus"],
    order: ["name"],
    lookupKey: "cus",
    fields: [
      { key: "cus", label: "Kode", list: true, required: true },
      { key: "name", label: "Nama", list: true, required: true, span: 2 },
      { key: "cusg", label: "Grup" , list: true },
      { key: "acc", label: "Akun Piutang", type: "acc", list: true },
      ...ADDRESS,
      { key: "city", label: "Kota", list: true },
      { key: "telp", label: "Telp", list: true },
      { key: "fax", label: "Fax" },
      { key: "npwp", label: "NPWP" },
      { key: "rem1", label: "Catatan 1", span: 2 },
      { key: "rem2", label: "Catatan 2", span: 2 },
    ],
  },
  {
    key: "grup-customer",
    title: "Grup Customer",
    table: "tka_cusg",
    pk: ["cusg"],
    order: ["cusg"],
    lookupKey: null,
    fields: [
      { key: "cusg", label: "Kode", list: true, required: true },
      { key: "name", label: "Nama", list: true, span: 2 },
      { key: "acc", label: "Akun Piutang", type: "acc", list: true },
    ],
  },
  {
    key: "supplier",
    title: "Supplier",
    table: "tka_sup",
    pk: ["sup"],
    order: ["name"],
    lookupKey: "sup",
    fields: [
      { key: "sup", label: "Kode", list: true, required: true },
      { key: "name", label: "Nama", list: true, required: true, span: 2 },
      { key: "acc", label: "Akun Hutang", type: "acc", list: true },
      ...ADDRESS,
      { key: "city", label: "Kota", list: true },
      { key: "telp", label: "Telp", list: true },
      { key: "fax", label: "Fax" },
      { key: "npwp", label: "NPWP" },
    ],
  },
  {
    key: "barang",
    title: "Master Persediaan",
    table: "tka_inv",
    pk: ["gol", "inv"],
    order: ["gol", "inv"],
    lookupKey: "inv",
    fields: [
      { key: "gol", label: "Golongan", list: true, required: true },
      { key: "inv", label: "Kode Barang", list: true, required: true },
      { key: "name", label: "Nama Barang", list: true, required: true, span: 2 },
      { key: "unit", label: "Satuan", list: true },
      { key: "price", label: "Harga Jual", type: "number", list: true },
      { key: "pricebl", label: "Harga Beli", type: "number" },
      { key: "hppmin", label: "HPP Standar", type: "number", list: true },
      { key: "ongkos", label: "Ongkos/Pcs", type: "number" },
      { key: "ongkos1", label: "Premi/Pcs", type: "number" },
      { key: "berat", label: "Berat", type: "number" },
      { key: "dmeter", label: "Diameter", type: "number" },
      { key: "golb", label: "Gol. Bahan" },
      { key: "invb", label: "Kode Bahan" },
      { key: "nogudang", label: "No. Gudang" },
      { key: "nameid", label: "Nama Singkat" },
      { key: "sub", label: "Customer/Supplier" },
      { key: "loc", label: "Lokasi" },
      { key: "price1", label: "Harga 2", type: "number" },
      { key: "price2", label: "Harga 3", type: "number" },
      { key: "unit1", label: "Satuan 2" },
      { key: "konver1", label: "Konversi 2", type: "number" },
      { key: "rem", label: "Catatan", span: 2 },
      { key: "rem2", label: "Catatan 2", span: 2 },
    ],
  },
  {
    key: "golongan",
    title: "Golongan Barang",
    table: "tka_gol",
    pk: ["gol"],
    order: ["gol"],
    lookupKey: "gol",
    fields: [
      { key: "gol", label: "Kode", list: true, required: true },
      { key: "name", label: "Nama", list: true, span: 2 },
      { key: "id", label: "Jenis", type: "select", list: true, options: [{ value: "F", label: "Barang Jadi" }, { value: "R", label: "Bahan Baku" }] },
    ],
  },
  {
    key: "pekerja",
    title: "Pekerja (TKA)",
    table: "tka_pekerja",
    pk: ["tka"],
    order: ["name"],
    lookupKey: "pekerja",
    fields: [
      { key: "tka", label: "Kode", list: true, required: true },
      { key: "name", label: "Nama", list: true, required: true, span: 2 },
      { key: "bagian", label: "Bagian", list: true },
      { key: "acc_biaya", label: "Akun Upah", type: "acc", list: true },
      { key: "accpiut", label: "Akun Piutang Karyawan", type: "acc" },
      { key: "acc", label: "Kode Lama" },
      ...ADDRESS,
      { key: "city", label: "Kota", list: true },
      { key: "telp", label: "Telp" },
      { key: "idcard", label: "No. KTP" },
      { key: "tgl_masuk", label: "Tgl Masuk", type: "date" },
      { key: "birtdate", label: "Tgl Lahir", type: "date" },
    ],
  },
  {
    key: "lokasi",
    title: "Lokasi Gudang",
    table: "tka_loc",
    pk: ["loc"],
    order: ["loc"],
    lookupKey: null,
    fields: [
      { key: "loc", label: "Kode", list: true, required: true },
      { key: "name", label: "Nama", list: true, span: 2 },
    ],
  },
  {
    key: "bank",
    title: "Rekening Bank",
    table: "tka_bank",
    pk: ["id"],
    order: ["bank"],
    lookupKey: null,
    fields: [
      { key: "bank", label: "Bank", list: true, required: true },
      { key: "norek", label: "No. Rekening", list: true },
      { key: "capem", label: "Cabang", list: true, span: 2 },
    ],
  },
];

export const MASTER_BY_KEY: Record<string, MasterConfig> = Object.fromEntries(MASTERS.map((m) => [m.key, m]));
