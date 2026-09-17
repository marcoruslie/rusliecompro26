// Catalog photo registry, shared by the /katalog page and the homepage Gallery.
// Photos live at /katalog/<key>-<n>.jpg; labels come from
// t.catalog.categories[key].items by index.

import type { Dict } from "./translations";

export const CATALOG_CATEGORIES = [
  { key: "heavy", prefix: "HD", count: 5 },
  { key: "compression", prefix: "CP", count: 5 },
  { key: "conical", prefix: "CN", count: 4 },
  { key: "extension", prefix: "EX", count: 8 },
  { key: "torsion", prefix: "TR", count: 5 },
  { key: "wireform", prefix: "WF", count: 4 },
] as const;

export type CategoryKey = (typeof CATALOG_CATEGORIES)[number]["key"];

export type CatalogItem = {
  /** Part code a buyer quotes back in an enquiry, e.g. "EX-03". */
  code: string;
  image: string;
  label: string;
  category: CategoryKey;
  categoryTitle: string;
};

export type CatalogGroup = {
  key: CategoryKey;
  title: string;
  text: string;
  items: CatalogItem[];
};

export function buildCatalog(c: Dict["catalog"]): CatalogGroup[] {
  return CATALOG_CATEGORIES.map(({ key, prefix, count }) => {
    const copy = c.categories[key];
    const items = Array.from({ length: count }, (_, i) => ({
      code: `${prefix}-${String(i + 1).padStart(2, "0")}`,
      image: `/katalog/${key}-${i + 1}.jpg`,
      label: copy.items[i],
      category: key,
      categoryTitle: copy.title,
    }));
    return { key, title: copy.title, text: copy.text, items };
  });
}
