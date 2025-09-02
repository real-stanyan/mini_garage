"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import SetData from "@/data/SetData.json";
import { Button } from "@/components/ui/button";
import { Loader as LoaderIcon, Check, X } from "lucide-react";
import { toast } from "sonner";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
};

type Status = 0 | 1 | 2; // 0 idle, 1 success, 2 fail

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

type Product = {
  id: number | string;
  name: string;
  image: string;
  price_now: string;
  price_was?: string;
  discount?: string;
};

const CART_KEY = "cart";

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "132, 0, 255";
const MOBILE_BREAKPOINT = 768;

/* ---------------- util ---------------- */
const createParticleElement = (
  x: number,
  y: number,
  color: string = DEFAULT_GLOW_COLOR
): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px; height: 4px; border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none; z-index: 100;
    left: ${x}px; top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

/* ---------------- Cart helpers ---------------- */
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
  }
}

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

/* ---------------- AddButton ---------------- */
function AddButton({ item }: { item: Product }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const stateClass =
    status === 1
      ? "bg-emerald-500 border-emerald-400 text-black hover:bg-emerald-500"
      : status === 2
      ? "bg-rose-500 border-rose-400 text-white hover:bg-rose-500"
      : "border-white/10 bg-white/10 hover:border-[#01e4ee]/50 hover:bg-[#01e4ee]/20";

  const handle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    setStatus(0);
    try {
      addToCart(item);
      toast(
        <div className="flex justify-between items-center gap-3">
          <Image
            src={item.image || "/bundles_image/cleaning_set.webp"}
            alt={item.name}
            width={100}
            height={100}
            className="rounded-md object-contain"
          />
          <div className="space-y-0.5 text-black">
            <p className="font-medium">Added to cart</p>
            <p className="text-base">
              {item.name} • <span className="pr-1">${item.price_now}</span>
              {item.price_was && (
                <span className="line-through">${item.price_was}</span>
              )}
            </p>
          </div>
        </div>,
        { duration: 3000 }
      );
      timers.current.push(
        setTimeout(() => setStatus(1), 100),
        setTimeout(() => setStatus(0), 1500),
        setTimeout(() => setLoading(false), 400)
      );
    } catch (err) {
      console.error(err);
      setStatus(2);
      timers.current.push(
        setTimeout(() => setStatus(0), 1500),
        setTimeout(() => setLoading(false), 400)
      );
    }
  };

  return (
    <Button
      onClick={handle}
      type="button"
      disabled={loading}
      aria-busy={loading}
      className={`rounded-xl border px-4 py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed ${stateClass}`}
      aria-label={`Add ${item.name}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <LoaderIcon size={18} className="animate-spin" />
          <span className="hidden md:inline">Processing...</span>
        </span>
      ) : status === 1 ? (
        <span className="inline-flex items-center gap-2">
          <Check size={18} />
          <span className="hidden md:inline">Added</span>
        </span>
      ) : status === 2 ? (
        <span className="inline-flex items-center gap-2">
          <X size={18} />
          <span className="hidden md:inline">Failed</span>
        </span>
      ) : (
        "Add"
      )}
    </Button>
  );
}

/* ---------------- ParticleCard ---------------- */
const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}> = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(
        Math.random() * width,
        Math.random() * height,
        glowColor
      )
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        // ❗关键修复：不要返回 removeChild 的返回值，保持 void
        onComplete: () => {
          // 更简洁：remove() 返回 void，完全符合 gsap.Callback
          p.remove();
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInitialized.current) initializeParticles();

    memoizedParticles.current.forEach((particle, index) => {
      const id = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 100);
      timeoutsRef.current.push(id);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const el = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
      if (enableTilt) {
        gsap.to(el, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();
      if (enableTilt) {
        gsap.to(el, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
      if (enableMagnetism) {
        gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: "power2.out" });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      if (enableTilt) {
        gsap.to(el, {
          rotateX: ((y - cy) / cy) * -10,
          rotateY: ((x - cx) / cx) * 10,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
      if (enableMagnetism) {
        gsap.to(el, {
          x: (x - cx) * 0.05,
          y: (y - cy) * 0.05,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const maxD = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );
      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: absolute;
        width: ${maxD * 2}px; height: ${maxD * 2}px; border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxD}px; top: ${
          y - maxD
        }px; pointer-events: none; z-index: 1000;
      `;
      el.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => {
            ripple.remove(); // remove() 返回 void，类型安全
          },
        }
      );
    };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("click", handleClick);

    return () => {
      isHoveredRef.current = false;
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("click", handleClick);
      clearAllParticles();
    };
  }, [
    animateParticles,
    clearAllParticles,
    disableAnimations,
    enableTilt,
    enableMagnetism,
    clickEffect,
    glowColor,
  ]);

  return (
    <div
      ref={cardRef}
      className={`${className} relative overflow-hidden`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
};

/* ---------------- Spotlight ---------------- */
const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest(".bento-section");
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside || false;
      const cards = gridRef.current.querySelectorAll(".card");

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
        cards.forEach((card) => {
          (card as HTMLElement).style.setProperty("--glow-intensity", "0");
        });
        return;
      }

      const { proximity, fadeDistance } =
        calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach((card) => {
        const el = card as HTMLElement;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const distance =
          Math.hypot(e.clientX - cx, e.clientY - cy) -
          Math.max(r.width, r.height) / 2;
        const d = Math.max(0, distance);
        minDistance = Math.min(minDistance, d);

        let glowIntensity = 0;
        if (d <= proximity) glowIntensity = 1;
        else if (d <= fadeDistance)
          glowIntensity = (fadeDistance - d) / (fadeDistance - proximity);

        updateCardGlowProperties(
          el,
          e.clientX,
          e.clientY,
          glowIntensity,
          spotlightRadius
        );
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: "power2.out",
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
          ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
          : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll(".card").forEach((card) => {
        (card as HTMLElement).style.setProperty("--glow-intensity", "0");
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

/* ---------------- Grid shell ---------------- */
const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ children, gridRef }) => (
  <div
    className="bento-section grid gap-2 max-w-full select-none relative"
    style={{ fontSize: "clamp(1rem, 0.9rem + 0.5vw, 1.5rem)" }}
    ref={gridRef}
  >
    {children}
  </div>
);

/* ---------------- hooks ---------------- */
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
};

/* ---------------- MagicBento ---------------- */
const MagicBento: React.FC<BentoProps> = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const isDesktop = useIsDesktop();
  const shouldDisableAnimations = disableAnimations || isMobile;

  const HIDE_ON_DESKTOP = new Set([1, 2, 5, 6]);

  return (
    <>
      <style>
        {`
          .bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: #392e4e;
            --background-dark: #060010;
            --white: hsl(0, 0%, 100%);
            --purple-primary: rgba(132, 0, 255, 1);
            --purple-glow: rgba(132, 0, 255, 0.2);
            --purple-border: rgba(132, 0, 255, 0.8);
          }

          .card-responsive {
            grid-template-columns: 1fr;
            width: 90%;
            margin: 0 auto;
            padding: 0.5rem;
          }

          @media (min-width: 500px) {
            .card-responsive { grid-template-columns: repeat(1, 1fr); }
          }

          @media (min-width: 700px) {
            .card-responsive { grid-template-columns: repeat(2, 1fr); }
          }

          @media (min-width: 1024px) {
            .card-responsive { grid-template-columns: repeat(4, 1fr); }
            .card-responsive .card:nth-child(3) { grid-column: span 2; grid-row: span 2; }
            .card-responsive .card:nth-child(4) { grid-column: 1 / span 2; grid-row: 2 / span 2; }
            .card-responsive .card:nth-child(6) { grid-column: 4; grid-row: 3; }
          }

          .card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 6px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.8)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 30%,
                transparent 60%);
            border-radius: inherit;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: subtract;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 1;
          }

          .card--border-glow:hover::after { opacity: 1; }
          .card--border-glow:hover { box-shadow: 0 4px 20px rgba(46, 24, 78, 0.4), 0 0 30px rgba(${glowColor}, 0.2); }

          .particle::before {
            content: '';
            position: absolute;
            top: -2px; left: -2px; right: -2px; bottom: -2px;
            background: rgba(${glowColor}, 0.2);
            border-radius: 50%;
            z-index: -1;
          }

          .particle-container:hover { box-shadow: 0 4px 20px rgba(46, 24, 78, 0.2), 0 0 30px rgba(${glowColor}, 0.2); }

          .text-clamp-1,.text-clamp-2 { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-box-orient: vertical; }
          .text-clamp-1 { -webkit-line-clamp: 1; line-clamp: 1; }
          .text-clamp-2 { -webkit-line-clamp: 2; line-clamp: 2; }

          @media (max-width: 599px) {
            .card-responsive { grid-template-columns: 1fr; width: 90%; margin: 0 auto; padding: 0.5rem; }
            .card-responsive .card { width: 100%; min-height: 180px; }
          }
        `}
      </style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        <div className="card-responsive grid gap-2">
          {(SetData as Product[]).map((item, index) => {
            const baseClassName = `card group flex flex-col justify-between relative aspect-[4/3] min-h-[200px] w-full max-w-full p-5 rounded-[20px] border border-solid font-light overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] ${
              enableBorderGlow ? "card--border-glow" : ""
            }`;

            const cardStyle = {
              backgroundColor: "var(--background-dark)",
              borderColor: "var(--border-color)",
              color: "var(--white)",
              "--glow-x": "50%",
              "--glow-y": "50%",
              "--glow-intensity": "0",
              "--glow-radius": `${spotlightRadius}px`,
            } as React.CSSProperties;

            const idNum = Number(item.id);
            const hasImage =
              typeof item.image === "string" && item.image.trim() !== "";
            const showImage =
              hasImage && !(isDesktop && HIDE_ON_DESKTOP.has(idNum));

            const ImageBlock = showImage ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image
                  src={item.image as string}
                  alt={item.name}
                  fill
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  priority={index < 2}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                {item.discount && (
                  <span className="absolute left-1 top-1 md:left-3 md:top-3 rounded-full bg-gradient-to-r from-[#01e4ee] to-[#7c3aed] px-2.5 py-1 text-xs font-semibold text-black/90 shadow-sm">
                    -{item.discount}
                  </span>
                )}
              </div>
            ) : null;

            if (enableStars) {
              return (
                <ParticleCard
                  key={item.id}
                  className={baseClassName}
                  style={cardStyle}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={DEFAULT_PARTICLE_COUNT}
                  glowColor={DEFAULT_GLOW_COLOR}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                >
                  {ImageBlock}

                  {/* content */}
                  <div className="mt-4 space-y-1 md:space-y-3 px-1">
                    <h3 className="line-clamp-1 text-base font-medium text-[var(--foreground,_#fff)]">
                      {item.name}
                    </h3>

                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-semibold tracking-tight text-[var(--foreground,_#fff)]">
                            ${item.price_now}
                          </span>
                          {item.price_was && (
                            <span className="text-sm text-[var(--foreground,_#fff)]/60 line-through">
                              ${item.price_was}
                            </span>
                          )}
                        </div>

                        {item.discount && (
                          <span className="inline-flex items-center rounded-full border border-[#01e4ee]/40 bg-[#01e4ee]/10 px-2 py-0.5 text-[11px] font-medium text-[#01e4ee]">
                            Save {item.discount}
                          </span>
                        )}
                      </div>

                      <AddButton item={item} />
                    </div>
                  </div>
                </ParticleCard>
              );
            }

            return (
              <div
                key={item.id}
                className={baseClassName}
                style={cardStyle}
                ref={(el) => {
                  if (!el) return;

                  const handleMouseMove = (e: MouseEvent) => {
                    if (shouldDisableAnimations) return;
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const cx = rect.width / 2;
                    const cy = rect.height / 2;

                    if (enableTilt) {
                      gsap.to(el, {
                        rotateX: ((y - cy) / cy) * -10,
                        rotateY: ((x - cx) / cx) * 10,
                        duration: 0.1,
                        ease: "power2.out",
                        transformPerspective: 1000,
                      });
                    }
                    if (enableMagnetism) {
                      gsap.to(el, {
                        x: (x - cx) * 0.05,
                        y: (y - cy) * 0.05,
                        duration: 0.3,
                        ease: "power2.out",
                      });
                    }
                  };

                  const handleMouseLeave = () => {
                    if (shouldDisableAnimations) return;
                    if (enableTilt) {
                      gsap.to(el, {
                        rotateX: 0,
                        rotateY: 0,
                        duration: 0.3,
                        ease: "power2.out",
                      });
                    }
                    if (enableMagnetism) {
                      gsap.to(el, {
                        x: 0,
                        y: 0,
                        duration: 0.3,
                        ease: "power2.out",
                      });
                    }
                  };

                  const handleClick = (e: MouseEvent) => {
                    if (!clickEffect || shouldDisableAnimations) return;
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const maxD = Math.max(
                      Math.hypot(x, y),
                      Math.hypot(x - rect.width, y),
                      Math.hypot(x, y - rect.height),
                      Math.hypot(x - rect.width, y - rect.height)
                    );
                    const ripple = document.createElement("div");
                    ripple.style.cssText = `
                      position: absolute;
                      width: ${maxD * 2}px; height:${
                        maxD * 2
                      }px; border-radius:50%;
                      background: radial-gradient(circle, rgba(${DEFAULT_GLOW_COLOR}, 0.4) 0%, rgba(${DEFAULT_GLOW_COLOR}, 0.2) 30%, transparent 70%);
                      left:${x - maxD}px; top:${
                        y - maxD
                      }px; pointer-events:none; z-index:1000;
                    `;
                    el.appendChild(ripple);
                    gsap.fromTo(
                      ripple,
                      { scale: 0, opacity: 1 },
                      {
                        scale: 1,
                        opacity: 0,
                        duration: 0.8,
                        ease: "power2.out",
                        onComplete: () => {
                          ripple.remove();
                        },
                      }
                    );
                  };

                  el.addEventListener("mousemove", handleMouseMove);
                  el.addEventListener("mouseleave", handleMouseLeave);
                  el.addEventListener("click", handleClick);
                }}
              >
                {ImageBlock}

                {/* content */}
                <div className="mt-4 space-y-1 md:space-y-3 px-1">
                  <h3 className="line-clamp-1 text-base font-medium text-[var(--foreground,_#fff)]">
                    {item.name}
                  </h3>

                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tracking-tight text-[var(--foreground,_#fff)]">
                          ${item.price_now}
                        </span>
                        {item.price_was && (
                          <span className="text-sm text-[var(--foreground,_#fff)]/60 line-through">
                            ${item.price_was}
                          </span>
                        )}
                      </div>

                      {item.discount && (
                        <span className="inline-flex items-center rounded-full border border-[#01e4ee]/40 bg-[#01e4ee]/10 px-2 py-0.5 text-[11px] font-medium text-[#01e4ee]">
                          Save {item.discount}
                        </span>
                      )}
                    </div>

                    <AddButton item={item} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </BentoCardGrid>
    </>
  );
};

export default MagicBento;
