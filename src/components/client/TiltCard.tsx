"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

const MAX_TILT_DEG = 22;

export function TiltCard({
  src,
  alt,
  index = 0,
}: {
  src: string;
  alt: string;
  index?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)"
  );
  const [glow, setGlow] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * MAX_TILT_DEG;
    const rotateX = (0.5 - py) * MAX_TILT_DEG;

    setTransform(
      `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.08,1.08,1.08)`
    );
    setGlow({ x: px * 100, y: py * 100, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTransform(
      "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)"
    );
    setGlow((g) => ({ ...g, opacity: 0 }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 70, rotateX: -20 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.8,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transform, transition: "transform 0.15s ease-out" }}
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40 transition-shadow duration-300 will-change-transform hover:shadow-[0_35px_80px_-15px_var(--color-accent)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="pointer-events-none h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: glow.opacity,
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.32), transparent 60%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
      </div>
    </motion.div>
  );
}
