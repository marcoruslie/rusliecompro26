"use client";

import { useEffect, useState } from "react";
import { lookups, errMsg, type Acc, type Cus, type Inv, type Pekerja, type Sup } from "./data";
import type { PickItem } from "@/components/tka/Picker";
import { fmtNum } from "./format";

export type LookupKind = "acc" | "cus" | "sup" | "inv" | "pekerja";

export type Lookups = {
  ready: boolean;
  error: string;
  acc: PickItem[];
  cus: PickItem[];
  sup: PickItem[];
  inv: PickItem[];
  pekerja: PickItem[];
  accMap: Map<string, Acc>;
  cusMap: Map<string, Cus>;
  supMap: Map<string, Sup>;
  invMap: Map<string, Inv>; // key gol|inv
  pekerjaMap: Map<string, Pekerja>;
};

const EMPTY: Lookups = {
  ready: false,
  error: "",
  acc: [], cus: [], sup: [], inv: [], pekerja: [],
  accMap: new Map(), cusMap: new Map(), supMap: new Map(), invMap: new Map(), pekerjaMap: new Map(),
};

export const invKey = (gol: string, inv: string) => `${gol}|${inv}`;

export function useLookups(kinds: LookupKind[]): Lookups {
  const [state, setState] = useState<Lookups>(EMPTY);
  const sig = kinds.slice().sort().join(",");

  useEffect(() => {
    let alive = true;
    const want = new Set(sig.split(","));
    Promise.all([
      want.has("acc") ? lookups.acc() : Promise.resolve([] as Acc[]),
      want.has("cus") ? lookups.cus() : Promise.resolve([] as Cus[]),
      want.has("sup") ? lookups.sup() : Promise.resolve([] as Sup[]),
      want.has("inv") ? lookups.inv() : Promise.resolve([] as Inv[]),
      want.has("pekerja") ? lookups.pekerja() : Promise.resolve([] as Pekerja[]),
    ])
      .then(([acc, cus, sup, inv, pekerja]) => {
        if (!alive) return;
        setState({
          ready: true,
          error: "",
          acc: acc.filter((a) => a.detil !== "I").map((a) => ({ value: a.acc, label: a.name })),
          cus: cus.map((c) => ({ value: c.cus, label: c.name, hint: c.city })),
          sup: sup.map((s) => ({ value: s.sup, label: s.name, hint: s.city })),
          inv: inv.map((i) => ({
            value: invKey(i.gol, i.inv),
            label: i.name,
            hint: `${i.gol} · ${i.unit}${i.price ? ` · ${fmtNum(i.price)}` : ""}`,
          })),
          pekerja: pekerja.map((p) => ({ value: p.tka, label: p.name, hint: p.bagian })),
          accMap: new Map(acc.map((a) => [a.acc, a])),
          cusMap: new Map(cus.map((c) => [c.cus, c])),
          supMap: new Map(sup.map((s) => [s.sup, s])),
          invMap: new Map(inv.map((i) => [invKey(i.gol, i.inv), i])),
          pekerjaMap: new Map(pekerja.map((p) => [p.tka, p])),
        });
      })
      .catch((e) => alive && setState({ ...EMPTY, ready: true, error: errMsg(e) }));
    return () => {
      alive = false;
    };
  }, [sig]);

  return state;
}
