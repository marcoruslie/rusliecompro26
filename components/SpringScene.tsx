"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";

const TURNS = 7;
const HEIGHT = 3.5;
const RADIUS = 1.15;
const TUBE = 0.12;
const COIL_N = 26; // straight → coil flipbook
const COMP_N = 16; // coil → compressed (QC) flipbook
const COMP_MIN_H = 0.6; // compressed pitch factor (coils close, but not touching)

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// `c` = coil factor (0 straight strand → 1 full helix).
// `h` = pitch/height factor (1 relaxed → <1 compressed). Tube radius is
// constant, so the wire stays round — compression only closes the gaps.
function buildGeometry(c: number, h: number) {
  const segs = 220;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const ang = t * TURNS * Math.PI * 2;
    pts.push(
      new THREE.Vector3(
        c * RADIUS * Math.cos(ang),
        (t - 0.5) * HEIGHT * h,
        c * RADIUS * Math.sin(ang)
      )
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, segs, TUBE, 14, false);
}

function Coil({
  progress,
  reduce,
}: {
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const curGeo = useRef<THREE.BufferGeometry | null>(null);

  // Two flipbooks: coiling (full height) and compression (full coil, lower pitch).
  const coilGeos = useMemo(
    () => Array.from({ length: COIL_N }, (_, i) => buildGeometry(i / (COIL_N - 1), 1)),
    []
  );
  const compGeos = useMemo(
    () =>
      Array.from({ length: COMP_N }, (_, i) =>
        buildGeometry(1, THREE.MathUtils.lerp(1, COMP_MIN_H, i / (COMP_N - 1)))
      ),
    []
  );
  useEffect(
    () => () => {
      coilGeos.forEach((g) => g.dispose());
      compGeos.forEach((g) => g.dispose());
    },
    [coilGeos, compGeos]
  );

  const baseEmissive = useMemo(() => new THREE.Color("#0e1217"), []);
  const hotEmissive = useMemo(() => new THREE.Color("#ff4d18"), []);
  const baseColor = useMemo(() => new THREE.Color("#4b515b"), []);
  const hotColor = useMemo(() => new THREE.Color("#b3361a"), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const tt = state.clock.elapsedTime;
    const p = progress.get();

    // STEP 1→2: straight wire winds into a helix.
    const c = reduce ? 1 : smoothstep(0.26, 0.5, p);
    // STEP 4: QC load-test — close the coil pitch (round wire stays round).
    const k = reduce ? 0 : smoothstep(0.78, 1, p);

    const geo =
      k > 0.0001
        ? compGeos[Math.round(k * (COMP_N - 1))]
        : coilGeos[Math.round(c * (COIL_N - 1))];
    if (geo !== curGeo.current) {
      m.geometry = geo;
      curGeo.current = geo;
    }
    m.scale.y = 1; // never squash the mesh — keeps the tube round

    // STEP 3: stress-relief — a brief orange/red glow that cools before QC.
    const heat = reduce
      ? 0
      : smoothstep(0.5, 0.6, p) * (1 - smoothstep(0.62, 0.74, p));
    if (mat.current) {
      mat.current.emissive.copy(tmp.copy(baseEmissive).lerp(hotEmissive, heat));
      mat.current.emissiveIntensity = 0.35 + heat * 1.9;
      mat.current.color.copy(tmp.copy(baseColor).lerp(hotColor, heat * 0.6));
    }

    // Orientation: gentle 3D read + a forming spin while it coils.
    if (reduce) {
      m.rotation.set(0.34, 0.5, 0);
    } else {
      m.rotation.x = 0.34;
      m.rotation.y = tt * 0.28 + c * Math.PI * 0.7;
      m.rotation.z = 0;
    }
  });

  return (
    <mesh ref={mesh} geometry={coilGeos[0]}>
      <meshStandardMaterial
        ref={mat}
        color="#4b515b"
        metalness={0.9}
        roughness={0.42}
        emissive="#0e1217"
        emissiveIntensity={0.35}
      />
    </mesh>
  );
}

export default function SpringScene({
  progress,
  className = "",
}: {
  progress: MotionValue<number>;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 7.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.8]}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={3} />
      <pointLight position={[3, 2, 4]} color="#ffffff" intensity={28} distance={32} />
      {/* faint cyan rim — brand edge accent */}
      <pointLight position={[-3, 1, -6]} color="#22d3ee" intensity={16} distance={26} />
      <Coil progress={progress} reduce={reduce} />
    </Canvas>
  );
}
