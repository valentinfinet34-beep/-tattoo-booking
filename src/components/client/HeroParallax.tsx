"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

const CONTENT_TILT_DEG = 9;
const BG_TILT_DEG = 3;

export function Hero3D({
  background,
  children,
}: {
  background: React.ReactNode;
  children: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgScrollY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.25]);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 90, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 90, damping: 18 });

  const rotateX = useTransform(
    springY,
    [0, 1],
    [CONTENT_TILT_DEG / 2, -CONTENT_TILT_DEG / 2]
  );
  const rotateY = useTransform(
    springX,
    [0, 1],
    [-CONTENT_TILT_DEG / 2, CONTENT_TILT_DEG / 2]
  );
  const contentX = useTransform(springX, [0, 1], [-16, 16]);
  const contentY = useTransform(springY, [0, 1], [-10, 10]);

  const bgRotateX = useTransform(
    springY,
    [0, 1],
    [BG_TILT_DEG / 2, -BG_TILT_DEG / 2]
  );
  const bgRotateY = useTransform(
    springX,
    [0, 1],
    [-BG_TILT_DEG / 2, BG_TILT_DEG / 2]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <div
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0"
    >
      {/* Fond : parallax au scroll + leger tilt 3D pour donner de la profondeur */}
      <motion.div
        style={{ y: bgScrollY, opacity: bgOpacity }}
        className="absolute inset-0 -z-10 [perspective:1400px]"
      >
        <motion.div
          style={{
            rotateX: bgRotateX,
            rotateY: bgRotateY,
            scale: 1.03,
          }}
          className="relative h-full w-full"
        >
          {background}
        </motion.div>
      </motion.div>

      {/* Contenu : bascule en 3D au mouvement de la souris */}
      <div className="flex h-full flex-col items-center justify-center px-6 [perspective:1400px]">
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: contentX,
            y: contentY,
            transformStyle: "preserve-3d",
          }}
          className="flex flex-col items-center"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
