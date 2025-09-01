// components/Poster.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  Loader,
  useGLTF,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import BlurText from "@/utils/BlurText";
import Aurora from "@/utils/Aurora";

type Props = {
  deadlineISO: string;
  ctaText?: string;
  onCta?: () => void;
  termsText?: string;
  modelPath?: string;
};

function useCountdown(targetISO: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () =>
      setLeft(Math.max(0, new Date(targetISO).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);
  const s = Math.floor(left / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function TimeBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
      <div
        className="text-3xl md:text-4xl font-semibold tabular-nums"
        suppressHydrationWarning
      >
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-1 text-xs tracking-widest text-white/70">{label}</div>
    </div>
  );
}

function CarModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const group = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (group.current) group.current.rotation.y += d * 0.4;
  });
  return (
    <group ref={group} position={[0, -0.7, 0]} scale={160}>
      <primitive object={scene} />
    </group>
  );
}

function formatDeadline(deadlineISO: string) {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Australia/Sydney",
  })
    .format(new Date(deadlineISO))
    .replace(",", "");
}

export default function Poster({
  deadlineISO,
  ctaText = "SHOP NOW",
  onCta,
  termsText = "TERMS APPLY",
  modelPath = "/model.glb",
}: Props) {
  const t = useCountdown(deadlineISO);

  return (
    <div className="relative pt-[80px]">
      {/* ✅ Aurora 当独立背景层；不传 children；放到内容下层 */}
      <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-80">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      {/* ✅ 给 CSS 变量加兜底颜色，防止未定义导致看起来像“没显示” */}
      <section className="w-full min-h-[560px] md:min-h-[580px] bg-[var(--background,_#000)] text-[var(--text,_#fff)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-2 p-6 md:p-10">
          {/* LEFT */}
          <div className="flex flex-col justify-center">
            <BlurText
              text="UP TO"
              delay={150}
              animateBy="words"
              direction="top"
              className="mt-2 text-[48px] md:text-6xl font-bold text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.35)] tracking-wider"
            />
            <BlurText
              text="40% OFF"
              delay={400}
              animateBy="words"
              direction="top"
              className="mt-2 text-[48px] md:text-8xl font-bold text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.35)] tracking-wide"
            />

            <div className="mt-6 grid grid-cols-4 gap-3 w-full max-w-md">
              <TimeBox label="DAYS" value={t.days} />
              <TimeBox label="HOURS" value={t.hours} />
              <TimeBox label="MIN" value={t.minutes} />
              <TimeBox label="SEC" value={t.seconds} />
            </div>

            <p className="mt-6 text-sm text-white/80 tracking-wide">
              LIMITED-TIME HOLIDAY SALE • ENDS {formatDeadline(deadlineISO)}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={onCta}
                className="rounded-2xl border border-cyan-400/60 bg-cyan-500/10 px-6 py-3 text-base font-medium hover:bg-cyan-500/20 transition"
              >
                {ctaText}
              </button>
              <button className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/80 hover:bg-white/10 transition">
                {termsText}
              </button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">
            <Canvas
              camera={{ position: [3.4, 1.6, 6.4], fov: 45 }}
              gl={{ alpha: true }}
              onCreated={({ gl, scene }) => {
                gl.setClearColor(0x000000, 0);
                scene.background = null;
              }}
              style={{ background: "transparent" }}
            >
              <ambientLight intensity={0.2} />
              <directionalLight
                position={[5, 10, 5]}
                intensity={2}
                castShadow
              />

              <pointLight
                position={[0, 3, 5]}
                intensity={3.5}
                color={"#01e4ee"}
                distance={20}
                decay={2}
              />
              <pointLight
                position={[-4, 2, -3]}
                intensity={1.8}
                color={"#ff4fd8"}
                distance={15}
                decay={2}
              />
              <spotLight
                position={[0, 8, 0]}
                angle={0.6}
                intensity={2}
                color={"white"}
                penumbra={0.5}
                castShadow
              />

              <Environment preset="studio" background={false} />
              <CarModel path={modelPath} />
              <ContactShadows
                position={[0, -0.8, 0]}
                opacity={0.65}
                scale={15}
                blur={2.5}
                far={2}
              />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                maxPolarAngle={Math.PI / 2.2}
                minPolarAngle={Math.PI / 3}
                autoRotate
                autoRotateSpeed={0.6}
                enableDamping
                dampingFactor={0.08}
              />
            </Canvas>
          </div>
        </div>
        <Loader />
      </section>
    </div>
  );
}
