"use client";

// react
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

// gsap
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// data
import CarData from "@/data/CarData.json";

// shadcn
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// icons
import { Box, Loader as LoaderIcon, Check, X } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Status = 0 | 1 | 2; // 0 idle, 1 success, 2 fail

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
};

type Product = {
  id: number;
  name: string;
  price_now: string;
  price_was?: string;
  image: string;
  discount?: string;
};

const CART_KEY = "cart";

/* ---------- cart helpers ---------- */
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
  const id = p.name; // 简化：用 name 当 id
  const price = Number(p.price_now) || 0;

  const idx = cart.findIndex((it) => it.id === id);
  if (idx >= 0) cart[idx].qty += 1;
  else cart.push({ id, name: p.name, price, image: p.image, qty: 1 });

  writeCart(cart);
  // 可选：通知全局（角标等）
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
  }
}

/* ---------- responsive hook (md breakpoint) ---------- */
function useIsMdUp() {
  const [isMdUp, setIsMdUp] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMdUp;
}

/* ---------- Add-to-cart button (per card state) ---------- */
function AddButton({ item }: { item: Product }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(0); // 0 idle, 1 success, 2 fail
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
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
            src={item.image}
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

/* ---------- GiftGuide ---------- */
const GiftGuide = () => {
  const isMdUp = useIsMdUp();
  const [option, setOption] = useState("All");
  const FadeInYs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    FadeInYs.current.forEach((FadeInY) => {
      if (!FadeInY) return;
      gsap.fromTo(
        FadeInY,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: FadeInY,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }, []);

  return (
    <section
      className="w-full bg-[var(--background,_#000)] text-[var(--text,_#fff)] relative z-10"
      ref={(el) => {
        if (el) FadeInYs.current[0] = el as HTMLDivElement;
      }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h2 className="mb-6 md:mb-0 md:-ml-10 text-4xl md:text-5xl font-archivo-black font-black tracking-wide text-[var(--foreground,_#fff)]">
            Gift Guide
          </h2>
          <div className="flex gap-2 font-semibold text-md">
            <div
              className={`
                rounded-full border transition px-[clamp(10px,3.4vw,14px)] py-[clamp(6px,1.9vw,8px)] cursor-pointer
                ${
                  option === "All"
                    ? "text-[#01e4ee] border-[#01e4ee]/60 bg-[#01e4ee]/15 shadow-[0_0_0_1px_rgba(1,228,238,0.15)_inset]"
                    : "text-white/90 hover:bg-white/10 border-white/30"
                }
              `}
              onClick={() => setOption("All")}
            >
              All
            </div>
            <div
              className={`
                rounded-full border transition px-[clamp(10px,3.4vw,14px)] py-[clamp(6px,1.9vw,8px)] cursor-pointer
                ${
                  option === "Under $30"
                    ? "text-[#01e4ee] border-[#01e4ee]/60 bg-[#01e4ee]/15 shadow-[0_0_0_1px_rgba(1,228,238,0.15)_inset]"
                    : "text-white/90 hover:bg-white/10 border-white/30"
                }
              `}
              onClick={() => setOption("Under $30")}
            >
              Under $30
            </div>
            <div
              className={`
                rounded-full border transition px-[clamp(10px,3.4vw,14px)] py-[clamp(6px,1.9vw,8px)] cursor-pointer
                ${
                  option === "Accessories"
                    ? "text-[#01e4ee] border-[#01e4ee]/60 bg-[#01e4ee]/15 shadow-[0_0_0_1px_rgba(1,228,238,0.15)_inset]"
                    : "text-white/90 hover:bg-white/10 border-white/30"
                }
              `}
              onClick={() => setOption("Accessories")}
            >
              Accessories
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {(CarData as Product[]).map((item, i) => (
            <Link
              href={`/car/${item.id}`}
              key={item.id}
              className="group rounded-2xl border border-[color:var(--foreground,_#fff)]/10 bg-white/5 p-3 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--foreground,_#01e4ee)]/30 hover:shadow-[0_20px_60px_-20px_rgba(1,228,238,0.35)]"
            >
              {/* image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  priority={i < 2}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />

                {item.discount && (
                  <span className="absolute left-1 top-1 md:left-3 md:top-3 rounded-full bg-gradient-to-r from-[#01e4ee] to-[#7c3aed] px-2.5 py-1 text-xs font-semibold text-black/90 shadow-sm">
                    -{item.discount}
                  </span>
                )}

                <Tooltip>
                  <TooltipTrigger className="absolute top-1 right-1 md:top-3 hidden md:block">
                    <Box
                      size={25}
                      color="#ccddde"
                      className="opacity-50 hover:opacity-100 transition-all duration-300 ease-linear"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>3D Model Views</p>
                  </TooltipContent>
                </Tooltip>
              </div>

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

                  {/* 新按钮（带 loading/成功/失败 状态） */}
                  <AddButton item={item} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GiftGuide;
