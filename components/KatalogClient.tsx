"use client"

import { useState } from "react"
import { ArrowRight, MessageCircle } from "lucide-react"
import Image from "next/image"
import { SectionLabel, GridTexture, Reveal, Action } from "./industrial"
import { CatalogCard, CatalogLightbox } from "./CatalogGrid"
import { useLanguage } from "@/lib/i18n"
import { buildCatalog } from "@/lib/catalog"
import { ORG_PHONE } from "@/lib/seo"

const WHATSAPP_URL = `https://wa.me/${ORG_PHONE.replace(/\D/g, "")}`

export default function KatalogClient() {
	const { t, lang } = useLanguage()
	const c = t.catalog
	const groups = buildCatalog(c)
	const allItems = groups.flatMap((g) => g.items)
	const [lightbox, setLightbox] = useState<number | null>(null)

	return (
		<>
			{/* ── Header ── */}
			<section id="katalog" className="relative overflow-hidden px-6 pb-16 pt-[132px] lg:px-10 lg:pb-20 lg:pt-[150px]">
				<GridTexture opacity={0.6} />
				<div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
					<Reveal>
						<SectionLabel label={c.label} className="mb-6" />
						<h1 className="font-condensed font-display text-[clamp(2.8rem,6.4vw,5.2rem)] font-extrabold leading-[0.95] tracking-[-0.02em] text-ink">
							{c.heading[0]} {c.heading[1]}
						</h1>
						<p className="mt-6 max-w-[52ch] font-body text-[1rem] leading-[1.75] text-ink-soft">{c.intro}</p>
						<p className="mt-4 max-w-[52ch] border-l-2 border-navy pl-4 font-body text-[0.84rem] leading-[1.65] text-ink-faint">
							{c.note}
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Action href={`/${lang}#contact`}>
								{c.ctaButton} <ArrowRight size={14} />
							</Action>
							<Action href={WHATSAPP_URL} variant="ghost">
								<MessageCircle size={14} /> {c.ctaWhatsapp}
							</Action>
						</div>
					</Reveal>

					<Reveal delay={0.1}>
						<div className="grid grid-cols-2 gap-3">
							{["/katalog/cover-1.jpg", "/katalog/cover-2.jpg"].map((src, i) => (
								<div
									key={src}
									className={`relative aspect-[9/16] overflow-hidden border border-rule bg-sunk shadow-plate ${
										i === 1 ? "translate-y-8" : ""
									}`}>
									<Image
										src={src}
										alt={c.label}
										fill
										priority
										sizes="(max-width: 1024px) 50vw, 22vw"
										className="object-cover"
									/>
								</div>
							))}
						</div>
					</Reveal>
				</div>
			</section>

			{/* ── Category index (sticky under the navbar) ── */}
			<div className="sticky top-[69px] z-30 border-y border-rule bg-ground/90 backdrop-blur-md">
				<div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 py-3 [scrollbar-width:none] lg:px-10 [&::-webkit-scrollbar]:hidden">
					<span className="hidden shrink-0 font-display text-[0.85rem] font-semibold text-ink-faint sm:block">
						{c.typesLabel}
					</span>
					{groups.map((g) => (
						<a
							key={g.key}
							href={`#${g.key}`}
							className="group flex shrink-0 items-baseline gap-1.5 font-display text-[0.88rem] font-medium text-ink-soft transition-colors hover:text-navy">
							{g.title}
							<span className="text-[0.6rem] text-ink-faint group-hover:text-navy">
								{String(g.items.length).padStart(2, "0")}
							</span>
						</a>
					))}
				</div>
			</div>

			{/* ── Categories ── */}
			<section className="relative border-b border-rule bg-surface px-6 py-16 lg:px-10 lg:py-24">
				<div className="mx-auto max-w-7xl space-y-20">
					{groups.map((g) => (
						<div key={g.key} id={g.key} className="scroll-mt-[140px]">
							<Reveal className="mb-6 flex flex-col justify-between gap-3 border-b border-rule pb-4 sm:flex-row sm:items-end">
								<div className="flex items-baseline gap-4">
									<h2 className="font-condensed font-display text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold leading-none tracking-[-0.015em] text-ink">
										{g.title}
									</h2>
									<span className="font-mono text-[0.64rem] tracking-[0.14em] text-ink-faint">
										{String(g.items.length).padStart(2, "0")} {c.itemsUnit}
									</span>
								</div>
								<p className="max-w-[46ch] font-body text-[0.88rem] leading-[1.65] text-ink-soft">{g.text}</p>
							</Reveal>

							<div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-4">
								{g.items.map((item, i) => (
									<CatalogCard
										key={item.code}
										item={item}
										index={i}
										onOpen={() => setLightbox(allItems.indexOf(item))}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="relative overflow-hidden bg-sunk px-6 py-20 lg:px-10">
				<GridTexture fade={false} opacity={0.45} />
				<Reveal className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
					<div>
						<h2 className="font-condensed font-display text-[clamp(2rem,3.8vw,3.2rem)] font-extrabold leading-[1] tracking-[-0.02em] text-ink">
							{c.ctaTitle}
						</h2>
						<p className="mt-4 max-w-[56ch] font-body text-[0.95rem] leading-[1.7] text-ink-soft">{c.ctaText}</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Action href={`/${lang}#contact`}>
							{c.ctaButton} <ArrowRight size={14} />
						</Action>
						<Action href={WHATSAPP_URL} variant="ghost">
							<MessageCircle size={14} /> {c.ctaWhatsapp}
						</Action>
					</div>
				</Reveal>
			</section>

			<CatalogLightbox items={allItems} index={lightbox} onChange={setLightbox} labels={c} />
		</>
	)
}
