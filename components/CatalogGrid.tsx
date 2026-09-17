"use client"

import { useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Image from "next/image"
import type { CatalogItem } from "@/lib/catalog"

/* Datasheet-style photo card, used by the /katalog page and the homepage Gallery. */
export function CatalogCard({
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

/* Full-size viewer with prev/next, arrow keys, Escape, and scroll lock. */
export function CatalogLightbox({
	items,
	index,
	onChange,
	labels,
}: {
	items: CatalogItem[]
	index: number | null
	onChange: (index: number | null) => void
	labels: { close: string; prev: string; next: string }
}) {
	const close = useCallback(() => onChange(null), [onChange])
	const step = useCallback(
		(dir: 1 | -1) => {
			if (index !== null) onChange((index + dir + items.length) % items.length)
		},
		[index, items.length, onChange],
	)

	useEffect(() => {
		if (index === null) return
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
	}, [index, close, step])

	const current = index === null ? null : items[index]

	return (
		<AnimatePresence>
			{current && index !== null && (
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
								aria-label={labels.prev}
								className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-rule bg-surface/90 transition-colors hover:border-navy">
								<ChevronLeft size={18} className="text-ink" />
							</button>
							<button
								onClick={() => step(1)}
								aria-label={labels.next}
								className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-rule bg-surface/90 transition-colors hover:border-navy">
								<ChevronRight size={18} className="text-ink" />
							</button>
						</div>

						<div className="flex items-center justify-between gap-4 border-t border-rule px-5 py-4 sm:px-6">
							<div className="min-w-0">
								<span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-navy">
									{current.code} · {current.categoryTitle}
								</span>
								<p className="font-display text-[0.98rem] font-semibold text-ink">{current.label}</p>
							</div>
							<span className="shrink-0 font-mono text-sm text-ink-faint">
								{index + 1} / {items.length}
							</span>
						</div>

						<button
							onClick={close}
							aria-label={labels.close}
							className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-rule bg-surface transition-colors hover:border-navy">
							<X size={17} className="text-ink" />
						</button>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
