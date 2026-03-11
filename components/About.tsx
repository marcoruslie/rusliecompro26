"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const STATS = [
	{ value: "35+", label: "Years of Excellence" },
	{ value: "50K+", label: "Springs Daily" },
	{ value: "80+", label: "Company Served" },
]

const FEATURES = [
	{
		icon: "🏭",
		title: "Indonesian Manufacturing Excellence",
		text: "High-precision spring manufacturing proudly made in Indonesia, delivering global-standard quality without relying on imports.",
	},
	{
		icon: "🔬",
		title: "Proudly Made in Indonesia",
		text: "World-class springs manufactured locally to support national industry and reduce dependence on imported components.",
	},
	{
		icon: "⚙️",
		title: "Custom Industry Solutions",
		text: "Supporting Indonesian industries with custom-engineered springs tailored to automotive, machinery, and manufacturing needs.",
	},
	{
		icon: "🛡️",
		title: "Trusted Domestic Quality",
		text: "Every spring is inspected and load-tested to guarantee consistent performance — proof that Indonesian products meet world-class standards.",
	},
]

export default function About() {
	const ref = useRef<HTMLElement>(null)
	const inView = useInView(ref, { once: true, margin: "-100px" })

	return (
		<section
			id="about"
			ref={ref}
			className="bg-white py-[120px] px-6 lg:px-10">
			<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
				{/* Left */}
				<motion.div
					initial={{ opacity: 0, x: -40 }}
					animate={inView ? { opacity: 1, x: 0 } : {}}
					transition={{ duration: 0.8 }}>
					<p className="font-body text-[0.72rem] text-[#021d47]/60 tracking-[0.25em] uppercase mb-3">
						Who We Are
					</p>
					<h2 className="font-display text-[clamp(1.9rem,3.5vw,3rem)] font-bold text-[#021d47] leading-[1.15] mb-7">
						Two Decades of
						<br />
						<span className="text-steel-DEFAULT">Springmaking Mastery</span>
					</h2>
					<p className="font-body text-[1rem] text-steel-light leading-[1.9] mb-5">
						Ruslie Spring has grown from a small local workshop into a trusted Indonesian spring manufacturer. Today, we support domestic industries with high-quality precision springs engineered to international standards.
					</p>
					<p className="font-body text-[1rem] text-steel-light leading-[1.9] mb-10">
						We serve industries where failure is not an option — automotive, aerospace, medical devices,
						defense, and heavy engineering — delivering springs that meet the tightest tolerances with zero
						compromise.
					</p>

					{/* Stats grid */}
					<div className="grid grid-cols-2 gap-6">
						{STATS.map((s, i) => (
							<motion.div
								key={s.label}
								initial={{ opacity: 0, y: 20 }}
								animate={inView ? { opacity: 1, y: 0 } : {}}
								transition={{ delay: 0.3 + i * 0.1 }}
								className="border-l-[3px] border-[#021d47] pl-4">
								<div className="font-display text-[2.2rem] font-bold text-[#021d47]">{s.value}</div>
								<div className="font-body text-[0.77rem] text-steel-light uppercase tracking-[0.1em] mt-1">
									{s.label}
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>

				{/* Right — feature cards */}
				<motion.div
					initial={{ opacity: 0, x: 40 }}
					animate={inView ? { opacity: 1, x: 0 } : {}}
					transition={{ duration: 0.8, delay: 0.15 }}
					className="flex flex-col gap-4">
					{FEATURES.map((item, i) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, y: 18 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ delay: 0.35 + i * 0.12 }}
							whileHover={{
								boxShadow: "0 8px 32px rgba(2,29,71,0.1)",
								y: -2,
							}}
							className="flex gap-4 p-5 border border-[#021d47]/8 rounded-xl bg-[#f5f7fa] transition-all duration-300">
							<div className="w-11 h-11 rounded-lg bg-[#021d47] flex items-center justify-center text-xl flex-shrink-0">
								{item.icon}
							</div>
							<div>
								<div className="font-body font-bold text-[#021d47] text-[0.94rem] mb-1.5">
									{item.title}
								</div>
								<div className="font-body text-[0.84rem] text-steel-light leading-[1.65]">
									{item.text}
								</div>
							</div>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	)
}
