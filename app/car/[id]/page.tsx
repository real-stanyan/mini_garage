// app/car/[id]/page.tsx
"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useParams } from "next/navigation";
import carsJson from "@/data/CarData.json";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Info, Loader as LoaderIcon, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Set Decoder
useGLTF.setDecoderPath("/draco/");

/* ---------------- Breakpoint Hook ---------------- */
type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
const QUERIES: Record<Exclude<Breakpoint, "xs">, string> = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
};

export function useBreakpoint() {
  const [matches, setMatches] = useState<Record<keyof typeof QUERIES, boolean>>(
    { sm: false, md: false, lg: false, xl: false, "2xl": false }
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqls = Object.fromEntries(
      Object.entries(QUERIES).map(([k, q]) => [k, window.matchMedia(q)])
    ) as Record<keyof typeof QUERIES, MediaQueryList>;

    const update = () => {
      setMatches({
        sm: mqls.sm.matches,
        md: mqls.md.matches,
        lg: mqls.lg.matches,
        xl: mqls.xl.matches,
        "2xl": mqls["2xl"].matches,
      });
      setReady(true);
    };
    update();

    const handlers: Record<
      keyof typeof QUERIES,
      (e: MediaQueryListEvent) => void
    > = {
      sm: update,
      md: update,
      lg: update,
      xl: update,
      "2xl": update,
    };
    (Object.keys(mqls) as Array<keyof typeof QUERIES>).forEach((key) =>
      mqls[key].addEventListener("change", handlers[key])
    );

    return () => {
      (Object.keys(mqls) as Array<keyof typeof QUERIES>).forEach((key) =>
        mqls[key].removeEventListener("change", handlers[key])
      );
    };
  }, []);

  const bp: Breakpoint = useMemo(() => {
    if (matches["2xl"]) return "2xl";
    if (matches.xl) return "xl";
    if (matches.lg) return "lg";
    if (matches.md) return "md";
    if (matches.sm) return "sm";
    return "xs";
  }, [matches]);

  return { bp, ready, isMdUp: matches.md };
}

/* ---------------- Types ---------------- */
type Status = 0 | 1 | 2;
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
  content: {
    overview: string;
    specs: {
      Color: string;
      Material: string;
      Weight: string;
      Finish: string;
      Length: string;
      Width: string;
      Height: string;
      Wheelbase: string;
    };
  };
  garage_init_position?: { position: Vec3; scale: number };
  car_init_position?: { position: Vec3; scale: number };
  camera_init_position?: { position: Vec3; target?: Vec3; fov: number };
  camera_init_position_mobile?: { position: Vec3; target?: Vec3; fov: number };
  views?: {
    front?: ViewDef;
    side?: ViewDef;
    back?: ViewDef;
    interior?: ViewDef;
  };
  views_mobile?: {
    front?: ViewDef;
    side?: ViewDef;
    back?: ViewDef;
    interior?: ViewDef;
  };
};
const cars = carsJson as CarItem[];

/* ---------------- Cart helpers ---------------- */
type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
};
const CART_KEY = "cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}
function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}
function addToCart(p: { name: string; price_now: string; image: string }) {
  const cart = readCart();
  const id = p.name;
  const price = Number(p.price_now) || 0;
  const idx = cart.findIndex((it) => it.id === id);
  if (idx >= 0) cart[idx].qty += 1;
  else cart.push({ id, name: p.name, price, image: p.image, qty: 1 });
  writeCart(cart);
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
}

/* ---------------- Loading Overlay ---------------- */
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
        <h1 className="font-bungee text-lg md:text-2xl whitespace-nowrap">
          MINI GARAGE
        </h1>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#01e4ee]" />
        <p className="mt-3 text-sm text-white/80">{pct}%</p>
        <p className="mt-1 text-xs text-white/60">Loading assets…</p>
      </div>
    </div>
  );
}

/* ---------------- Scene / Models ---------------- */
function Garage(props: {
  path: string;
  x: number;
  y: number;
  z: number;
  scale: number;
}) {
  const { scene } = useGLTF(props.path);
  useEffect(() => {
    scene.traverse((o: THREE.Object3D) => {
      if (o instanceof THREE.Mesh) {
        o.receiveShadow = true;
        o.castShadow = false;
        const mat = o.material;
        if (mat && !Array.isArray(mat)) {
          (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.4;
        }
      }
    });
  }, [scene]);
  return (
    <primitive
      object={scene}
      position={[props.x, props.y, props.z]}
      scale={props.scale}
    />
  );
}

function Car(props: {
  path: string;
  x: number;
  y: number;
  z: number;
  scale: number;
}) {
  const { scene } = useGLTF(props.path);
  const g = useRef<THREE.Group>(null);
  return (
    <group ref={g} position={[props.x, props.y, props.z]} scale={props.scale}>
      <primitive object={scene} />
    </group>
  );
}

/* ---------------- Camera Tween ---------------- */
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
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
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
      goTo: (pos: THREE.Vector3Like, target: THREE.Vector3Like, dur = 0.8) => {
        state.current.active = true;
        state.current.t = 0;
        state.current.dur = dur;
        state.current.fromPos.copy(camera.position);
        // ✅ 不要用 any，一律用 Vector3Like 的 x/y/z
        state.current.toPos.set(pos.x, pos.y, pos.z);

        const targetNow =
          controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0);
        state.current.fromTarget.copy(targetNow);
        state.current.toTarget.set(target.x, target.y, target.z);
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
    const ctrl = controlsRef.current;
    if (ctrl) {
      ctrl.target.lerpVectors(s.fromTarget, s.toTarget, e);
      ctrl.update();
    }
    if (k >= 1) s.active = false;
  });
  return null;
}

const toV3 = (v?: Vec3) => new THREE.Vector3(v?.x ?? 0, v?.y ?? 0, v?.z ?? 0);

/* ---------------- Page ---------------- */
type ViewKey = "front" | "side" | "back" | "interior" | "full";
type ViewsMap = Record<
  Exclude<ViewKey, "full">,
  { pos: THREE.Vector3; target: THREE.Vector3 } | null
>;

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [addCartStatus, setAddCartStatus] = useState<Status>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [active, setActive] = useState<ViewKey>("full");
  const { id: routeId } = useParams<{ id?: string }>();
  const idNum = useMemo(() => Number(routeId), [routeId]);
  const { ready, isMdUp } = useBreakpoint();

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    setAddCartStatus(0);

    try {
      addToCart(car); // 成功
      // toast.success(`${car.name} added`);
      timers.current.push(
        setTimeout(() => setAddCartStatus(1), 100), // 快速反馈
        setTimeout(() => setAddCartStatus(0), 1800), // 恢复
        setTimeout(() => setLoading(false), 400) // 结束loading
      );
    } catch (err) {
      console.error(err);
      setAddCartStatus(2);
      // toast.error("Failed to add");
      timers.current.push(
        setTimeout(() => setAddCartStatus(0), 1800),
        setTimeout(() => setLoading(false), 400)
      );
    }
  };

  const stateClass =
    addCartStatus === 1
      ? "bg-emerald-500 border-emerald-400 text-black hover:bg-emerald-500"
      : addCartStatus === 2
      ? "bg-rose-500 border-rose-400 text-white hover:bg-rose-500"
      : "";

  const car = useMemo<CarItem>(
    () => cars.find((c) => Number(c.id) === idNum) ?? cars[0],
    [idNum]
  );

  // —— 选择当前使用的相机与视图（首屏统一按桌面，避免水合差异）——
  const isMobile = ready ? !isMdUp : false;

  const camDef = useMemo(
    () =>
      isMobile
        ? car.camera_init_position_mobile ?? car.camera_init_position
        : car.camera_init_position,
    [isMobile, car.camera_init_position, car.camera_init_position_mobile]
  );

  const viewSource = useMemo(
    () => (isMobile ? car.views_mobile : car.views) ?? {},
    [isMobile, car.views, car.views_mobile]
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const apiRef = useRef<ViewApi | null>(null);

  // 初始“FULL”返回点（随 car / 断点变更更新）
  const initCamPos = useRef(toV3(camDef?.position));
  const initTarget = useRef(toV3(camDef?.target ?? { x: 0, y: 0, z: 0 }));
  useEffect(() => {
    initCamPos.current = toV3(camDef?.position);
    initTarget.current = toV3(camDef?.target ?? { x: 0, y: 0, z: 0 });
    setActive("full");
  }, [car.id, isMobile, camDef]);

  // 可选：记录当前相机/目标（便于调试）
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

  // 预加载
  useEffect(() => {
    useGLTF.preload("/garage_scene/scene.gltf");
  }, []);
  useEffect(() => {
    if (car?.model) useGLTF.preload(car.model);
  }, [car?.model]);

  // JSON -> THREE（按当前 viewSource）
  const views: ViewsMap = useMemo(() => {
    const build = (x?: ViewDef) =>
      x ? { pos: toV3(x.pos), target: toV3(x.target) } : null;
    return {
      front: build(viewSource.front),
      side: build(viewSource.side),
      back: build(viewSource.back),
      interior: build(viewSource.interior),
    };
  }, [viewSource]);

  const go = (k: ViewKey) => {
    if (k === "full") {
      setActive("full");
      apiRef.current?.goTo(initCamPos.current, initTarget.current, 0.8);
      return;
    }
    const view = views[k as Exclude<ViewKey, "full">];
    if (!view) return;
    setActive(k);
    apiRef.current?.goTo(view.pos, view.target, 0.8);
  };

  const buttons: { key: ViewKey; label: string }[] = [
    { key: "full", label: "FULL" },
    { key: "front", label: "FRONT" },
    { key: "side", label: "SIDE" },
    { key: "back", label: "BACK" },
    { key: "interior", label: "INTERIOR" },
  ];

  const initGaragePos = car.garage_init_position?.position ?? {
    x: 0,
    y: 0,
    z: 0,
  };
  const initGarageScale = car.garage_init_position?.scale ?? 1;
  const initCarPos = car.car_init_position?.position ?? { x: 0, y: 0, z: 0 };
  const initCarScale = car.car_init_position?.scale ?? 1;

  function CarInfoPanel({ containerClass = "" }: { containerClass?: string }) {
    return (
      <div
        className={[
          "rounded-2xl border border-white/10 bg-black/60 pt-0 md:pt-4 p-4 backdrop-blur",
          containerClass,
        ].join(" ")}
      >
        <div className="flex flex-col gap-1 md:gap-5">
          <div className="flex-1 space-y-2">
            <h3 className="hidden md:inline text-2xl md:text-4xl font-black font-montserrat text-white">
              {car.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-white">
                ${car.price_now}
              </span>
              <span className="text-xl text-white/60 line-through">
                ${car.price_was}
              </span>
              <span className="ml-auto rounded-full border border-[#01e4ee]/50 bg-[#01e4ee]/10 px-2 py-0.5 text-lg md:text-xl font-medium text-[#01e4ee]">
                Save {car.discount}
              </span>
            </div>
          </div>

          <div className="text-[var(--text)]">
            <Accordion
              type="single"
              collapsible
              defaultValue="specs"
              className="text-white/90"
            >
              <AccordionItem value="specs">
                <AccordionTrigger>Specs</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <dt className="text-white/60">Color</dt>
                      <dd className="font-medium">
                        {car.content?.specs?.Color ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/60">Material</dt>
                      <dd className="font-medium">
                        {car.content?.specs?.Material ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/60">Weight</dt>
                      <dd className="font-medium">
                        {car.content?.specs?.Weight ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/60">Finish</dt>
                      <dd className="font-medium">
                        {car.content?.specs?.Finish ?? "—"}
                      </dd>
                    </div>

                    <div className="col-span-2 mt-2 border-t border-white/10 pt-2 grid grid-cols-4 gap-2">
                      <div>
                        <dt className="text-white/60 text-xs">Length</dt>
                        <dd className="font-medium">
                          {car.content?.specs?.Length ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/60 text-xs">Width</dt>
                        <dd className="font-medium">
                          {car.content?.specs?.Width ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/60 text-xs">Height</dt>
                        <dd className="font-medium">
                          {car.content?.specs?.Height ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/60 text-xs">Wheelbase</dt>
                        <dd className="font-medium">
                          {car.content?.specs?.Wheelbase ?? "—"}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="overview">
                <AccordionTrigger>Overview</AccordionTrigger>
                <AccordionContent>
                  <p className="leading-relaxed text-white/70">
                    {car.content?.overview ?? "—"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="shipping">
                <AccordionTrigger>Shipping & Returns</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1 text-white/75 text-sm">
                    <li>In-stock items ship within 24-48 hours</li>
                    <li>
                      Pre-order items ship per the ETA on the product page
                    </li>
                    <li>7-day no-reason return policy</li>
                    <li>
                      Shipping fees shown at checkout; free shipping in select
                      regions
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="warranty">
                <AccordionTrigger>Warranty</AccordionTrigger>
                <AccordionContent>
                  <p className="text-white/75 text-sm">
                    12-month limited warranty. Free replacement/repair for
                    non-human damage.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <Button
          onClick={handleAddToCart}
          type="button"
          disabled={loading}
          aria-busy={loading}
          className={`
          mt-4 w-full rounded-xl border px-4 py-2 text-sm transition
          disabled:opacity-60 disabled:cursor-not-allowed border-white/10
        bg-white/10 hover:border-[#01e4ee]/50 hover:bg-[#01e4ee]/20
          ${stateClass}
        `}
          aria-label={`Add ${car.name}`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2 text-white">
              <LoaderIcon size={18} className="animate-spin" />
              Processing...
            </span>
          ) : addCartStatus === 1 ? (
            <span className="inline-flex items-center gap-2 text-white">
              <Check size={18} />
              Added
            </span>
          ) : addCartStatus === 2 ? (
            <span className="inline-flex items-center gap-2 text-white">
              <X size={18} />
              Failed
            </span>
          ) : (
            "Add to cart"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-[100svh] w-full bg-black overflow-hidden">
      <LoadingCover />

      {/* info */}
      <div className="hidden md:block">
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end p-6 top-[120px] right-10">
          <CarInfoPanel containerClass="pointer-events-auto w-[600px]" />
        </div>
      </div>

      {/* Bottom actions (mobile-friendly) */}
      <div
        className={`
        fixed left-1/2 bottom-5 z-50 -translate-x-1/2
        w-full max-w-[720px] px-3 sm:px-4
        pointer-events-none
        `}
        style={{
          // 兼容新旧 iOS 安全区：env + constant
          paddingBottom:
            "calc((env(safe-area-inset-bottom, 0px) + constant(safe-area-inset-bottom, 0px)) + 16px)",
        }}
      >
        <div className="w-full space-y-2 sm:space-y-3 pointer-events-auto mx-auto">
          {/* 顶行：加购 + 移动端信息气泡（仅在 md 以下显示） */}
          <div className="flex md:hidden items-center gap-2 sm:gap-3 h-[50px]">
            {/* Add to cart Button */}
            <Button
              onClick={handleAddToCart}
              type="button"
              disabled={loading}
              aria-busy={loading}
              className={`
            px-4 py-2 text-sm transition h-full
            disabled:opacity-60 disabled:cursor-not-allowed flex-1 
            rounded-xl border border-white/15 bg-black/60
            ${stateClass}
          `}
              aria-label={`Add ${car.name}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 text-white">
                  <LoaderIcon size={18} className="animate-spin" />
                  Processing...
                </span>
              ) : addCartStatus === 1 ? (
                <span className="inline-flex items-center gap-2 text-white">
                  <Check size={18} />
                  Added
                </span>
              ) : addCartStatus === 2 ? (
                <span className="inline-flex items-center gap-2 text-white">
                  <X size={18} />
                  Failed
                </span>
              ) : (
                "Add to cart"
              )}
            </Button>

            {/* Info Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  className="
              shrink-0 rounded-full border border-white/15 bg-black/60 backdrop-blur
              h-full w-[clamp(88px,13vw,104px)]
              flex items-center justify-center shadow-lg active:scale-95 transition group
            "
                  aria-label="Show car details"
                  title="Details"
                  variant="ghost"
                >
                  <Info
                    className={`
                  h-[clamp(36px,8vw,40px)] w-[clamp(36px,8vw,40px)] text-white
                  group-hover:text-black
                    `}
                  />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="bottom"
                className="h-[80vh] p-4 bg-black/80 border-white/10 backdrop-blur overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle className="font-montserrat text-2xl">
                    {car.name}
                  </SheetTitle>
                </SheetHeader>
                {/* 复用信息面板 */}
                <CarInfoPanel containerClass="w-full border-0 bg-transparent p-0 backdrop-blur-0" />
              </SheetContent>
            </Sheet>
          </div>

          {/* 视角切换：可横向滚动，保持可点触 */}
          <div className="flex justify-center">
            <div
              className="
        rounded-full border border-white/10 bg-black/60 backdrop-blur
        shadow-[0_10px_40px_-10px_rgba(1,228,238,0.25)]
      "
            >
              <div className="flex gap-1 overflow-x-auto no-scrollbar whitespace-nowrap px-1 py-1 touch-pan-x">
                {buttons.map(({ key, label }) => {
                  const disabled =
                    key !== "full" && !views[key as Exclude<ViewKey, "full">];
                  const isActive = active === key;
                  return (
                    <button
                      key={key}
                      onClick={() => go(key)}
                      disabled={disabled}
                      aria-pressed={isActive}
                      className={[
                        "rounded-full border transition",
                        "px-[clamp(10px,3.4vw,14px)] py-[clamp(6px,1.9vw,8px)]",
                        "text-[clamp(11px,3.1vw,12px)]",
                        disabled
                          ? "cursor-not-allowed opacity-40 text-white/60 border-transparent"
                          : isActive
                          ? "text-[#01e4ee] border-[#01e4ee]/60 bg-[#01e4ee]/15 shadow-[0_0_0_1px_rgba(1,228,238,0.15)_inset]"
                          : "text-white/90 hover:bg-white/10 border-transparent",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas：随着 car 或断点变化重建，应用对应的初始相机 */}
      <Canvas
        key={`${car.id}-${isMobile ? "m" : "d"}`}
        camera={{
          position: toV3(camDef?.position),
          fov: camDef?.fov ?? 45,
        }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Garage
            path={"/garage_scene/scene.gltf"}
            x={initGaragePos.x}
            y={initGaragePos.y}
            z={initGaragePos.z}
            scale={initGarageScale}
          />

          <Environment preset="studio" background={false} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[6, 8, 4]} intensity={1.4} castShadow />
          <pointLight position={[0, 3, 5]} intensity={2.2} color="#01e4ee" />

          <Car
            key={car.model}
            path={car.model}
            x={initCarPos.x}
            y={initCarPos.y}
            z={initCarPos.z}
            scale={initCarScale}
          />

          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.45}
            scale={12}
            blur={2}
            far={2}
          />
          <Preload all />
        </Suspense>

        {/* <OrbitControls
          key={`${car.id}-${isMobile ? "m" : "d"}`}
          ref={controlsRef}
          target={toV3(camDef?.target ?? { x: 0, y: 0, z: 0 })}
          enablePan
          enableZoom
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2}
          enableDamping
          dampingFactor={0.08}
        /> */}
        <OrbitControls
          ref={controlsRef}
          target={toV3(camDef?.target ?? { x: 0, y: 0, z: 0 })}
          enableRotate={false}
          enablePan={false}
          enableZoom={false}
        />
        <CameraTween controlsRef={controlsRef} apiRef={apiRef} />
      </Canvas>

      <Loader />
    </div>
  );
}
