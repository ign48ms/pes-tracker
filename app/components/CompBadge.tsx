import React from "react";
import { getCompColor } from "../lib/constants";

interface CompBadgeProps {
  competition: string;
  colorKey?: string;
  className?: string;
}

/**
 * Competition name badge with deterministic coloring.
 */
export default function CompBadge({ competition, colorKey, className = "" }: CompBadgeProps) {
  const cc = getCompColor(competition, colorKey);
  return (
    <span className={`text-[10px] font-bold ${cc.text} ${cc.bg} border ${cc.border} px-2 py-0.5 rounded ${className}`}>
      {competition}
    </span>
  );
}
