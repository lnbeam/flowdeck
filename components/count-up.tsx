"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

/** Smoothly tweens from the previous value to the new one with GSAP. */
export function CountUp({ value, format, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: prev.current };
    const tween = gsap.to(obj, {
      v: value,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = fmt(obj.v);
      },
    });
    prev.current = value;
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {fmt(prev.current)}
    </span>
  );
}
