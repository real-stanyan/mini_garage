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
} from "@react-three/drei";
import * as THREE from "three";

// shadcn
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  return <primitive object={scene} position={[0, 0, 0]} scale={1} />;
}

/* ---------- Model: Car ---------- */
function Car({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const g = useRef<THREE.Group>(null);
  return (
    <group ref={g} position={[-2.2, 0, 0]} scale={90}>
      <primitive object={scene} />
    </group>
  );
}

/* ---------- Camera tween 控制器 ---------- */
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
  const state = useRef<{
    active: boolean;
    t: number;
    dur: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  }>({
    active: false,
    t: 0,
    dur: 0.8,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });

  // 暴露 goTo API
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
  }, [apiRef, camera, controlsRef]);

  // 缓动：easeInOutCubic
  useFrame((_, delta) => {
    const s = state.current;
    if (!s.active) return;
    s.t += delta;
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

/* ---------- Component ---------- */
type Props = {
  garagePath?: string;
  carPath?: string;
};

export default function GarageShowcase({
  garagePath = "/garage_scene/scene.gltf",
  carPath = "/bmw_m4_csl/scene.gltf",
}: Props) {
  const product = {
    name: "BMW E34",
    price_now: "24",
    price_was: "32",
    discount: "25%",
    image: "/gift_guide_image/bmw_e34.webp",
  };

  // 预加载
  useGLTF.preload(garagePath);
  useGLTF.preload(carPath);

  // 相机切换
  const controlsRef = useRef<any>(null);
  const apiRef = useRef<ViewApi | null>(null);

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

  // 预设视角（可按实际微调）
  const views = useMemo(
    () => ({
      front: {
        pos: new THREE.Vector3(
          -1.9725084633316852,
          0.8277607365536066,
          3.747474696168479
        ),
        target: new THREE.Vector3(
          -1.465134527851485,
          0.32457392545188435,
          0.2847070510210686
        ),
      },
      side: {
        pos: new THREE.Vector3(
          -8.185049109931075,
          1.213342614338457,
          0.9739296049208075
        ),
        target: new THREE.Vector3(
          -1.7354638745880555,
          0.2821361418576939,
          1.5657712879289445
        ),
      },
      back: {
        pos: new THREE.Vector3(
          -2.4418960457639933,
          0.8765805201561507,
          -3.633176165842797
        ),
        target: new THREE.Vector3(
          -3.1530994475789393,
          0.10251263615489724,
          1.6174404480008082
        ),
      },
      interoir: {
        pos: new THREE.Vector3(
          -2.21332974168409,
          1.1569166028210256,
          -0.6012052470198017
        ),
        target: new THREE.Vector3(
          -2.2521035190134735,
          0.43841262332222847,
          0.8796119891776173
        ),
      },
    }),
    []
  );

  const go = (key: keyof typeof views) => {
    apiRef.current?.goTo(views[key].pos, views[key].target, 0.8);
  };

  return (
    <div className="relative h-[calc(100vh-80px)] w-full bg-black">
      <LoadingCover />

      {/* 右上产品信息 */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-6">
        <div className="pointer-events-auto mt-4 mr-4 w-[600px] rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
          <div className="flex flex-col gap-5">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-white">
                {product.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  ${product.price_now}
                </span>
                <span className="text-sm text-white/60 line-through">
                  ${product.price_was}
                </span>
                <span className="ml-auto rounded-full border border-[#01e4ee]/50 bg-[#01e4ee]/10 px-2 py-0.5 text-[11px] font-medium text-[#01e4ee]">
                  Save {product.discount}
                </span>
              </div>
            </div>

            {/* 这里是示例的 Accordion，保留 */}
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

      {/* 视角切换按钮（画布上方居中） */}
      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur">
        <div className="flex gap-1">
          {(["front", "side", "back", "interoir"] as const).map((k) => (
            <button
              key={k}
              onClick={() => go(k)}
              className="rounded-full px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <Canvas
        camera={{ position: [-4, 1.5, 5], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Garage path={garagePath} />
          <Environment preset="studio" background={false} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[6, 8, 4]} intensity={1.4} castShadow />
          <pointLight position={[0, 3, 5]} intensity={2.2} color="#01e4ee" />
          <Car path={carPath} />
          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.45}
            scale={12}
            blur={2}
            far={2}
          />
        </Suspense>

        {/* OrbitControls + 相机动画控制器 */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
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
