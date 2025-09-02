import React from "react";
import MagicBento from "@/utils/MagicBento";

const Bundles = () => {
  return (
    <div className="mx-auto max-w-7xl px-6 mb-20">
      <h2 className="text-center md:text-left md:-ml-10 mb-6 text-5xl font-archivo-black font-black tracking-wide text-[var(--foreground,_#fff)]">
        Bundles
      </h2>
      <MagicBento
        textAutoHide={true}
        enableStars={true}
        enableSpotlight={true}
        enableBorderGlow={true}
        enableTilt={true}
        enableMagnetism={true}
        clickEffect={true}
        spotlightRadius={300}
        particleCount={12}
        // glowColor="132, 0, 255"
        glowColor="1, 288, 238"
      />
    </div>
  );
};

export default Bundles;
