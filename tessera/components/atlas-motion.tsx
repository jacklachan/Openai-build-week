"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";

/** A reduced-motion-aware particle accent inspired by the approved Atlas direction. */
export function AtlasMotion() {
  const particleFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = particleFieldRef.current?.querySelectorAll<HTMLElement>("span");

    if (reducedMotion.matches || !particles?.length) {
      return;
    }

    const animation = animate(particles, {
      delay: stagger(180),
      direction: "alternate",
      duration: 1900,
      ease: "inOutSine",
      loop: true,
      opacity: [0.32, 0.92],
      scale: [0.72, 1.08],
      translateY: ["0px", "-8px"],
    });

    return () => {
      animation.cancel();
    };
  }, []);

  return (
    <div ref={particleFieldRef} className="atlasParticleField" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
