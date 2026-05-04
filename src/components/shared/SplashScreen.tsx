import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface Props {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
            onComplete,
          });
        },
      });

      // Logo pulse in
      tl.fromTo(
        logoRef.current,
        { scale: 0.4, opacity: 0, rotation: -15 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: "back.out(1.4)" }
      )
        // App name slides up
        .fromTo(
          textRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
          "-=0.3"
        )
        // Loading bar
        .fromTo(
          barRef.current,
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 1.4, ease: "power2.inOut" },
          "+=0.1"
        )
        // Tagline
        .fromTo(
          taglineRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.8"
        )
        // Hold then exit
        .to({}, { duration: 0.4 });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-950 gap-6"
    >
      {/* Logo mark */}
      <svg
        ref={logoRef}
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="72" height="72" rx="18" fill="#0284c7" />
        <path
          d="M36 18v36M18 36h36"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="36" cy="36" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.4" />
      </svg>

      <div ref={textRef} className="flex flex-col items-center gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Lova Salud
        </h1>
        <p ref={taglineRef} className="text-sm text-slate-400">
          Clinical Center Management
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-surface-800 rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="h-full bg-brand-500 rounded-full"
          style={{ transformOrigin: "left center" }}
        />
      </div>
    </div>
  );
}
