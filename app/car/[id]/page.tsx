// components/GarageShowcase.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  ContactShadows,
  Environment,
  useProgress,
  Loader,
  Preload,
} from "@react-three/drei";
import * as THREE from "three";
import { useParams } from "next/navigation";
import carsJson from "@/data/CarData.json";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ---------------- Types ---------------- */
type Vec3 = { x: number; y: number; z: number };
type ViewDef = { pos: Vec3; target: Vec3 } | null;
type CarItem = {
  id: number;
  name: string;
  price_now: string;
  price_was: string;
  discount: string;
  image: string;
  model: string;
  car_init_position?: { position: Vec3; scale: number };
  views?: {
    front?: ViewDef;
    side?: ViewDef;
    back?: ViewDef;
    interior?: ViewDef;
  };
};
const cars = carsJson as CarItem[];

/* ---------- Loading Overlay ---------- */
function LoadingCover() {
  const { progress, active } = useProgress();
  const pct = Math.min(100, Math.round(progress));
  return (
    <div
      className={`absolute inset-0 z-20 grid place-items-center bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#01e4ee]" />
        <p className="mt-3 text-sm text-white/80">{pct}%</p>
        <p className="mt-1 text-xs text-white/60">Loading assets…</p>
      </div>
    </div>
  );
}

/* ---------- Scene: Garage ---------- */
function Garage({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  useEffect(() => {
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.receiveShadow = true;
        o.castShadow = false;
        if (o.material && "envMapIntensity" in o.material) {
          o.material.envMapIntensity = 0.4;
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} position={[-5, 0, 0]} scale={1} />;
}

/* ---------- Model: Car ---------- */
function Car({
  path,
  x,
  y,
  z,
  scale,
}: {
  path: string;
  x: number;
  y: number;
  z: number;
  scale: number;
}) {
  const { scene } = useGLTF(path);
  const g = useRef<THREE.Group>(null);
  return (
    <group ref={g} position={[x, y, z]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

/* ---------- Camera tween ---------- */
type ViewApi = {
  goTo: (
    pos: THREE.Vector3Like,
    target: THREE.Vector3Like,
    dur?: number
  ) => void;
};
function CameraTween({
  controlsRef,
  apiRef,
}: {
  controlsRef: React.MutableRefObject<any>;
  apiRef: React.MutableRefObject<ViewApi | null>;
}) {
  const { camera } = useThree();
  const state = useRef({
    active: false,
    t: 0,
    dur: 0.8,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });
  useEffect(() => {
    apiRef.current = {
      goTo: (pos, target, dur = 0.8) => {
        state.current.active = true;
        state.current.t = 0;
        state.current.dur = dur;
        state.current.fromPos.copy(camera.position);
        state.current.toPos.set(
          pos.x as number,
          pos.y as number,
          pos.z as number
        );
        state.current.fromTarget.copy(
          controlsRef.current?.target || new THREE.Vector3()
        );
        state.current.toTarget.set(
          target.x as number,
          target.y as number,
          target.z as number
        );
      },
    };
  }, [camera, controlsRef, apiRef]);
  useFrame((_, d) => {
    const s = state.current;
    if (!s.active) return;
    s.t += d;
    const k = Math.min(1, s.t / s.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(s.fromPos, s.toPos, e);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(s.fromTarget, s.toTarget, e);
      controlsRef.current.update();
    }
    if (k >= 1) s.active = false;
  });
  return null;
}

const toV3 = (v?: Vec3) => new THREE.Vector3(v?.x ?? 0, v?.y ?? 0, v?.z ?? 0);

/* ---------- Component ---------- */
type ViewKey = "front" | "side" | "back" | "interior" | "full";
type Props = { garagePath?: string };

export default function GarageShowcase({
  garagePath = "/garage_scene/scene.gltf",
}: Props) {
  const { id: routeId } = useParams<{ id?: string }>();
  const idNum = useMemo(() => Number(routeId), [routeId]);

  const car = useMemo<CarItem>(
    () => cars.find((c) => Number(c.id) === idNum) ?? cars[0],
    [idNum]
  );

  const controlsRef = useRef<any>(null);
  const apiRef = useRef<ViewApi | null>(null);

  // 初始视角（Full 返回点）
  const initCamPos = useRef(new THREE.Vector3(4.42, 1.49, -3.99));
  const initTarget = useRef(new THREE.Vector3(0, 0, 0));
  useEffect(() => {
    let raf = 0;
    const probe = () => {
      const ctrl = controlsRef.current;
      if (ctrl) {
        const c = ctrl.object as THREE.PerspectiveCamera;
        const t = ctrl.target as THREE.Vector3;
        initCamPos.current.copy(c.position);
        initTarget.current.copy(t);
        return;
      }
      raf = requestAnimationFrame(probe);
    };
    probe();
    return () => cancelAnimationFrame(raf);
  }, []);

  // ✅ 预加载移到副作用，避免渲染期触发 Loader 状态更新
  useEffect(() => {
    useGLTF.preload(garagePath);
  }, [garagePath]);
  useEffect(() => {
    if (car?.model) useGLTF.preload(car.model);
  }, [car?.model]);

  // 键盘 P 打印相机
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p" && controlsRef.current) {
        const c = controlsRef.current.object as THREE.PerspectiveCamera;
        const t = controlsRef.current.target as THREE.Vector3;
        console.log(
          "pos:",
          c.position.toArray(),
          "target:",
          t.toArray(),
          "fov:",
          c.fov
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // JSON -> THREE
  const views = useMemo(() => {
    const v = car.views ?? {};
    const build = (x?: ViewDef) =>
      x ? { pos: toV3(x.pos), target: toV3(x.target) } : null;
    return {
      front: build(v.front),
      side: build(v.side),
      back: build(v.back),
      interior: build(v.interior),
    } as Record<
      Exclude<ViewKey, "full">,
      { pos: THREE.Vector3; target: THREE.Vector3 } | null
    >;
  }, [car]);

  const go = (k: ViewKey) => {
    if (k === "full") {
      apiRef.current?.goTo(initCamPos.current, initTarget.current, 0.8);
      return;
    }
    const view = (views as any)[k];
    if (!view) return;
    apiRef.current?.goTo(view.pos, view.target, 0.8);
  };

  const buttons: { key: ViewKey; label: string }[] = [
    { key: "full", label: "FULL" },
    { key: "front", label: "FRONT" },
    { key: "side", label: "SIDE" },
    { key: "back", label: "BACK" },
    { key: "interior", label: "INTERIOR" },
  ];

  const initPos = car.car_init_position?.position ?? { x: -2.2, y: 0, z: 0 };
  const initScale = car.car_init_position?.scale ?? 90;

  return (
    <div className="relative h-[calc(100vh-80px)] w-full bg-black">
      <LoadingCover />

      {/* 右上信息 */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-6">
        <div className="pointer-events-auto mt-4 mr-4 w-[600px] rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
          <div className="flex flex-col gap-5">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-white">{car.name}</h3>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  ${car.price_now}
                </span>
                <span className="text-sm text-white/60 line-through">
                  ${car.price_was}
                </span>
                <span className="ml-auto rounded-full border border-[#01e4ee]/50 bg-[#01e4ee]/10 px-2 py-0.5 text-[11px] font-medium text-[#01e4ee]">
                  Save {car.discount}
                </span>
              </div>
            </div>
            <div className="text-[var(--text)]">
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>Specs</AccordionTrigger>
                  <AccordionContent>Engine, wheels, interior…</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          <button className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:border-[#01e4ee]/50 hover:bg-[#01e4ee]/20">
            Add to cart
          </button>
        </div>
      </div>

      {/* 视角切换 */}
      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur">
        <div className="flex gap-1">
          {buttons.map(({ key, label }) => {
            const disabled = key === "full" ? false : !(views as any)[key];
            return (
              <button
                key={key}
                onClick={() => go(key)}
                disabled={disabled}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  disabled
                    ? "cursor-not-allowed opacity-40 text-white/60"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <Canvas
        camera={{ position: [4.42, 1.49, -3.99], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Garage path={garagePath} />

          <Environment preset="studio" background={false} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[6, 8, 4]} intensity={1.4} castShadow />
          <pointLight position={[0, 3, 5]} intensity={2.2} color="#01e4ee" />

          <Car
            key={car.model}
            path={car.model}
            x={car.car_init_position?.position.x ?? -2.2}
            y={car.car_init_position?.position.y ?? 0}
            z={car.car_init_position?.position.z ?? 0}
            scale={car.car_init_position?.scale ?? 90}
          />

          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.45}
            scale={12}
            blur={2}
            far={2}
          />

          {/* 可选：预加载 Canvas 内资源 */}
          <Preload all />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2}
          enableDamping
          dampingFactor={0.08}
        />
        <CameraTween controlsRef={controlsRef} apiRef={apiRef} />
      </Canvas>

      <Loader />
    </div>
  );
}
