"use client";

import { motion } from "framer-motion";

const GRID_SIZE_PX = 40;
const LINE_COLOR = "hsla(158, 48%, 42%, 0.55)";

/**
 * Fivetran-style footer grid floor animation.
 * 3D tilted grid with radial fade and infinite scroll. Use in a section with overflow-hidden.
 */
export function FivetranGridFooter() {
  return (
    <div
      className="relative w-full h-full min-h-[120px] overflow-hidden"
      style={{
        perspective: 1200,
        perspectiveOrigin: "50% 100%",
      }}
    >
      <div
        className="absolute inset-0 flex items-end justify-center overflow-hidden"
        style={{
          transform: "rotateX(55deg) scale(1.4)",
          transformStyle: "preserve-3d",
          transformOrigin: "center bottom",
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        <motion.div
          className="h-[320px] w-[140vw] max-w-[200vw] shrink-0 rounded-none mx-auto"
          style={{
            backgroundColor: "hsl(var(--background))",
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                ${LINE_COLOR} 0px,
                ${LINE_COLOR} 1px,
                transparent 1px,
                transparent ${GRID_SIZE_PX}px
              ),
              repeating-linear-gradient(
                90deg,
                ${LINE_COLOR} 0px,
                ${LINE_COLOR} 1px,
                transparent 1px,
                transparent ${GRID_SIZE_PX}px
              )
            `,
            backgroundSize: `${GRID_SIZE_PX}px ${GRID_SIZE_PX}px`,
            backgroundRepeat: "repeat",
            maskImage: "radial-gradient(circle at center, white, transparent 80%)",
            WebkitMaskImage: "radial-gradient(circle at center, white, transparent 80%)",
            willChange: "background-position",
          }}
          animate={{
            backgroundPosition: ["0 0", `0 ${GRID_SIZE_PX}px`],
          }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
        />
      </div>
    </div>
  );
}
