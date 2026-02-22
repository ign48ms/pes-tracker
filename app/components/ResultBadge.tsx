import React from "react";

interface ResultBadgeProps {
  myScore: number;
  opScore: number;
  penMyScore?: number;
  penOpScore?: number;
  className?: string;
}

/**
 * Score badge with W/D/L coloring.
 * When penalty scores are provided and the main score is a draw,
 * the badge uses the penalty result for colouring and shows the pen score beneath.
 */
export default function ResultBadge({ myScore, opScore, penMyScore, penOpScore, className = "" }: ResultBadgeProps) {
  const hasPens = penMyScore != null && penOpScore != null;
  const isDraw = myScore === opScore;

  // Determine result: use penalties when main score is drawn
  let result: "W" | "D" | "L";
  if (isDraw && hasPens) {
    result = penMyScore > penOpScore ? "W" : penMyScore < penOpScore ? "L" : "D";
  } else {
    result = myScore > opScore ? "W" : myScore < opScore ? "L" : "D";
  }

  const scoreStyle = result === "W"
    ? "bg-green-900/30 text-green-400 border-green-800/50"
    : result === "L"
    ? "bg-red-900/30 text-red-400 border-red-800/50"
    : "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <span className={`inline-flex flex-col items-center px-2.5 py-1 rounded-md font-mono font-bold border ${scoreStyle} ${className}`}>
      <span>{myScore} - {opScore}</span>
      {hasPens && isDraw && (
        <span className="text-[9px] font-semibold opacity-75 leading-tight">({penMyScore}-{penOpScore} pen)</span>
      )}
    </span>
  );
}
