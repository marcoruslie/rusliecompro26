"use client"

import { useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Play, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import Link from "next/link"
import { SectionLabel } from "./industrial"
import { CatalogCard, CatalogLightbox } from "./CatalogGrid"
import { useLanguage } from "@/lib/i18n"
import { buildCatalog } from "@/lib/catalog"
import { useSectionScrub, usePanY, useScrollStage } from "@/lib/scrollStage"

// The homepage shows one row per spring type; the full set lives on /[locale]/katalog.
const PREVIEW_PER_CATEGORY = 4

const VIDEO_SRCS = ["/spring/Mesin1Vid.mp4", "/spring/Mesin2Vid.mp4"]

export default function Gallery() {
	const { t, lang } = useLanguage()
	const catalog = buildCatalog(t.catalog).map((g) => ({
		...g,
		total: g.items.length,
		items: g.items.slice(0, PREVIEW_PER_CATEGORY),
	}))
	// Lightbox steps through the previewed photos only.
	const previewItems = catalog.flatMap((g) => g.items)

	const videoItems = VIDEO_SRCS.map((src, i) => ({
		src,
		label: t.gallery.videos[i],
	}))
	const [topIndex, setTopIndex] = useState(0)
	const total = videoItems.length
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

	const cycleNext = () => {
		videoRefs.current.forEach((v) => {
			if (v) {
				v.pause()
				v.currentTime = 0
			}
		})
		setTopIndex((p) => (p + 1) % total)
	}
	const cyclePrev = () => {
		videoRefs.current.forEach((v) => {
			if (v) {
				v.pause()
				v.currentTime = 0
			}
		})
		setTopIndex((p) => (p - 1 + total) % total)
	}
	const ref = useRef<HTMLElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const { stageEnabled } = useScrollStage()
	const progress = useSectionScrub("gallery", ref)
	const panY = usePanY(progress, contentRef, stageEnabled)
	const inView = useInView(ref, { once: true, margin: "-80px" })
	const [lightbox, setLightbox] = useState<number | null>(null)

	return (
		<section
			id="gallery"
			ref={ref}
			className={`relative overflow-hidden border-t border-rule bg-surface px-6 lg:px-10 ${
				stageEnabled ? "h-screen py-20" : "py-[110px]"
			}`}>
			<motion.div ref={contentRef} style={{ y: panY }} className="relative mx-auto max-w-7xl">
				{/* ── Header ── */}
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={inView ? { opacity: 1, y: 0 } : undefined}
					transition={{ duration: 0.55 }}
					className="mb-12">
					<SectionLabel label={t.gallery.label} className="mb-6" />
					<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
						<h2 className="font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-bold uppercase tracking-[-0.022em] text-ink">
							{t.gallery.heading[0]}{" "}
							<span className="text-navy">{t.gallery.heading[1]}</span>
						</h2>
						<div className="flex max-w-[38ch] flex-col items-start gap-4">
							<p className="font-body text-[0.88rem] leading-[1.7] text-ink-soft">
								{t.gallery.description}
							</p>
							<Link
								href={`/${lang}/katalog`}
								className="group inline-flex items-center gap-2 border-b border-navy pb-1 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-navy">
								{t.catalog.viewFull}
								<ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
							</Link>
						</div>
					</div>
				</motion.div>

				{/* ── Catalog sections (one per category) ── */}
				<div className="space-y-14">
					{catalog.map((group) => (
						<motion.div
							key={group.key}
							initial={{ opacity: 0, y: 18 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-12% 0px" }}
							transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
							{/* Category header — the count is the useful fact, not an ornament */}
							<div className="mb-6 flex items-baseline gap-4 border-b border-rule pb-3">
								<h3 className="font-display text-[1.15rem] font-bold uppercase leading-none tracking-[-0.015em] text-ink">
									{group.title}
								</h3>
								<span className="font-mono text-[0.64rem] tracking-[0.14em] text-ink-faint">
									{String(group.total).padStart(2, "0")} {t.catalog.itemsUnit}
								</span>
							</div>

							{/* Uniform card grid, drawn as one ruled block */}
							<div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-4">
								{group.items.map((item, i) => (
									<CatalogCard
										key={item.code}
										item={item}
										index={i}
										onOpen={() => setLightbox(previewItems.indexOf(item))}
									/>
								))}
							</div>
						</motion.div>
					))}
				</div>

				{/* ── Production videos ── */}
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={inView ? { opacity: 1, y: 0 } : undefined}
					transition={{ duration: 0.6, delay: 0.25 }}
					className="mt-20">
					<div className="mb-8 flex items-baseline gap-4 border-b border-rule pb-3">
						<h3 className="font-display text-[1.15rem] font-bold uppercase leading-none tracking-[-0.015em] text-ink">
							{t.gallery.productionVideos}
						</h3>
						<span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-ink-faint">
							{t.gallery.behindProcess}
						</span>
					</div>

					<div className="flex flex-col items-center gap-6">
						<div
							className="relative"
							style={{ width: "min(360px, 100%)", height: "min(64vh, 640px)" }}>
							{videoItems.map((vid, i) => {
								const offset = (((i - topIndex) % total) + total) % total
								const isActive = offset === 0

								return (
									<motion.div
										key={i}
										animate={{
											x: isActive ? 0 : offset * 16,
											y: isActive ? 0 : offset * 8,
											scale: isActive ? 1 : 1 - offset * 0.04,
										}}
										transition={{ type: "spring", stiffness: 280, damping: 26 }}
										onClick={() => !isActive && setTopIndex(i)}
										className="absolute inset-0 overflow-hidden border shadow-plate"
										style={{
											zIndex: total - offset,
											borderColor: isActive ? "#021d47" : "#dcd9d3",
											cursor: isActive ? "default" : "pointer",
										}}>
										{!isActive && (
											<div className="absolute inset-0 z-10 flex items-center justify-center bg-ground/70">
												<Play size={20} className="translate-x-[1px] text-navy" />
											</div>
										)}

										<video
											ref={(el) => {
												videoRefs.current[i] = el
											}}
											src={vid.src}
											className="h-full w-full object-cover"
											style={{ pointerEvents: isActive ? "auto" : "none" }}
											controls={isActive}
											playsInline
											preload="metadata"
											loop
											onCanPlay={(e) => {
												if (isActive) (e.target as HTMLVideoElement).play()
											}}
										/>
									</motion.div>
								)
							})}
						</div>

						{/* Controls */}
						<div className="flex items-center gap-4">
							<button
								onClick={cyclePrev}
								aria-label="Previous video"
								className="flex h-9 w-9 items-center justify-center rounded-plate border border-rule bg-surface transition-colors hover:border-navy">
								<ChevronLeft size={17} className="text-ink" />
							</button>

							<div className="flex items-center gap-2">
								{videoItems.map((_, i) => (
									<button
										key={i}
										onClick={() => setTopIndex(i)}
										aria-label={`Video ${i + 1}`}
										className="h-1.5 transition-all duration-300"
										style={{
											width: i === topIndex ? 22 : 8,
											background: i === topIndex ? "#021d47" : "#dcd9d3",
										}}
									/>
								))}
							</div>

							<button
								onClick={cycleNext}
								aria-label="Next video"
								className="flex h-9 w-9 items-center justify-center rounded-plate border border-rule bg-surface transition-colors hover:border-navy">
								<ChevronRight size={17} className="text-ink" />
							</button>
						</div>

						<div className="text-center">
							<span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint">
								{t.gallery.productionProcess} · {topIndex + 1} / {total}
							</span>
							<span className="font-display text-[0.98rem] font-semibold text-ink">
								{videoItems[topIndex].label}
							</span>
						</div>
					</div>
				</motion.div>
			</motion.div>

			<CatalogLightbox
				items={previewItems}
				index={lightbox}
				onChange={setLightbox}
				labels={t.catalog}
			/>
		</section>
	)
}
