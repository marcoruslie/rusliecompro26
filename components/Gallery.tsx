"use client"

import { useRef, useState } from "react"
import {
	motion,
	useInView,
	useScroll,
	useTransform,
	useReducedMotion,
	AnimatePresence,
} from "framer-motion"
import { X, ZoomIn, Play, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { SectionIndex } from "./hud"
import { useLanguage } from "@/components/LanguageProvider"

const GALLERY_IMAGES = [
	"/spring/gallery1.jpg", "/spring/item1.jpg", "/spring/gallery2.jpg",
	"/spring/gallery4.jpg", "/spring/gallery3.jpg", "/spring/item3.jpg",
	"/spring/gallery5.jpg", "/spring/gallery7.jpg", "/spring/gallery8.jpg",
	"/spring/item2.jpg", "/spring/item4.jpg", "/spring/item5.jpg",
	"/spring/gallery6.jpg", "/spring/item6.jpg", "/spring/Mesin1.jpg",
]

const VIDEO_SRCS = ["/spring/Mesin1Vid.mp4", "/spring/Mesin2Vid.mp4"]

// portrait (720×1280) → tall | landscape (1280×720) → short | square (1599×1599) → medium
const HEIGHTS = [
	440, 440, 440, 440, 440, 440, 440, 440, 440,
	340, 340, 340, 640, 340, 640,
]

// Per-column parallax magnitudes (px) — different speeds create depth.
const PARALLAX = [28, 52, 18]
// Per-column slide-in origin: left col → from left, middle → up, right → from right.
const SLIDE_FROM = [
	{ x: -80, y: 0 },
	{ x: 0, y: 64 },
	{ x: 80, y: 0 },
]

function GalleryTile({
	image,
	label,
	tag,
	index,
	onOpen,
}: {
	image: string
	label: string
	tag: string
	index: number
	onOpen: () => void
}) {
	const ref = useRef<HTMLDivElement>(null)
	const reduce = useReducedMotion()
	const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" })
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	})
	const mag = PARALLAX[index % 3]
	const y = useTransform(scrollYProgress, [0, 1], [mag, -mag])
	const from = SLIDE_FROM[index % 3]
	const tileH = HEIGHTS[index]
	const stagger = (index % 3) * 0.06

	return (
		<motion.div ref={ref} style={{ y: reduce ? 0 : y }} className="will-change-transform">
			<motion.div
				initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, x: from.x, y: from.y }}
				animate={
					inView
						? { opacity: 1, scale: 1, x: 0, y: 0 }
						: undefined
				}
				transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.9, delay: stagger }}
				whileHover={{ scale: 1.02, boxShadow: "0 18px 52px rgba(34,211,238,0.18)" }}
				onClick={onOpen}
				className="relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.08] group"
				style={{ height: tileH }}>
				{/* Cyan scan-line sweep on reveal (transform-only) */}
				{!reduce && (
					<motion.span
						aria-hidden
						initial={{ y: -14, opacity: 0 }}
						animate={inView ? { y: tileH + 14, opacity: [0, 1, 0] } : undefined}
						transition={{ duration: 0.95, ease: "easeOut", delay: stagger + 0.2 }}
						className="absolute top-0 left-0 right-0 z-30 h-[2px] pointer-events-none"
						style={{
							background:
								"linear-gradient(90deg, transparent, rgba(34,211,238,0.9), transparent)",
							boxShadow: "0 0 14px rgba(34,211,238,0.8)",
						}}
					/>
				)}
				<Image
					src={image}
					alt={label}
					fill
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
					className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
				/>

				{/* Hover overlay */}
				<div
					className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					style={{
						background:
							"linear-gradient(to top, rgba(10,14,20,0.94) 0%, rgba(10,14,20,0.4) 55%, transparent 100%)",
					}}>
					<div className="absolute bottom-0 left-0 right-0 p-5">
						<span className="block font-mono text-[0.64rem] text-cyan/80 tracking-[0.18em] uppercase mb-1.5">
							{tag}
						</span>
						<span className="font-tech text-hud-silver text-[0.97rem] font-semibold leading-[1.3]">
							{label}
						</span>
					</div>
					<div className="absolute top-4 right-4">
						<div className="w-8 h-8 rounded-full bg-cyan/15 border border-cyan/40 backdrop-blur-sm flex items-center justify-center">
							<ZoomIn size={14} className="text-cyan" />
						</div>
					</div>
				</div>

				{/* Tag badge */}
				<div className="absolute top-3.5 left-3.5 z-20 px-3 py-1 rounded-full font-mono text-[0.62rem] font-medium tracking-[0.1em] uppercase text-graphite bg-cyan">
					{tag}
				</div>
			</motion.div>
		</motion.div>
	)
}

export default function Gallery() {
	const [topIndex, setTopIndex] = useState(0)
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
	const inView = useInView(ref, { once: true, margin: "-80px" })
	const [lightbox, setLightbox] = useState<number | null>(null)
	const { tr } = useLanguage()
	const total = VIDEO_SRCS.length

	return (
		<section
			id="gallery"
			ref={ref}
			className="relative bg-carbon py-[120px] px-6 lg:px-10 border-t border-white/[0.06] overflow-hidden">
			<div className="max-w-7xl mx-auto">
				{/* ── Header ── */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
					className="mb-14">
					<SectionIndex index="05" label={tr.gallery.index} className="mb-6" />
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
						<h2 className="font-tech font-bold text-[clamp(2rem,3.6vw,3rem)] text-hud-silver">
							{tr.gallery.titlePrefix}{" "}<span className="text-cyan hud-glow-cyan">{tr.gallery.titleAccent}</span>
						</h2>
						<p className="font-body text-[0.88rem] text-hud-silver/50 max-w-[360px] leading-[1.7]">
							{tr.gallery.description}
						</p>
					</div>
				</motion.div>

				{/* ── Photo Grid (scroll-parallax tiles) ── */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{GALLERY_IMAGES.map((image, i) => (
						<GalleryTile
							key={i}
							image={image}
							label={tr.gallery.items[i].label}
							tag={tr.gallery.items[i].tag}
							index={i}
							onOpen={() => setLightbox(i)}
						/>
					))}
				</div>

				{/* ── Production Videos ── */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.7, delay: 0.3 }}
					className="mt-16">
					{/* Header */}
					<div className="flex items-center gap-4 mb-8">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center flex-shrink-0">
								<Play size={14} className="text-cyan translate-x-[1px]" />
							</div>
							<div>
								<p className="font-mono text-[0.66rem] text-hud-mute tracking-[0.2em] uppercase">
									{tr.gallery.behindProcess}
								</p>
								<h3 className="font-tech text-[1.4rem] font-bold text-hud-silver">
									{tr.gallery.productionVideos}
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
							{VIDEO_SRCS.map((src, i) => {
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
											src={src}
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
								{VIDEO_SRCS.map((_, i) => (
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
								{tr.gallery.productionCaption} · {topIndex + 1} / {total}
							</span>
							<span className="font-tech text-hud-silver text-[1rem] font-semibold">
								{tr.gallery.videos[topIndex]}
							</span>
						</div>
					</div>
				</motion.div>
			</div>

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
									src={GALLERY_IMAGES[lightbox]}
									alt={tr.gallery.items[lightbox].label}
									fill
									sizes="(max-width: 768px) 100vw, 672px"
									className="object-contain"
								/>
							</div>

							<div className="px-6 py-4 flex items-center justify-between border-t border-white/[0.06]">
								<div>
									<span className="inline-block px-2.5 py-0.5 rounded-full text-[0.6rem] font-medium uppercase tracking-wider text-graphite bg-cyan mb-1.5 font-mono">
										{tr.gallery.items[lightbox].tag}
									</span>
									<p className="font-tech text-hud-silver text-[1rem] font-semibold">
										{tr.gallery.items[lightbox].label}
									</p>
								</div>
								<span className="font-mono text-hud-mute text-sm">
									{lightbox + 1} / {GALLERY_IMAGES.length}
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
