import Link from "next/link";

// import utils
import FuzzyText from "@/utils/FuzzyText";

export default function NotFound() {
  return (
    <div
      className={`
        w-full flex justify-center items-center
    `}
    >
      <div className="flex flex-col mt-[100px]">
        <FuzzyText baseIntensity={0.2}>404</FuzzyText>
        {/* <Link href="/">Return Home</Link> */}
      </div>
    </div>
  );
}
