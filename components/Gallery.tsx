"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { X, ZoomIn, Play, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

const GALLERY_ITEMS = [
	{ label: "Stainless Steel Compression Spring", image: "/spring/gallery1.jpg", tag: "Compression" },
	{ label: "Standard Coil Spring — General Use", image: "/spring/item1.jpg", tag: "Compression" },
	{ label: "Steel Tension Spring", image: "/spring/gallery2.jpg", tag: "Tension" },
	{ label: "Compression Coil Spring", image: "/spring/gallery4.jpg", tag: "Compression" },	
	{ label: "Battery Spring", image: "/spring/gallery3.jpg", tag: "Battery Spring" },
	{ label: "Battery Spring", image: "/spring/item3.jpg", tag: "Battery Spring" },
	{ label: "Mini Compression Spring — Electronics", image: "/spring/gallery5.jpg", tag: "Compression" },
	{ label: "Steel Compression Spring", image: "/spring/gallery7.jpg", tag: "Compression" },
	{ label: "Flat-Ground End Compression Spring", image: "/spring/gallery8.jpg", tag: "Compression" },
	{ label: "Stainless Steel Wire Forming", image: "/spring/item2.jpg", tag: "Wire Forming" },
	{ label: "Wire Forming Spring", image: "/spring/item4.jpg", tag: "Wire Forming" },
	{ label: "Stainless Steel Torsion Spring", image: "/spring/item5.jpg", tag: "Compression" },
	{ label: "Intercoller Hose Clamp", image: "/spring/gallery6.jpg", tag: "Wire Forming" },
	{ label: "Stainless Steel Compression Spring", image: "/spring/item6.jpg", tag: "Compression" },
	{ label: "Production Round Wire — Spring Coiling", image: "/spring/Mesin1.jpg", tag: "Production" },
]

const VIDEO_ITEMS = [
	{ label: "Round Wire — Live Production", src: "/spring/Mesin1Vid.mp4" },
	{ label: "Compression Spring — Live Production", src: "/spring/Mesin2Vid.mp4" },
]

// portrait (720×1280) → tall | landscape (1280×720) → short | square (1599×1599) → medium
const HEIGHTS = [
	440,
	440,
	440,
	440,
	440,
	440,
	440, // gallery1-7 portrait
	440, // gallery8 landscape
	440,
	340,
	340,
	340,
	640,
	340, // item1-6 square
	640, // Mesin1 portrait
]

export default function Gallery() {
	const [topIndex, setTopIndex] = useState(0)
	const total = VIDEO_ITEMS.length
	// add this ref alongside your other hooks at the top of the component
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

	// replace cycleNext / cyclePrev with these — they stop all others before switching
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

	return (
		<section
			id="gallery"
			ref={ref}
			className="bg-white py-[120px] px-6 lg:px-10">
			<div className="max-w-7xl mx-auto">
				{/* ── Header ── */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.7 }}
					className="mb-14">
					<p className="font-body text-[0.72rem] text-[#021d47]/55 tracking-[0.25em] uppercase mb-3">
						Our Work
					</p>
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
						<h2 className="font-display text-[clamp(2rem,3.5vw,3rem)] font-bold text-[#021d47]">
							Spring <span className="text-steel-DEFAULT">Gallery</span>
						</h2>
						<p className="font-body text-[0.88rem] text-steel-light max-w-[360px] leading-[1.7]">
							A visual showcase of springs we've engineered across industries and applications.
						</p>
					</div>
				</motion.div>

				{/* ── Photo Grid ── */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{GALLERY_ITEMS.map((item, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, scale: 0.94 }}
							animate={inView ? { opacity: 1, scale: 1 } : {}}
							transition={{ duration: 0.5, delay: i * 0.05 }}
							onClick={() => setLightbox(i)}
							whileHover={{ scale: 1.02, boxShadow: "0 18px 52px rgba(2,29,71,0.14)" }}
							className="relative rounded-2xl overflow-hidden cursor-pointer border border-[#021d47]/8 group"
							style={{ height: HEIGHTS[i] }}>
							<Image
								src={item.image}
								alt={item.label}
								fill
								sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
								className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
							/>

							{/* Hover overlay */}
							<div
								className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
								style={{
									background:
										"linear-gradient(to top, rgba(2,29,71,0.92) 0%, rgba(2,29,71,0.4) 55%, transparent 100%)",
								}}>
								<div className="absolute bottom-0 left-0 right-0 p-5">
									<span className="block font-body text-[0.68rem] text-white/60 tracking-[0.18em] uppercase mb-1.5">
										{item.tag}
									</span>
									<span className="font-display text-white text-[0.97rem] font-semibold leading-[1.3]">
										{item.label}
									</span>
								</div>
								<div className="absolute top-4 right-4">
									<div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
										<ZoomIn
											size={14}
											className="text-white"
										/>
									</div>
								</div>
							</div>

							{/* Tag badge */}
							<div className="absolute top-3.5 left-3.5 z-20 px-3 py-1 rounded-full font-body text-[0.66rem] font-bold tracking-[0.1em] uppercase text-white bg-[#021d47]">
								{item.tag}
							</div>
						</motion.div>
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
							<div className="w-8 h-8 rounded-full bg-[#021d47] flex items-center justify-center flex-shrink-0">
								<Play
									size={14}
									className="text-white translate-x-[1px]"
								/>
							</div>
							<div>
								<p className="font-body text-[0.7rem] text-[#021d47]/50 tracking-[0.2em] uppercase">
									Behind the Process
								</p>
								<h3 className="font-display text-[1.4rem] font-bold text-[#021d47]">
									Production Videos
								</h3>
							</div>
						</div>
						<div className="flex-1 h-px bg-[#021d47]/10 ml-2" />
					</div>

					{/* Deck — centered, full width up to max */}
					<div className="flex flex-col items-center gap-6">
						{/* Card stack */}
						<div
							className="relative"
							style={{ width: "min(360px, 100%)", height: "min(64vh, 640px)" }}>
							{VIDEO_ITEMS.map((vid, i) => {
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
											borderColor: isActive ? "#021d47" : "rgba(2,29,71,0.12)",
											cursor: isActive ? "default" : "pointer",
										}}>
										{!isActive && (
											<div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center">
												<div className="w-12 h-12 rounded-full bg-[#021d47]/10 flex items-center justify-center">
													<Play
														size={18}
														className="text-[#021d47]/40 translate-x-[1px]"
													/>
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
											// play/pause imperatively via ref — no autoPlay prop needed
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
								className="w-10 h-10 rounded-full border border-[#021d47]/15 bg-white hover:bg-[#021d47]/5 flex items-center justify-center transition-colors shadow-sm">
								<ChevronLeft
									size={18}
									className="text-[#021d47]"
								/>
							</button>

							{/* dot indicators */}
							<div className="flex gap-2 items-center">
								{VIDEO_ITEMS.map((_, i) => (
									<button
										key={i}
										onClick={() => setTopIndex(i)}
										className="rounded-full transition-all duration-300"
										style={{
											width: i === topIndex ? 24 : 8,
											height: 8,
											background: i === topIndex ? "#021d47" : "rgba(2,29,71,0.2)",
										}}
									/>
								))}
							</div>

							<button
								onClick={cycleNext}
								className="w-10 h-10 rounded-full border border-[#021d47]/15 bg-white hover:bg-[#021d47]/5 flex items-center justify-center transition-colors shadow-sm">
								<ChevronRight
									size={18}
									className="text-[#021d47]"
								/>
							</button>
						</div>

						{/* active video caption */}
						<div className="text-center">
							<span className="block font-body text-[0.62rem] text-[#021d47]/45 tracking-[0.15em] uppercase mb-1">
								Production Process · {topIndex + 1} / {total}
							</span>
							<span className="font-display text-[#021d47] text-[1rem] font-semibold">
								{VIDEO_ITEMS[topIndex].label}
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
						className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
						<motion.div
							initial={{ scale: 0.88, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.88, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
							style={{ background: "#021d47" }}>
							<div
								className="relative w-full"
								style={{ minHeight: 300, maxHeight: "78vh" }}>
								<Image
									src={GALLERY_ITEMS[lightbox].image}
									alt={GALLERY_ITEMS[lightbox].label}
									fill
									sizes="(max-width: 768px) 100vw, 672px"
									className="object-contain"
								/>
							</div>

							<div className="px-6 py-4 flex items-center justify-between">
								<div>
									<span className="inline-block px-2.5 py-0.5 rounded-full text-[0.62rem] font-bold uppercase tracking-wider text-white bg-white/15 mb-1.5">
										{GALLERY_ITEMS[lightbox].tag}
									</span>
									<p className="font-display text-white text-[1rem] font-semibold">
										{GALLERY_ITEMS[lightbox].label}
									</p>
								</div>
								<span className="font-body text-white/30 text-sm">
									{lightbox + 1} / {GALLERY_ITEMS.length}
								</span>
							</div>

							<button
								onClick={() => setLightbox(null)}
								className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
								<X
									size={18}
									className="text-white"
								/>
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	)
}
