"use client";
// import components
import Poster from "@/components/Poster";
import GiftGuide from "@/components/GiftGuide";
import Bundles from "@/components/Bundles";

// import icons
import { Truck, RefreshCw } from "lucide-react";

export default function Home() {
  return (
    <div>
      <Poster
        deadlineISO="2025-09-12T23:59:00+10:00"
        modelPath="/bmw_m4_csl/scene.gltf"
      />
      <GiftGuide />
      <Bundles />
      <footer
        className={`
        bg-[var(--foreground)]/80 w-full min-h-[50px] text-black font-bold flex flex-col md:flex-row justify-between items-center px-10 py-2
        `}
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
