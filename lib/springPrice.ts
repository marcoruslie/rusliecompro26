// Spring weight + IDR price formula. Ported 1-to-1 from the prior Vue
// implementation — shared by the /calculator page and the AI chat quote tool.
// Preserve the exact math (density 7.89, Rp 90 / Rp 180, Math.ceil points).

export interface FormState {
	wireDiameter: string
	innerDiameter: string
	length: string
	constant: string
	pitch: string
	coils: string
}

export interface Result {
	weight: number
	priceSteel: number
	priceStainless: number
	resolvedCoils: number
	resolvedPitch: number
	wireLengthPerCoil: number
	totalWireLength: number
	outerDiameter: number
}

/* ─── Calculation logic (ported 1-to-1 from Vue) ─────────────────── */
export function runCalculation(raw: FormState): Result | null {
	const wireDiameter = parseFloat(raw.wireDiameter)
	const innerDiameter = parseFloat(raw.innerDiameter)
	const length = parseFloat(raw.length)
	const constant = parseFloat(raw.constant)

	if (
		isNaN(wireDiameter) ||
		isNaN(innerDiameter) ||
		isNaN(length) ||
		isNaN(constant) ||
		wireDiameter <= 0 ||
		innerDiameter <= 0 ||
		length <= 0 ||
		constant <= 0
	)
		return null

	// outer diameter
	const outerDiameter = innerDiameter + wireDiameter * 2

	// volume per mm of wire  (π r² × density)
	const volume = Math.PI * Math.pow(wireDiameter / 2, 2) * 7.89

	// wire length per coil (ceil)
	const wireLengthPerCoil = Math.ceil(Math.PI * outerDiameter)

	// resolve coils
	let resolvedCoils: number
	let resolvedPitch: number

	const rawCoils = parseFloat(raw.coils)
	const rawPitch = parseFloat(raw.pitch)

	if (!raw.coils || isNaN(rawCoils) || rawCoils === 0) {
		if (!raw.pitch || isNaN(rawPitch) || rawPitch === 0) {
			resolvedPitch = wireDiameter
			resolvedCoils = Math.ceil(length / (2 * wireDiameter))
		} else {
			resolvedPitch = rawPitch
			resolvedCoils = Math.ceil(length / rawPitch)
		}
	} else {
		resolvedCoils = rawCoils
		resolvedPitch = isNaN(rawPitch) || rawPitch === 0 ? wireDiameter : rawPitch
	}

	const totalWireLength = resolvedCoils * wireLengthPerCoil

	// weight in grams
	const totalWeight = (totalWireLength / 1000) * volume

	if (!totalWeight || totalWeight <= 0) return null

	const pricePerKgSteel = 90
	const pricePerKgStainless = 180

	return {
		weight: totalWeight,
		priceSteel: Math.ceil(totalWeight * pricePerKgSteel * constant),
		priceStainless: Math.ceil(totalWeight * pricePerKgStainless * constant),
		resolvedCoils,
		resolvedPitch,
		wireLengthPerCoil,
		totalWireLength,
		outerDiameter,
	}
}
