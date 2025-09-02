"use client";

// import react
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import GlassSurface from "@/utils/GlassSurface";
import { ScrollArea } from "@/components/ui/scroll-area";

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const QUERIES: Record<Exclude<Breakpoint, "xs">, string> = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
};

type CartItem = {
  id: string; // 简化用 name，当作 id
  name: string;
  price: number;
  image: string;
  qty: number;
};

const CART_KEY = "cart";

export function useBreakpoint() {
  const [matches, setMatches] = useState<Record<keyof typeof QUERIES, boolean>>(
    {
      sm: false,
      md: false,
      lg: false,
      xl: false,
      "2xl": false,
    }
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 建立每个断点的 mql 监听
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

    // 监听变化
    const handlers = {} as Record<
      keyof typeof QUERIES,
      (e: MediaQueryListEvent) => void
    >;
    (Object.keys(mqls) as Array<keyof typeof QUERIES>).forEach((key) => {
      handlers[key] = () => update();
      mqls[key].addEventListener("change", handlers[key]);
    });

    return () => {
      (Object.keys(mqls) as Array<keyof typeof QUERIES>).forEach((key) => {
        mqls[key].removeEventListener("change", handlers[key]);
      });
    };
  }, []);

  // 计算当前断点（取满足的最大一个；都不满足则为 xs）
  const bp: Breakpoint = useMemo(() => {
    if (matches["2xl"]) return "2xl";
    if (matches.xl) return "xl";
    if (matches.lg) return "lg";
    if (matches.md) return "md";
    if (matches.sm) return "sm";
    return "xs";
  }, [matches]);

  const flags = useMemo(
    () => ({
      isSmUp: matches.sm,
      isMdUp: matches.md,
      isLgUp: matches.lg,
      isXlUp: matches.xl,
      is2xlUp: matches["2xl"],
    }),
    [matches]
  );

  return { bp, ready, ...flags };
}

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
  // 广播给其他组件（比如角标）
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: items }));
}

export default function Header() {
  const [items, setItems] = useState<CartItem[]>([]);
  const { ready, isMdUp } = useBreakpoint();

  // 初始读取 + 监听两个事件：自定义(cart:updated) 和跨标签页(storage)
  useEffect(() => {
    setItems(readCart());
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as CartItem[] | undefined;
      setItems(detail ?? readCart());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setItems(readCart());
    };
    window.addEventListener("cart:updated", onUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart:updated", onUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // 汇总
  const { count, subtotal } = useMemo(() => {
    const c = items.reduce((n, it) => n + it.qty, 0);
    const s = items.reduce((n, it) => n + it.qty * it.price, 0);
    return { count: c, subtotal: s };
  }, [items]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }),
    []
  );

  // 操作
  const inc = (id: string) => {
    const next = items.map((it) =>
      it.id === id ? { ...it, qty: it.qty + 1 } : it
    );
    setItems(next);
    writeCart(next);
  };
  const dec = (id: string) => {
    const next = items
      .map((it) =>
        it.id === id ? { ...it, qty: Math.max(1, it.qty - 1) } : it
      )
      .filter((it) => it.qty > 0);
    setItems(next);
    writeCart(next);
  };
  const removeItem = (id: string) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    writeCart(next);
  };
  const clearCart = () => {
    setItems([]);
    writeCart([]);
  };

  return (
    <>
      {/* 固定在顶部的外层容器 */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        {/* GlassSurface 作为“条形背景” */}
        <GlassSurface
          width="100%" // 撑满可用宽度
          height={ready && isMdUp ? 80 : 60}
          borderRadius={20} // 圆角
          backgroundOpacity={0.18}
          saturation={1.4}
          blur={12}
          distortionScale={-140}
          redOffset={0}
          greenOffset={8}
          blueOffset={16}
          mixBlendMode="screen" // 比 difference 更自然的光泽
          className="mx-auto max-w-7xl" // 中间定宽，可改成你需要的容器宽度
        >
          {/* 真正的 Header 内容：高度用 h-full 对齐 GlassSurface */}
          <div
            className={`
            flex w-full h-full items-center justify-between px-2 md:px-6
            `}
          >
            {/* 左：Logo */}
            <Link
              href="/"
              className="font-bungee text-lg md:text-2xl whitespace-nowrap"
            >
              MINI GARAGE
            </Link>

            {/* 右：购物车 */}
            <Sheet>
              <SheetTrigger className="relative">
                <ShoppingBag size={28} />
                {/* 角标 */}
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#01e4ee] px-1 text-xs font-semibold text-black">
                    {count}
                  </span>
                )}
              </SheetTrigger>

              <SheetContent className="w-[420px] sm:w-[480px]">
                <SheetHeader>
                  <SheetTitle className="font-archivo-black font-black text-3xl">
                    Cart
                  </SheetTitle>
                  <SheetDescription className="text-xl">
                    {count} item{count !== 1 ? "s" : ""} • Subtotal{" "}
                    {fmt.format(subtotal)}
                  </SheetDescription>
                </SheetHeader>

                {/* Cart items */}
                <div className="mt-4 flex-1 overflow-y-auto px-4">
                  {items.length === 0 ? (
                    <div className="flex h-[40vh] flex-col items-center justify-center text-center text-white/70">
                      <ShoppingBag size={36} className="mb-2 opacity-80" />
                      <p className="text-sm">Your cart is empty.</p>
                      <p className="text-xs text-white/50">
                        Add something you like!
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-full overflow-y-auto">
                      <ul className="space-y-4 w-full">
                        {items.map((it) => (
                          <li
                            key={it.id}
                            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                          >
                            {/* Thumb */}
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-black/30">
                              <Image
                                src={it.image}
                                width={200}
                                height={200}
                                alt={it.name}
                                className="h-full w-full object-contain"
                              />
                            </div>

                            {/* Info + Actions */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="truncate font-medium">
                                  {it.name}
                                </p>
                                <button
                                  onClick={() => removeItem(it.id)}
                                  className="text-xs text-white/60 hover:text-white"
                                  aria-label={`Remove ${it.name}`}
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="mt-2 flex items-center justify-between">
                                {/* Qty controls */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => dec(it.id)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 hover:bg-white/10"
                                    aria-label={`Decrease ${it.name} quantity`}
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm tabular-nums">
                                    {it.qty}
                                  </span>
                                  <button
                                    onClick={() => inc(it.id)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 hover:bg-white/10"
                                    aria-label={`Increase ${it.name} quantity`}
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Line total */}
                                <div className="text-sm font-semibold">
                                  {fmt.format(it.price * it.qty)}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </div>

                {/* SheetFooter */}
                <SheetFooter className="mt-6 bg-[var(--foreground)]/80">
                  <div className="flex w-full items-center justify-between">
                    <div className="text-md text-[var(--background)]">
                      Subtotal:&nbsp;
                      <span className="font-semibold">
                        {fmt.format(subtotal)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={clearCart}
                        className="bg-[var(--background)]"
                      >
                        Clear
                      </Button>
                      <Button className="bg-[var(--background)]">
                        Checkout
                      </Button>
                    </div>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </GlassSurface>
      </header>
    </>
  );
}
