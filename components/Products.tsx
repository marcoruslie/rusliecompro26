"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal, SectionLabel, Action } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { buildCatalog, SPRING_TYPE_KEYS } from "@/lib/catalog";
import { useScrollStage } from "@/lib/scrollStage";

/* One card per spring type, each opening that type's section of the catalog.
   The cover photo is the first catalog photo of the type. */
export default function Products() {
  const { t, lang } = useLanguage();
  const types = buildCatalog(t.catalog).filter((g) =>
    (SPRING_TYPE_KEYS as readonly string[]).includes(g.key),
  );
  const ref = useRef<HTMLElement>(null);
  const { stageEnabled } = useScrollStage();

  return (
    <section
      id="products"
      ref={ref}
      className={`relative border-t border-rule bg-ground px-6 lg:px-10 ${
        stageEnabled ? "h-screen py-20" : "py-[120px]"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <SectionLabel label={t.products.label} className="mb-5" />
            <h2 className="font-condensed font-display text-[clamp(2.3rem,4.6vw,3.9rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink">
              {t.products.heading[0]} {t.products.heading[1]}
            </h2>
          </div>
          <p className="max-w-[46ch] font-body text-[1rem] leading-[1.75] text-ink-soft">
            {t.products.intro}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((g, i) => (
            <Reveal key={g.key} delay={Math.min(i, 5) * 0.05} className="h-full">
              <Link
                href={`/${lang}/katalog#${g.key}`}
                className="group flex h-full flex-col overflow-hidden rounded-plate border border-rule bg-surface transition-colors duration-200 hover:border-navy"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-sunk">
                  <Image
                    src={g.items[0].image}
                    alt={g.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                  <h3 className="mb-2 font-display text-[1.2rem] font-bold tracking-[-0.012em] text-ink">
                    {g.title}
                  </h3>
                  <p className="mb-6 font-body text-[0.9rem] leading-[1.7] text-ink-soft">{g.text}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-rule pt-4">
                    <span className="font-body text-[0.85rem] text-ink-faint">
                      {g.items.length} {t.catalog.itemsUnit}
                    </span>
                    <ArrowRight
                      size={18}
                      className="text-navy transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Action href={`/${lang}/katalog`}>
            {t.catalog.viewFull} <ArrowRight size={16} />
          </Action>
        </div>
      </div>
    </section>
  );
}
