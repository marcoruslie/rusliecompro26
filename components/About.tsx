"use client";

import { useRef } from "react";
import Image from "next/image";
import { Factory, MapPin, Cog, ShieldCheck } from "lucide-react";
import { Reveal, SectionLabel } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { useScrollStage } from "@/lib/scrollStage";

const FEATURE_ICONS = [Factory, MapPin, Cog, ShieldCheck];

export default function About() {
  const { t } = useLanguage();
  const features = FEATURE_ICONS.map((icon, i) => ({
    icon,
    title: t.about.features[i].title,
    text: t.about.features[i].text,
  }));
  const ref = useRef<HTMLElement>(null);
  const { stageEnabled } = useScrollStage();

  return (
    <section
      id="about"
      ref={ref}
      className={`relative bg-surface px-6 lg:px-10 ${
        stageEnabled ? "flex h-screen items-center py-20" : "py-[120px]"
      }`}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* Left — the shop floor, as it actually looks */}
        <Reveal>
          <figure>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-plate bg-sunk">
              <Image
                src="/spring/Mesin1.jpg"
                alt={t.about.photoCaption}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 border-l-[3px] border-navy pl-3 font-body text-[0.85rem] leading-[1.6] text-ink-soft">
              {t.about.photoCaption}
            </figcaption>
          </figure>
        </Reveal>

        {/* Right — who we are */}
        <div>
          <Reveal>
            <SectionLabel label={t.about.label} className="mb-5" />
            <h2 className="font-condensed mb-8 font-display text-[clamp(2.3rem,4.6vw,3.9rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink">
              {t.about.heading[0]} {t.about.heading[1]}
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mb-5 max-w-[60ch] font-body text-[1.05rem] leading-[1.8] text-ink">
              {t.about.p1}
            </p>
            <p className="mb-12 max-w-[60ch] font-body text-[1rem] leading-[1.8] text-ink-soft">
              {t.about.p2}
            </p>
          </Reveal>

          {/* Features — one ruled 2×2 block */}
          <div className="grid grid-cols-1 border-t border-rule sm:grid-cols-2">
            {features.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal
                  key={item.title}
                  delay={0.1 + i * 0.06}
                  className={`border-b border-rule py-7 sm:pr-8 ${
                    i % 2 === 1 ? "sm:border-l sm:pl-8 sm:pr-0" : ""
                  }`}
                >
                  <Icon size={22} strokeWidth={1.6} className="mb-4 text-navy" />
                  <h3 className="mb-2 font-display text-[1.05rem] font-bold tracking-[-0.01em] text-ink">
                    {item.title}
                  </h3>
                  <p className="font-body text-[0.9rem] leading-[1.7] text-ink-soft">{item.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
