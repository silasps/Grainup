"use client";

import { useEffect, useState } from "react";

const POSITIONS = [
  { top: "15%", left: "10%" },
  { top: "15%", left: "70%" },
  { top: "40%", left: "35%" },
  { top: "65%", left: "15%" },
  { top: "65%", left: "65%" },
  { top: "80%", left: "40%" },
];

interface Props {
  text: string; // "João Silva • joao@email.com"
}

export function WatermarkOverlay({ text }: Props) {
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPosIndex((i) => (i + 1) % POSITIONS.length);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const pos = POSITIONS[posIndex];

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden"
      aria-hidden="true"
    >
      <span
        style={{
          position:   "absolute",
          top:        pos.top,
          left:       pos.left,
          transform:  "rotate(-25deg)",
          color:      "rgba(255,255,255,0.22)",
          fontSize:   "13px",
          fontWeight: 500,
          whiteSpace: "nowrap",
          transition: "top 0.8s ease, left 0.8s ease",
          userSelect: "none",
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
