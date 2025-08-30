"use client";
// import components
import Poster from "@/components/Poster";
import GiftGuide from "@/components/GiftGuide";

export default function Home() {
  return (
    <div>
      <Poster
        deadlineISO="2025-09-12T23:59:00+10:00"
        modelPath="/bmw_m4_csl/scene.gltf"
      />
      <GiftGuide />
    </div>
  );
}
