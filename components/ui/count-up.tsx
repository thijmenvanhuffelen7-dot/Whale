"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/** Getal dat bij eerste weergave optelt (DESIGN.md: 600ms). */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  // Standaard de echte waarde (SSR, zoekmachines, geen JS); optellen pas zodra het in beeld komt.
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(value);
      return;
    }
    const c = animate(0, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className="num">
      {format(shown)}
    </span>
  );
}
