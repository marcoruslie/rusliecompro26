"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const PRODUCTS = [
	{
		name: "Compression Springs",
		desc: "High-load bearing springs for industrial machinery and automotive systems.",
		icon: "⚙️",
	},
	{
		name: "Extension Springs",
		desc: "Precision-engineered for consistent tension in heavy-duty applications.",
		icon: "🔩",
	},
	{
		name: "Torsion Springs",
		desc: "Custom torque solutions for aerospace and manufacturing industries.",
		icon: "🌀",
	},
	{
		name: "Wire Forms",
		desc: "Complex custom wire shapes engineered to exact client specifications.",
		icon: "〰️",
	},
	{
		name: "Zigzag Springs",
		desc: "Durable zigzag springs engineered for furniture seating systems, providing long-lasting support and elasticity.",
		icon: "🌀",
	},
	{
		name: "Battery Springs",
		desc: "Precision-engineered battery springs ensuring reliable electrical contact for battery compartments and electronic assemblies.",
		icon: "🔋",
	},
]

export default function Products() {
	const ref = useRef<HTMLElement>(null)
	const inView = useInView(ref, { once: true, margin: "-80px" })

	return (
		<section
			id="products"
			ref={ref}
			className="relative py-[120px] px-6 lg:px-10 overflow-hidden"
			style={{ background: "#021d47" }}>
			{/* Dot grid overlay */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>

			<div className="relative z-10 max-w-7xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.2 }}
					className="text-center mb-[72px]">
					<p className="font-body text-[0.72rem] text-silver-muted tracking-[0.25em] uppercase mb-3">
						What We Make
					</p>
					<h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-white">
						Our <span className="text-silver-DEFAULT">Spring Catalog</span>
					</h2>
				</motion.div>

				{/* Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{PRODUCTS.map((p, i) => (
						<motion.div
							key={p.name}
							initial={{ opacity: 0, y: 40 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.15, delay: i * 0.09 }}
							whileHover={{
								backgroundColor: "rgba(255,255,255,0.07)",
								borderColor: "rgba(255,255,255,0.22)",
								y: -5,
							}}
							className="bg-white/4 border border-white/10 rounded-xl p-7 transition-all duration-300 cursor-default">
							<div className="text-[2rem] mb-4">{p.icon}</div>
							<h3 className="font-display text-[1.05rem] font-semibold text-white mb-2.5">{p.name}</h3>
							<p className="font-body text-[0.85rem] text-white/50 leading-[1.7]">{p.desc}</p>
							<div className="w-8 h-0.5 bg-silver-muted mt-4 rounded-full" />
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
