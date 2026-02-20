"use client";
import React, { useState, useRef, useEffect } from "react";
import type { Player } from "../lib/types";
import { getPositionColors, getRatingColors } from "../lib/constants";

const MAX_SUBS = 5;

interface BenchRowProps {
  /** Array of up to 5 bench players (null for empty slots) */
  benchPlayers: (Player | null)[];
  /** All players in the squad (for selection popovers) */
  allPlayers: Player[];
  /** All currently selected IDs (pitch + bench) */
  selectedIds: number[];
  /** Called when a bench slot is added or removed */
  onBenchChange: (slotIndex: number, playerId: number | null) => void;
}

export default function BenchRow({ benchPlayers, allPlayers, selectedIds, onBenchChange }: BenchRowProps) {
  const [popoverSlot, setPopoverSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const popRef = useRef<HTMLDivElement>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);

  const availablePlayers = allPlayers.filter(p => !selectedIds.includes(p.id));

  useEffect(() => {
    if (popoverSlot === null) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setPopoverSlot(null);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverSlot]);

  useEffect(() => {
    if (popoverSlot === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPopoverSlot(null); setSearch(""); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [popoverSlot]);

  const q = search.toLowerCase();
  const filtered = q ? availablePlayers.filter(p => p.name.toLowerCase().includes(q)) : availablePlayers;

  // Compute how many slots to show: filled + 1 empty (up to MAX_SUBS)
  const filledCount = benchPlayers.filter(Boolean).length;
  const slotsToShow = Math.min(MAX_SUBS, filledCount + 1);
  const displaySlots = Array.from({ length: slotsToShow }, (_, i) => benchPlayers[i] ?? null);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bench</span>
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="text-[10px] text-slate-600">{filledCount}/{MAX_SUBS}</span>
      </div>
      <div className="flex flex-wrap gap-2 relative">
        {displaySlots.map((player, i) => (
          <div key={i} className="relative">
            {player ? (
              <div className="relative group">
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow min-w-[60px] sm:min-w-[80px]">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-[8px] sm:text-[9px] font-black px-1 py-0 rounded border ${getPositionColors(player.position)}`}>
                      {player.position}
                    </span>
                    <span className={`text-[8px] sm:text-[10px] font-bold px-1 py-0 rounded border ${getRatingColors(player.rating)}`}>
                      {player.rating}
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-300 text-center truncate max-w-[56px] sm:max-w-[72px] mt-0.5">
                    {player.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onBenchChange(i, null)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                  title="Remove from bench"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  setPopoverRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                  setPopoverSlot(i);
                  setSearch("");
                }}
                className="w-[60px] h-[48px] sm:w-[80px] sm:h-[56px] flex items-center justify-center border-2 border-dashed border-slate-700/50 rounded-lg bg-slate-900/30 hover:bg-slate-800/50 hover:border-slate-600 transition"
                title="Add substitute"
              >
                <span className="text-slate-600 text-lg font-bold hover:text-slate-400">+</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Selection popover */}
      {popoverSlot !== null && popoverRect && (
        <div
          ref={popRef}
          className="fixed z-[200] w-56 max-h-60 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden"
          style={{
            top: Math.min(popoverRect.bottom + 4, window.innerHeight - 260),
            left: Math.max(8, Math.min(popoverRect.left, window.innerWidth - 232)),
          }}
        >
          <div className="p-2 border-b border-slate-700">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Add sub..."
              className="w-full bg-slate-900 text-sm text-slate-200 px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto max-h-44">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  onBenchChange(popoverSlot, p.id);
                  setPopoverSlot(null);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600/20 transition text-sm"
              >
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getPositionColors(p.position)}`}>{p.position}</span>
                <span className="flex-1 text-slate-200 truncate">{p.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRatingColors(p.rating)}`}>{p.rating}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-slate-600 text-xs italic">No players available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
