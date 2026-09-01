"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { X, Play, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Image from "next/image"
import { SectionLabel } from "./industrial"
import { useLanguage } from "@/lib/i18n"
import { useSectionScrub, usePanY, useScrollStage } from "@/lib/scrollStage"

// Image paths only; label/tag come from the translation dictionary by index.
const GALLERY_IMAGES = [
	"/spring/gallery1.jpg",
	"/spring/item1.jpg",
	"/spring/gallery2.jpg",
	"/spring/gallery4.jpg",
	"/spring/gallery3.jpg",
	"/spring/item3.jpg",
	"/spring/gallery5.jpg",
	"/spring/gallery7.jpg",
	"/spring/gallery8.jpg",
	"/spring/item2.jpg",
	"/spring/item4.jpg",
	"/spring/item5.jpg",
	"/spring/gallery6.jpg",
	"/spring/item6.jpg",
	"/spring/Mesin1.jpg",
]

// Stable category key per image index (tags are localized, so we can't group by
// the tag string). Each category's localized heading comes from the first item's tag.
const CATEGORY_OF_IMAGE = [
	"compression", // 0  gallery1
	"compression", // 1  item1
	"tension", //     2  gallery2
	"compression", // 3  gallery4
	"battery", //     4  gallery3
	"battery", //     5  item3
	"compression", // 6  gallery5
	"compression", // 7  gallery7
	"compression", // 8  gallery8
	"wireforming", // 9  item2
	"wireforming", // 10 item4
	"compression", // 11 item5
	"wireforming", // 12 gallery6
	"compression", // 13 item6
	"production", //  14 Mesin1 — machine shot, excluded from the catalog grid
] as const

// Display order of the catalog sections (production is intentionally omitted).
const CATEGORY_ORDER = ["compression", "battery", "tension", "wireforming"] as const

const VIDEO_SRCS = ["/spring/Mesin1Vid.mp4", "/spring/Mesin2Vid.mp4"]

type GalleryItem = { label: string; image: string; tag: string }
type CatalogEntry = { item: GalleryItem; flatIndex: number }

function CatalogCard({
	item,
	index,
	flatIndex,
	onOpen,
}: {
	item: GalleryItem
	index: number
	flatIndex: number
	onOpen: () => void
}) {
	// Part codes are how a buyer refers back to a photo in an enquiry.
	const code = `RS-${String(flatIndex + 1).padStart(3, "0")}`

	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-8% 0px" }}
			transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
			className="h-full">
			<button
				onClick={onOpen}
				aria-label={`${code} — ${item.label}`}
				className="group flex h-full w-full flex-col bg-surface text-left transition-colors duration-200 hover:bg-sunk">
				<div className="relative aspect-[4/3] overflow-hidden">
					<Image
						src={item.image}
						alt={item.label}
						fill
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						className="object-cover object-center transition-transform duration-[600ms] group-hover:scale-[1.04]"
					/>
					<span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-ground/0 text-ink opacity-0 transition-all duration-200 group-hover:bg-ground/90 group-hover:opacity-100">
						<Plus size={13} />
					</span>
				</div>

				{/* Datasheet caption */}
				<div className="flex flex-1 flex-col gap-1.5 border-t border-rule px-3.5 py-3">
					<span className="font-mono text-[0.58rem] tracking-[0.16em] text-navy">
						{code}
					</span>
					<span className="line-clamp-2 font-display text-[0.86rem] font-semibold leading-[1.35] tracking-[-0.01em] text-ink">
						{item.label}
					</span>
				</div>
			</button>
		</motion.div>
	)
}

export default function Gallery() {
	const { t } = useLanguage()
	const galleryItems: GalleryItem[] = GALLERY_IMAGES.map((image, i) => ({
		image,
		label: t.gallery.items[i].label,
		tag: t.gallery.items[i].tag,
	}))

	// Group items into catalog sections by stable category key, in display order.
	const catalog = CATEGORY_ORDER.map((key) => {
		const entries: CatalogEntry[] = galleryItems
			.map((item, flatIndex) => ({ item, flatIndex }))
			.filter(({ flatIndex }) => CATEGORY_OF_IMAGE[flatIndex] === key)
		return {
			key,
			heading: entries[0]?.item.tag ?? key,
			entries,
		}
	}).filter((g) => g.entries.length > 0)

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
						<p className="max-w-[38ch] font-body text-[0.88rem] leading-[1.7] text-ink-soft">
							{t.gallery.description}
						</p>
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
									{group.heading}
								</h3>
								<span className="font-mono text-[0.64rem] tracking-[0.14em] text-ink-faint">
									{String(group.entries.length).padStart(2, "0")} items
								</span>
							</div>

							{/* Uniform card grid, drawn as one ruled block */}
							<div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-4">
								{group.entries.map(({ item, flatIndex }, i) => (
									<CatalogCard
										key={flatIndex}
										item={item}
										index={i}
										flatIndex={flatIndex}
										onOpen={() => setLightbox(flatIndex)}
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

			{/* ── Lightbox ── */}
			<AnimatePresence>
				{lightbox !== null && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setLightbox(null)}
						className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm">
						<motion.div
							initial={{ scale: 0.96, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.96, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="relative w-full max-w-2xl overflow-hidden border border-rule bg-surface shadow-plate-lift">
							<div className="relative w-full" style={{ minHeight: 300, maxHeight: "78vh" }}>
								<Image
									src={galleryItems[lightbox].image}
									alt={galleryItems[lightbox].label}
									fill
									sizes="(max-width: 768px) 100vw, 672px"
									className="object-contain"
								/>
							</div>

							<div className="flex items-center justify-between border-t border-rule px-6 py-4">
								<div>
									<span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-navy">
										RS-{String(lightbox + 1).padStart(3, "0")} ·{" "}
										{galleryItems[lightbox].tag}
									</span>
									<p className="font-display text-[0.98rem] font-semibold text-ink">
										{galleryItems[lightbox].label}
									</p>
								</div>
								<span className="font-mono text-sm text-ink-faint">
									{lightbox + 1} / {galleryItems.length}
								</span>
							</div>

							<button
								onClick={() => setLightbox(null)}
								aria-label="Close"
								className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-rule bg-surface transition-colors hover:border-navy">
								<X size={17} className="text-ink" />
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	)
}
