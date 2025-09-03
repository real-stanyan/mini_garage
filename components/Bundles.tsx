// import react
import { useRef } from "react";

// import utils
import MagicBento from "@/utils/MagicBento";

// gsap
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Bundles = () => {
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
    <div
      className="mx-auto max-w-7xl px-6 mb-20"
      ref={(el) => {
        if (el) FadeInYs.current[0] = el as HTMLDivElement;
      }}
    >
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
