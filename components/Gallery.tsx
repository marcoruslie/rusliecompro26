"use client"

import { useRef, useState } from "react"
import { ArrowRight, Plus } from "lucide-react"
import Image from "next/image"
import { Reveal, SectionLabel, Action } from "./industrial"
import { CatalogLightbox } from "./CatalogGrid"
import { useLanguage } from "@/lib/i18n"
import { buildCatalog } from "@/lib/catalog"
import { useScrollStage } from "@/lib/scrollStage"

const VIDEO_SRCS = ["/spring/Mesin1Vid.mp4", "/spring/Mesin2Vid.mp4"]

// Mosaic placement for the production-run photos: the first is the large tile.
const TILE_SPANS = [
	"col-span-2 row-span-2",
	"",
	"",
	"",
	"",
]

export default function Gallery() {
	const { t, lang } = useLanguage()
	// The homepage shows the shop floor; the per-type photos live on /[locale]/katalog.
	const production = buildCatalog(t.catalog).find((g) => g.key === "bulk")!
	const photos = production.items
	const videos = VIDEO_SRCS.map((src, i) => ({ src, label: t.gallery.videos[i] }))

	const ref = useRef<HTMLElement>(null)
	const { stageEnabled } = useScrollStage()
	const [lightbox, setLightbox] = useState<number | null>(null)

	return (
		<section
			id="gallery"
			ref={ref}
			className={`relative border-t border-rule bg-surface px-6 lg:px-10 ${
				stageEnabled ? "h-screen py-20" : "py-[120px]"
			}`}>
			<div className="mx-auto max-w-7xl">
				{/* ── Header ── */}
				<Reveal className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
					<div>
						<SectionLabel label={t.gallery.label} className="mb-5" />
						<h2 className="font-condensed font-display text-[clamp(2.3rem,4.6vw,3.9rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink">
							{production.title}
						</h2>
					</div>
					<p className="max-w-[46ch] font-body text-[1rem] leading-[1.75] text-ink-soft">{production.text}</p>
				</Reveal>

				{/* ── Production mosaic ── */}
				<div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4">
					{photos.map((item, i) => (
						<Reveal key={item.code} delay={i * 0.05} className={TILE_SPANS[i]}>
							<button
								onClick={() => setLightbox(i)}
								aria-label={item.label}
								className="group relative block h-full w-full overflow-hidden rounded-plate bg-sunk text-left">
								<Image
									src={item.image}
									alt={item.label}
									fill
									sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
									className="object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.04]"
								/>
								<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-dark/85 to-transparent px-4 pb-3 pt-10 font-body text-[0.85rem] font-medium leading-snug text-white opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
									{item.label}
								</span>
								<span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-plate bg-white/90 text-navy opacity-0 transition-opacity duration-200 group-hover:opacity-100">
									<Plus size={16} />
								</span>
							</button>
						</Reveal>
					))}
				</div>

				<div className="mt-8 flex justify-end">
					<a
						href={`/${lang}/katalog`}
						className="group inline-flex items-center gap-2 font-display text-[0.95rem] font-semibold text-navy">
						{t.catalog.viewFull}
						<ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
					</a>
				</div>

				{/* ── Production videos ── */}
				<div className="mt-20 grid grid-cols-1 gap-10 border-t border-rule pt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
					<Reveal>
						<h3 className="font-condensed mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1] tracking-[-0.015em] text-ink">
							{t.gallery.productionVideos}
						</h3>
						<p className="mb-8 max-w-[40ch] font-body text-[1rem] leading-[1.75] text-ink-soft">
							{t.gallery.description}
						</p>
						<Action href="#contact" variant="ghost">
							{t.catalog.ctaButton}
						</Action>
					</Reveal>

					<div className="grid grid-cols-2 gap-3 sm:gap-5">
						{videos.map((vid, i) => (
							<Reveal key={vid.src} delay={i * 0.08}>
								<figure>
									<div className="relative aspect-[9/16] overflow-hidden rounded-plate bg-navy-dark">
										<video
											src={vid.src}
											className="h-full w-full object-cover"
											controls
											playsInline
											muted
											preload="metadata"
											loop
										/>
									</div>
									<figcaption className="mt-3 font-body text-[0.88rem] font-medium text-ink">
										{vid.label}
									</figcaption>
								</figure>
							</Reveal>
						))}
					</div>
				</div>
			</div>

			<CatalogLightbox items={photos} index={lightbox} onChange={setLightbox} labels={t.catalog} />
		</section>
	)
}
