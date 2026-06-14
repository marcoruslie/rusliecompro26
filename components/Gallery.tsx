"use client"

import { useRef, useState } from "react"
import {
	motion,
	useInView,
	useReducedMotion,
	AnimatePresence,
} from "framer-motion"
import { X, Play, ChevronLeft, ChevronRight, Maximize2, ArrowUpRight } from "lucide-react"
import Image from "next/image"
import { SectionIndex, BlueprintGrid, TiltSpotlightCard } from "./hud"
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
	const reduce = useReducedMotion()
	const ref = useRef<HTMLDivElement>(null)
	const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" })
	const code = `RS-${String(flatIndex + 1).padStart(3, "0")}`

	return (
		<TiltSpotlightCard
			index={index}
			cardClassName="rounded-xl border border-white/[0.08] bg-graphite/40 cursor-pointer">
			<div ref={ref} onClick={onOpen} className="flex h-full flex-col">
				{/* Image */}
				<div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
					{/* Cyan scan-line sweep on reveal (height-independent) */}
					{!reduce && (
						<motion.span
							aria-hidden
							initial={{ top: "-6%", opacity: 0 }}
							animate={inView ? { top: "106%", opacity: [0, 1, 0] } : undefined}
							transition={{ duration: 0.9, ease: "easeOut", delay: index * 0.07 + 0.18 }}
							className="absolute left-0 right-0 z-30 h-[2px] pointer-events-none"
							style={{
								background:
									"linear-gradient(90deg, transparent, rgba(34,211,238,0.9), transparent)",
								boxShadow: "0 0 14px rgba(34,211,238,0.8)",
							}}
						/>
					)}
					<Image
						src={item.image}
						alt={item.label}
						fill
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						className="object-cover object-center transition-transform duration-[600ms] group-hover:scale-[1.07]"
					/>

					{/* Top fade for badge legibility */}
					<div
						aria-hidden
						className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none"
						style={{ background: "linear-gradient(to bottom, rgba(10,14,20,0.55), transparent)" }}
					/>

					{/* Tag badge */}
					<div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded font-mono text-[0.56rem] font-medium tracking-[0.14em] uppercase text-graphite bg-cyan">
						{item.tag}
					</div>

					{/* Crosshair + EXPAND affordance on hover */}
					<div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
						<span className="absolute left-1/2 top-1/2 h-7 w-px -translate-x-1/2 -translate-y-1/2 bg-cyan/50" />
						<span className="absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 bg-cyan/50" />
						<div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded bg-graphite/70 px-2 py-1 backdrop-blur-sm border border-cyan/30">
							<Maximize2 size={11} className="text-cyan" />
							<span className="font-mono text-[0.54rem] tracking-[0.18em] uppercase text-cyan">
								Expand
							</span>
						</div>
					</div>
				</div>

				{/* Datasheet caption */}
				<div className="flex flex-1 flex-col gap-1.5 px-4 py-3 border-t border-white/[0.06]">
					<div className="flex items-center justify-between">
						<span className="font-mono text-[0.58rem] tracking-[0.16em] text-cyan/70">
							{code}
						</span>
						<ArrowUpRight
							size={13}
							className="text-hud-mute transition-all duration-300 group-hover:text-cyan group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
						/>
					</div>
					<span className="font-tech text-hud-silver text-[0.9rem] font-semibold leading-[1.35] line-clamp-2">
						{item.label}
					</span>
				</div>
			</div>
		</TiltSpotlightCard>
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
			className={`relative bg-carbon px-6 lg:px-10 border-t border-white/[0.06] overflow-hidden ${
				stageEnabled ? "h-screen py-20" : "py-[120px]"
			}`}>
			{/* Blueprint datasheet backdrop */}
			<BlueprintGrid />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
				style={{
					background:
						"radial-gradient(120% 100% at 50% 0%, rgba(34,211,238,0.07), transparent 70%)",
				}}
			/>
			<motion.div ref={contentRef} style={{ y: panY }} className="relative max-w-7xl mx-auto">
				{/* ── Header ── */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
					className="mb-14">
					<SectionIndex index="05" label={t.gallery.label} className="mb-6" />
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
						<h2 className="font-tech font-bold text-[clamp(2rem,3.6vw,3rem)] text-hud-silver">
							{t.gallery.heading[0]} <span className="text-cyan hud-glow-cyan">{t.gallery.heading[1]}</span>
						</h2>
						<p className="font-body text-[0.88rem] text-hud-silver/50 max-w-[360px] leading-[1.7]">
							{t.gallery.description}
						</p>
					</div>
				</motion.div>

				{/* ── Catalog sections (one per category) ── */}
				<div className="space-y-16">
					{catalog.map((group, gi) => (
						<motion.div
							key={group.key}
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-12% 0px" }}
							transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
							{/* Category header */}
							<div className="flex items-center gap-4 mb-7">
								{/* Outlined index numeral */}
								<span
									aria-hidden
									className="font-tech font-bold text-[2.5rem] leading-none text-transparent select-none"
									style={{ WebkitTextStroke: "1px rgba(34,211,238,0.32)" }}>
									{String(gi + 1).padStart(2, "0")}
								</span>
								<div className="flex flex-col">
									<span className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-cyan/70 mb-0.5">
										Catalog · Series
									</span>
									<h3 className="font-tech text-hud-silver text-[1.35rem] font-bold tracking-tight leading-none">
										{group.heading}
									</h3>
								</div>
								<span className="font-mono text-[0.62rem] text-cyan/80 tracking-[0.1em] px-2 py-0.5 rounded-full border border-cyan/25 bg-cyan/[0.06]">
									{String(group.entries.length).padStart(2, "0")}
								</span>
								<div
									className="flex-1 h-px"
									style={{
										background:
											"linear-gradient(90deg, rgba(34,211,238,0.4), rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.05))",
									}}
								/>
							</div>

							{/* Uniform card grid */}
							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

				{/* ── Production Videos ── */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.7, delay: 0.3 }}
					className="mt-20">
					{/* Header */}
					<div className="flex items-center gap-4 mb-8">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center flex-shrink-0">
								<Play size={14} className="text-cyan translate-x-[1px]" />
							</div>
							<div>
								<p className="font-mono text-[0.66rem] text-hud-mute tracking-[0.2em] uppercase">
									{t.gallery.behindProcess}
								</p>
								<h3 className="font-tech text-[1.4rem] font-bold text-hud-silver">
									{t.gallery.productionVideos}
								</h3>
							</div>
						</div>
						<div className="flex-1 h-px bg-white/10 ml-2" />
					</div>

					{/* Deck — centered, full width up to max */}
					<div className="flex flex-col items-center gap-6">
						<div
							className="relative"
							style={{ width: "min(360px, 100%)", height: "min(64vh, 640px)" }}>
							{videoItems.map((vid, i) => {
								const offset = (((i - topIndex) % total) + total) % total
								const isActive = offset === 0

								const rotate = isActive ? 0 : offset * 5
								const translateX = isActive ? 0 : offset * 22
								const translateY = isActive ? 0 : offset * 10
								const scale = isActive ? 1 : 1 - offset * 0.04

								return (
									<motion.div
										key={i}
										animate={{ rotate, x: translateX, y: translateY, scale }}
										transition={{ type: "spring", stiffness: 280, damping: 26 }}
										onClick={() => !isActive && setTopIndex(i)}
										className="absolute inset-0 rounded-2xl overflow-hidden border-2 shadow-xl"
										style={{
											zIndex: total - offset,
											borderColor: isActive ? "#22d3ee" : "rgba(255,255,255,0.12)",
											cursor: isActive ? "default" : "pointer",
										}}>
										{!isActive && (
											<div className="absolute inset-0 z-10 bg-graphite/60 flex items-center justify-center">
												<div className="w-12 h-12 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center">
													<Play size={18} className="text-cyan/60 translate-x-[1px]" />
												</div>
											</div>
										)}

										<video
											ref={(el) => {
												videoRefs.current[i] = el
											}}
											src={vid.src}
											className="w-full h-full object-cover"
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

						{/* Controls row */}
						<div className="flex items-center gap-4">
							<button
								onClick={cyclePrev}
								className="w-10 h-10 rounded-full border border-white/15 bg-white/[0.03] hover:border-cyan/50 flex items-center justify-center transition-colors">
								<ChevronLeft size={18} className="text-hud-silver" />
							</button>

							{/* dot indicators */}
							<div className="flex gap-2 items-center">
								{videoItems.map((_, i) => (
									<button
										key={i}
										onClick={() => setTopIndex(i)}
										className="rounded-full transition-all duration-300"
										style={{
											width: i === topIndex ? 24 : 8,
											height: 8,
											background: i === topIndex ? "#22d3ee" : "rgba(255,255,255,0.2)",
										}}
									/>
								))}
							</div>

							<button
								onClick={cycleNext}
								className="w-10 h-10 rounded-full border border-white/15 bg-white/[0.03] hover:border-cyan/50 flex items-center justify-center transition-colors">
								<ChevronRight size={18} className="text-hud-silver" />
							</button>
						</div>

						{/* active video caption */}
						<div className="text-center">
							<span className="block font-mono text-[0.6rem] text-hud-mute tracking-[0.15em] uppercase mb-1">
								{t.gallery.productionProcess} · {topIndex + 1} / {total}
							</span>
							<span className="font-tech text-hud-silver text-[1rem] font-semibold">
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
						className="fixed inset-0 z-50 bg-black/88 backdrop-blur-md flex items-center justify-center p-6">
						<motion.div
							initial={{ scale: 0.88, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.88, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10"
							style={{ background: "#11161f" }}>
							<div
								className="relative w-full"
								style={{ minHeight: 300, maxHeight: "78vh" }}>
								<Image
									src={galleryItems[lightbox].image}
									alt={galleryItems[lightbox].label}
									fill
									sizes="(max-width: 768px) 100vw, 672px"
									className="object-contain"
								/>
							</div>

							<div className="px-6 py-4 flex items-center justify-between border-t border-white/[0.06]">
								<div>
									<span className="inline-block px-2.5 py-0.5 rounded-full text-[0.6rem] font-medium uppercase tracking-wider text-graphite bg-cyan mb-1.5 font-mono">
										{galleryItems[lightbox].tag}
									</span>
									<p className="font-tech text-hud-silver text-[1rem] font-semibold">
										{galleryItems[lightbox].label}
									</p>
								</div>
								<span className="font-mono text-hud-mute text-sm">
									{lightbox + 1} / {galleryItems.length}
								</span>
							</div>

							<button
								onClick={() => setLightbox(null)}
								className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-cyan/20 border border-white/10 flex items-center justify-center transition-colors">
								<X size={18} className="text-hud-silver" />
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	)
}
