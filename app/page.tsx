"use client";
import { useEffect, useState, useRef, useCallback } from "react";
// components
import Poster from "@/components/Poster";
import GiftGuide from "@/components/GiftGuide";
import Bundles from "@/components/Bundles";
// ui
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// icons
import { Truck, RefreshCw, X, Mail, CheckCircle2 } from "lucide-react";

const SNOOZE_KEY = "subscribe_popup_snooze_until";
const DAY_MS = 24 * 60 * 60 * 1000;

export default function Home() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = Date.now();
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      setShow(!(until && now < until));
    } catch {
      setShow(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + DAY_MS));
    } catch {}
    setShow(false);
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [handleClose]);

  const validate = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate(email)) return setErr("Please enter a valid email.");
    if (!agree) return setErr("Please accept the terms.");
    setErr(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setDone(true);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + DAY_MS));
    } catch {}
  };

  return (
    <div>
      {/* discount code popup */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          {/* window */}
          <div
            ref={cardRef}
            onClick={(e) => e.stopPropagation()}
            className={`
              relative w-[min(92vw,820px)] rounded-2xl text-white
              border border-white/15 shadow-[0_20px_80px_rgba(0,0,0,.55)]
              overflow-hidden pointer-events-auto
            `}
          >
            {/* bg image + overlay + subtle ring */}
            <div className="pointer-events-none absolute inset-0 bg-[url('/popup_bg.webp')] bg-cover bg-center opacity-70" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-black/40" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[var(--foreground)]/25" />

            {/* close */}
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="absolute right-3 top-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <X size={18} />
            </button>

            {/* content */}
            <div className="relative z-10 p-8 sm:p-10">
              {!done ? (
                <>
                  <div className="space-y-3">
                    <h1
                      id="subscribe-title"
                      className="text-2xl sm:text-3xl font-black leading-tight text-[var(--foreground)]"
                    >
                      Subscribe to get{" "}
                      <span className="text-cyan-300">$5 OFF</span> your first
                      order.
                    </h1>
                    <p className="text-white/85">
                      Subscribe to get updates on new arrivals / limited-time
                      offers / exclusive presales.
                    </p>
                  </div>

                  <form onSubmit={submit} className="mt-6 space-y-4">
                    {/* email input */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Mail
                          size={18}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
                        />
                        <Input
                          type="email"
                          inputMode="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 w-full bg-white/10 pl-9 text-white placeholder:text-white/60 border-white/20 focus-visible:ring-cyan-300"
                          aria-describedby="email-help"
                          aria-invalid={!!err && !validate(email)}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="h-11 shrink-0 bg-[var(--foreground)] text-black hover:text-white hover:border-1 hover:border-white font-bold hover:opacity-90"
                      >
                        {submitting ? "Submitting..." : "Subscribe"}
                      </Button>
                    </div>

                    {/* terms */}
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="terms"
                        checked={agree}
                        onCheckedChange={(v) => setAgree(!!v)}
                        className="border-white/40 data-[state=checked]:bg-[var(--foreground)] data-[state=checked]:text-black"
                      />
                      <Label htmlFor="terms" className="text-white/85">
                        I accept the terms & conditions
                      </Label>
                    </div>

                    {/* error */}
                    {err && <p className="text-sm text-red-300">{err}</p>}

                    <p id="email-help" className="text-xs text-white/60">
                      We respect your privacy. Unsubscribe anytime.
                    </p>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <CheckCircle2 className="text-green-300" size={28} />
                  <h2 className="text-xl font-bold">You&apos;re in!</h2>
                  <p className="text-white/85">
                    Check your inbox for your{" "}
                    <span className="text-cyan-300">$5 OFF</span> code.
                  </p>
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={handleClose}
                      className="bg-[var(--foreground)] text-black hover:text-white hover:border-1 hover:border-white font-bold"
                    >
                      Continue shopping
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* page content */}
      <Poster
        deadlineISO="2025-09-12T23:59:00+10:00"
        modelPath="/bmw_m4_csl/scene.gltf"
      />
      <GiftGuide />
      <Bundles />

      <footer
        className="
          bg-[var(--foreground)]/80 w-full min-h-[50px] text-black font-bold
          flex flex-col md:flex-row justify-between items-center px-10 py-2
        "
      >
        <h1 className="whitespace-nowrap">@DEMO-2025</h1>
        <div className="flex flex-col md:flex-row md:gap-2">
          <div className="flex items-center gap-1">
            <Truck size={20} />
            <h1 className="whitespace-nowrap">Free Shipping</h1>
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw size={20} />
            <h1 className="whitespace-nowrap">Easy Returns</h1>
          </div>
        </div>
      </footer>
    </div>
  );
}
