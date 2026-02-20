import React from "react";

interface ResultBadgeProps {
  myScore: number;
  opScore: number;
  className?: string;
}

/**
 * Score badge with W/D/L coloring.
 */
export default function ResultBadge({ myScore, opScore, className = "" }: ResultBadgeProps) {
  const result = myScore > opScore ? "W" : myScore < opScore ? "L" : "D";
  const scoreStyle = result === "W"
    ? "bg-green-900/30 text-green-400 border-green-800/50"
    : result === "L"
    ? "bg-red-900/30 text-red-400 border-red-800/50"
    : "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <span className={`px-2.5 py-1 rounded-md font-mono font-bold border ${scoreStyle} ${className}`}>
      {myScore} - {opScore}
    </span>
  );
}
