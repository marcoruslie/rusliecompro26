import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Acc = { acc: string; name: string; accgroup: number; accinduk: string; detil: string; level: number; dk: string };
export type Cus = { cus: string; name: string; acc: string; city: string; address1: string; address2: string; address3: string; address4: string; telp: string; cusg: string; npwp: string };
export type Sup = { sup: string; name: string; acc: string; city: string; address1: string; address2: string; telp: string };
export type Inv = { gol: string; inv: string; name: string; unit: string; price: number; pricebl: number; hppmin: number; ongkos: number; ongkos1: number; nogudang: string; berat: number; dmeter: number; golb: string; invb: string; sub: string };
export type Pekerja = { tka: string; name: string; acc: string; accpiut: string; acc_biaya: string; bagian: string };
export type Gol = { gol: string; name: string; id: string };
export type Setting = Record<string, string> & { company_name: string; company_address: string };

export type Doc = {
  id: number;
  jnl: string;
  tahun: number;
  nomor: string;
  tanggal: string;
  sub: string;
  subname: string;
  total: number;
  rem: string;
  h: Record<string, unknown>;
  legacy: boolean;
  chuser: string;
};

export type DocLine = {
  id?: number;
  urut?: number;
  acc: string;
  gol: string;
  inv: string;
  invname: string;
  qty: number;
  unit: string;
  price: number;
  val: number;
  dk: string;
  nota: string;
  jnlno: string;
  tka: string;
  rem: string;
  d: Record<string, unknown>;
};

let browser: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!browser) browser = createClient();
  return browser;
}

/** PostgREST caps responses at 1000 rows; page through everything. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

export async function rpcAll<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  return fetchAll<T>((from, to) => db().rpc(fn, args).range(from, to) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>);
}

// Master lookups, cached per page load (invalidated after master edits).
const cache = new Map<string, Promise<unknown[]>>();

function cached<T>(key: string, load: () => Promise<T[]>): Promise<T[]> {
  if (!cache.has(key)) cache.set(key, load().catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key) as Promise<T[]>;
}

export function invalidateLookups(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

export const lookups = {
  acc: () => cached<Acc>("acc", () => fetchAll<Acc>((a, b) => db().from("tka_acc").select("acc,name,accgroup,accinduk,detil,level,dk").order("acc").range(a, b))),
  cus: () => cached<Cus>("cus", () => fetchAll<Cus>((a, b) => db().from("tka_cus").select("cus,name,acc,city,address1,address2,address3,address4,telp,cusg,npwp").order("name").range(a, b))),
  sup: () => cached<Sup>("sup", () => fetchAll<Sup>((a, b) => db().from("tka_sup").select("sup,name,acc,city,address1,address2,telp").order("name").range(a, b))),
  inv: () => cached<Inv>("inv", () => fetchAll<Inv>((a, b) => db().from("tka_inv").select("gol,inv,name,unit,price,pricebl,hppmin,ongkos,ongkos1,nogudang,berat,dmeter,golb,invb,sub").order("gol").order("inv").range(a, b))),
  pekerja: () => cached<Pekerja>("pekerja", () => fetchAll<Pekerja>((a, b) => db().from("tka_pekerja").select("tka,name,acc,accpiut,acc_biaya,bagian").order("name").range(a, b))),
  gol: () => cached<Gol>("gol", () => fetchAll<Gol>((a, b) => db().from("tka_gol").select("gol,name,id").order("gol").range(a, b))),
  setting: async (): Promise<Setting> => {
    const { data, error } = await db().from("tka_setting").select("*").eq("id", 1).single();
    if (error) throw new Error(error.message);
    return data as Setting;
  },
  tahun: async (): Promise<number[]> => {
    const { data, error } = await db().rpc("tka_tahun_list");
    if (error) throw new Error(error.message);
    const ys = ((data ?? []) as { tahun: number }[]).map((r) => r.tahun);
    const now = new Date().getFullYear();
    if (!ys.includes(now)) ys.unshift(now);
    return ys.sort((a, b) => b - a);
  },
};

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
