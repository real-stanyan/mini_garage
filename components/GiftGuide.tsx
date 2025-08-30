"use client";

import Image from "next/image";
import { Button } from "./ui/button";

type CartItem = {
  id: string; // 用 name 充当 id（真实项目建议用 sku）
  name: string;
  price: number; // 单价（现价）
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
  const id = p.name; // 简化：用 name 当 id
  const price = Number(p.price_now) || 0;

  const idx = cart.findIndex((it) => it.id === id);
  if (idx >= 0) {
    cart[idx].qty += 1;
  } else {
    cart.push({ id, name: p.name, price, image: p.image, qty: 1 });
  }
  writeCart(cart);

  // 可选：触发事件给全局监听（比如 header 购物车角标）
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
}

const GiftData = [
  {
    name: "BMW E34",
    price_now: "24",
    price_was: "32",
    discount: "25%",
    image: "/gift_guide_image/bmw_e34.webp",
  },
  {
    name: "BMW M3 E30",
    price_now: "32",
    price_was: "37",
    discount: "30%",
    image: "/gift_guide_image/bmw_m3_e30.webp",
  },
  {
    name: "TOYOTA GR SUPRA",
    price_now: "34",
    price_was: "58",
    discount: "40%",
    image: "/gift_guide_image/toyota_gr_supra.webp",
  },
  {
    name: "BMW M2 G87",
    price_now: "41",
    price_was: "58",
    discount: "20%",
    image: "/gift_guide_image/bmw_m2_g87.webp",
  },
];

const GiftGuide = () => {
  return (
    <section className="w-full py-12">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-6 text-2xl font-semibold tracking-wide text-[var(--foreground,_#fff)]">
          Gift Guide
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GiftData.map((item, i) => (
            <div
              key={i}
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
                  <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-[#01e4ee] to-[#7c3aed] px-2.5 py-1 text-xs font-semibold text-black/90 shadow-sm">
                    -{item.discount}
                  </span>
                )}
              </div>

              {/* content */}
              <div className="mt-4 space-y-3 px-1">
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

                  <Button
                    onClick={() => addToCart(item)}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm transition hover:border-[#01e4ee]/50 hover:bg-[#01e4ee]/20"
                    aria-label={`Add ${item.name}`}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GiftGuide;
