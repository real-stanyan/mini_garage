"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { HeaderLinks } from "./HeaderLinks";
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
import { ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";

type CartItem = {
  id: string; // 简化用 name，当作 id
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
  // 广播给其他组件（比如角标）
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: items }));
}

export default function Header() {
  const [items, setItems] = useState<CartItem[]>([]);

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
    <div className="relative z-50 flex w-full items-center justify-between px-20 py-5">
      {/* Logo */}
      <div>
        <h1 className="font-bungee text-2xl">MINI GARAGE</h1>
      </div>

      {/* Links */}
      <HeaderLinks />

      {/* Cart */}
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
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>
              {count} item{count !== 1 ? "s" : ""} • Subtotal{" "}
              {fmt.format(subtotal)}
            </SheetDescription>
          </SheetHeader>

          {/* 列表 */}
          <div
            className="mt-6 space-y-4 overflow-y-auto pr-2"
            style={{ maxHeight: "60vh" }}
          >
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your cart is empty.
              </p>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="relative h-16 w-20 overflow-hidden rounded-md bg-black/20">
                    <Image
                      src={it.image}
                      alt={it.name}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="line-clamp-1 text-sm font-medium">
                          {it.name}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {fmt.format(it.price)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(it.id)}
                        aria-label={`Remove ${it.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => dec(it.id)}
                        aria-label="Decrease"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-6 text-center text-sm tabular-nums">
                        {it.qty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => inc(it.id)}
                        aria-label="Increase"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部汇总 */}
          <SheetFooter className="mt-6">
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-white/80">
                Subtotal:&nbsp;
                <span className="font-semibold">{fmt.format(subtotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearCart}>
                  Clear
                </Button>
                <Button>Checkout</Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
