"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Plus, ArrowRight, MessageCircle } from "lucide-react"
import Image from "next/image"
import { SectionLabel, GridTexture, Reveal, Action } from "./industrial"
import { useLanguage } from "@/lib/i18n"
import { ORG_PHONE } from "@/lib/seo"

// Category display order, part-code prefix, and photo count. Photos live at
// /katalog/<key>-<n>.jpg; labels come from t.catalog.categories[key].items by index.
const CATEGORIES = [
	{ key: "heavy", prefix: "HD", count: 5 },
	{ key: "compression", prefix: "CP", count: 5 },
	{ key: "conical", prefix: "CN", count: 4 },
	{ key: "extension", prefix: "EX", count: 8 },
	{ key: "torsion", prefix: "TR", count: 5 },
	{ key: "wireform", prefix: "WF", count: 4 },
] as const

type CategoryKey = (typeof CATEGORIES)[number]["key"]
type CatalogItem = { code: string; image: string; label: string; category: CategoryKey }

const WHATSAPP_URL = `https://wa.me/${ORG_PHONE.replace(/\D/g, "")}`

function CatalogCard({
	item,
	index,
	onOpen,
}: {
	item: CatalogItem
	index: number
	onOpen: () => void
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-8% 0px" }}
			transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
			className="h-full">
			<button
				onClick={onOpen}
				aria-label={`${item.code} — ${item.label}`}
				className="group flex h-full w-full flex-col bg-surface text-left transition-colors duration-200 hover:bg-sunk">
				<div className="relative aspect-square overflow-hidden bg-sunk">
					<Image
						src={item.image}
						alt={item.label}
						fill
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
						className="object-cover object-center transition-transform duration-[600ms] group-hover:scale-[1.04]"
					/>
					<span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-ground/0 text-ink opacity-0 transition-all duration-200 group-hover:bg-ground/90 group-hover:opacity-100">
						<Plus size={13} />
					</span>
				</div>
				<div className="flex flex-1 flex-col gap-1.5 border-t border-rule px-3.5 py-3">
					<span className="font-mono text-[0.58rem] tracking-[0.16em] text-navy">{item.code}</span>
					<span className="line-clamp-2 font-display text-[0.86rem] font-semibold leading-[1.35] tracking-[-0.01em] text-ink">
						{item.label}
					</span>
				</div>
			</button>
		</motion.div>
	)
}

export default function KatalogClient() {
	const { t, lang } = useLanguage()
	const c = t.catalog

	const groups = CATEGORIES.map(({ key, prefix, count }) => {
		const copy = c.categories[key]
		const items: CatalogItem[] = Array.from({ length: count }, (_, i) => ({
			code: `${prefix}-${String(i + 1).padStart(2, "0")}`,
			image: `/katalog/${key}-${i + 1}.jpg`,
			label: copy.items[i],
			category: key,
		}))
		return { key, title: copy.title, text: copy.text, items }
	})
	const allItems = groups.flatMap((g) => g.items)

	const [lightbox, setLightbox] = useState<number | null>(null)
	const close = useCallback(() => setLightbox(null), [])
	const step = useCallback(
		(dir: 1 | -1) =>
			setLightbox((i) => (i === null ? i : (i + dir + allItems.length) % allItems.length)),
		[allItems.length],
	)

	// Keyboard navigation + scroll lock while the lightbox is open.
	useEffect(() => {
		if (lightbox === null) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") close()
			else if (e.key === "ArrowRight") step(1)
			else if (e.key === "ArrowLeft") step(-1)
		}
		const prevOverflow = document.body.style.overflow
		document.body.style.overflow = "hidden"
		window.addEventListener("keydown", onKey)
		return () => {
			document.body.style.overflow = prevOverflow
			window.removeEventListener("keydown", onKey)
		}
	}, [lightbox, close, step])

	const current = lightbox === null ? null : allItems[lightbox]

	return (
		<>
			{/* ── Header ── */}
			<section id="katalog" className="relative overflow-hidden px-6 pb-16 pt-[132px] lg:px-10 lg:pb-20 lg:pt-[150px]">
				<GridTexture opacity={0.6} />
				<div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
					<Reveal>
						<SectionLabel label={c.label} className="mb-6" />
						<h1 className="font-display text-[clamp(2.4rem,5.2vw,4.2rem)] font-bold uppercase leading-[0.98] tracking-[-0.03em] text-ink">
							{c.heading[0]} <span className="text-navy">{c.heading[1]}</span>
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
					<span className="hidden shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint sm:block">
						{c.typesLabel}
					</span>
					{groups.map((g) => (
						<a
							key={g.key}
							href={`#${g.key}`}
							className="group flex shrink-0 items-baseline gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-navy">
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
									<h2 className="font-display text-[clamp(1.35rem,2.4vw,1.8rem)] font-bold uppercase leading-none tracking-[-0.02em] text-ink">
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
						<h2 className="font-display text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold uppercase leading-[1.05] tracking-[-0.022em] text-ink">
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

			{/* ── Lightbox ── */}
			<AnimatePresence>
				{current && lightbox !== null && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={close}
						role="dialog"
						aria-modal="true"
						aria-label={current.label}
						className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm sm:p-6">
						<motion.div
							initial={{ scale: 0.96, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.96, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden border border-rule bg-surface shadow-plate-lift">
							<div className="relative h-[68vh] w-full bg-sunk">
								<Image
									key={current.image}
									src={current.image}
									alt={current.label}
									fill
									sizes="(max-width: 768px) 100vw, 768px"
									className="object-contain"
								/>
								<button
									onClick={() => step(-1)}
									aria-label={c.prev}
									className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-rule bg-surface/90 transition-colors hover:border-navy">
									<ChevronLeft size={18} className="text-ink" />
								</button>
								<button
									onClick={() => step(1)}
									aria-label={c.next}
									className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-rule bg-surface/90 transition-colors hover:border-navy">
									<ChevronRight size={18} className="text-ink" />
								</button>
							</div>

							<div className="flex items-center justify-between gap-4 border-t border-rule px-5 py-4 sm:px-6">
								<div className="min-w-0">
									<span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-navy">
										{current.code} · {c.categories[current.category].title}
									</span>
									<p className="font-display text-[0.98rem] font-semibold text-ink">{current.label}</p>
								</div>
								<span className="shrink-0 font-mono text-sm text-ink-faint">
									{lightbox + 1} / {allItems.length}
								</span>
							</div>

							<button
								onClick={close}
								aria-label={c.close}
								className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-rule bg-surface transition-colors hover:border-navy">
								<X size={17} className="text-ink" />
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}
