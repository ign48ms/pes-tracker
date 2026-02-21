"use client";
import React from "react";
import { useApp } from "../lib/AppContext";

export default function ArchivedTeamBanner() {
  const { isViewingActiveTeam, teamName, activeTeamMeta, switchViewingTeam } = useApp();

  if (isViewingActiveTeam) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-700/40 px-6 py-3 flex items-center justify-between gap-4 sticky top-[65px] z-40 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <p className="text-sm text-amber-200 font-semibold">
          Viewing archived team:{" "}
          <span className="font-black">{teamName}</span>
          <span className="ml-2 text-amber-400/70 font-normal">— read-only</span>
        </p>
      </div>
      <button
        onClick={() => switchViewingTeam(activeTeamMeta.id)}
        className="text-xs font-bold text-amber-300 hover:text-white bg-amber-800/50 hover:bg-amber-700/70 border border-amber-600/50 px-3 py-1.5 rounded transition shrink-0"
      >
        Back to active team
      </button>
    </div>
  );
}
