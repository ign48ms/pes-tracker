"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import type { Player, FormationSlot } from "../lib/types";
import { FORMATIONS, DEFAULT_FORMATION, getPositionColors, getRatingColors, POS_ORDER } from "../lib/constants";

interface SlotPopoverProps {
  slot: FormationSlot;
  availablePlayers: Player[];
  onSelect: (playerId: number) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  pitchRect: DOMRect | null;
}

function SlotPopover({ slot, availablePlayers, onSelect, onClose, anchorRect, pitchRect }: SlotPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Split players into suggested (position match) and others, sorted by position priority
  const suggested = availablePlayers
    .filter(p => slot.suggestedPositions.includes(p.position))
    .sort((a, b) => slot.suggestedPositions.indexOf(a.position) - slot.suggestedPositions.indexOf(b.position));
  const others = availablePlayers
    .filter(p => !slot.suggestedPositions.includes(p.position))
    .sort((a, b) => (POS_ORDER[a.position] ?? 99) - (POS_ORDER[b.position] ?? 99));

  const q = search.toLowerCase();
  const filteredSuggested = q ? suggested.filter(p => p.name.toLowerCase().includes(q)) : suggested;
  const filteredOthers = q ? others.filter(p => p.name.toLowerCase().includes(q)) : others;

  // Position the popover relative to the pitch container
  let style: React.CSSProperties = {
    position: "fixed",
    zIndex: 200,
  };
  if (anchorRect && pitchRect) {
    const top = anchorRect.bottom + 4;
    const left = anchorRect.left + anchorRect.width / 2 - 120; // center a ~240px popover
    style.top = Math.min(top, window.innerHeight - 260);
    style.left = Math.max(8, Math.min(left, window.innerWidth - 248));
  }

  return (
    <div ref={ref} style={style} className="w-60 max-h-64 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden">
      <div className="p-2 border-b border-slate-700">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Pick ${slot.label}...`}
          className="w-full bg-slate-900 text-sm text-slate-200 px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="overflow-y-auto max-h-48">
        {filteredSuggested.length > 0 && (
          <>
            <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-900/50">
              Best fit
            </div>
            {filteredSuggested.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600/20 transition text-sm"
              >
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getPositionColors(p.position)}`}>{p.position}</span>
                <span className="flex-1 text-slate-200 truncate">{p.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRatingColors(p.rating)}`}>{p.rating}</span>
              </button>
            ))}
          </>
        )}
        {filteredOthers.length > 0 && (
          <>
            <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-900/50">
              {filteredSuggested.length > 0 ? "Other players" : "Available"}
            </div>
            {filteredOthers.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600/20 transition text-sm"
              >
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getPositionColors(p.position)}`}>{p.position}</span>
                <span className="flex-1 text-slate-200 truncate">{p.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRatingColors(p.rating)}`}>{p.rating}</span>
              </button>
            ))}
          </>
        )}
        {filteredSuggested.length === 0 && filteredOthers.length === 0 && (
          <div className="p-4 text-center text-slate-600 text-xs italic">No players available</div>
        )}
      </div>
    </div>
  );
}

// ─── Player card on the pitch ───
const PitchPlayerCard = React.memo(function PitchPlayerCard({
  player,
  slot,
  onRemove,
  onSwap,
}: {
  player: Player;
  slot: FormationSlot;
  onRemove: () => void;
  onSwap: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        aria-haspopup="true"
        aria-expanded={showMenu}
        className="flex flex-col items-center gap-0.5 group cursor-pointer"
      >
        {/* Card */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-lg hover:border-blue-500/50 transition w-[90px] sm:w-[120px] py-1.5 sm:py-2 flex flex-col items-center justify-center gap-1 px-1">
          <div className="flex items-center justify-center gap-1">
            <span className={`text-[10px] sm:text-[11px] font-black px-1 py-0 rounded border ${getPositionColors(player.position)}`}>
              {player.position}
            </span>
            <span className={`text-[10px] sm:text-xs font-bold px-1 py-0 rounded border ${getRatingColors(player.rating)}`}>
              {player.rating}
            </span>
          </div>
          <p className="text-[11px] sm:text-sm font-bold text-white text-center truncate w-full px-1">
            {player.name}
          </p>
        </div>
        {/* Slot label */}
        <span className="text-[8px] sm:text-[10px] font-bold text-emerald-300/60 uppercase">{slot.label}</span>
      </button>

      {/* Context menu */}
      {showMenu && (
        <div ref={menuRef} className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden min-w-[90px]">
          <button
            onClick={() => { setShowMenu(false); onSwap(); }}
            className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-blue-400 hover:bg-blue-600/20 transition"
          >
            ↔ Swap
          </button>
          <button
            onClick={() => { setShowMenu(false); onRemove(); }}
            className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-600/20 transition"
          >
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Empty slot button ───
const EmptySlot = React.memo(function EmptySlot({
  slot,
  onClick,
}: {
  slot: FormationSlot;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add player to ${slot.label}`}
      className="flex flex-col items-center gap-0.5 group cursor-pointer"
    >
      <div className="w-[90px] h-[46px] sm:w-[120px] sm:h-[56px] flex flex-col items-center justify-center border-2 border-dashed border-emerald-700/40 rounded-lg bg-emerald-950/20 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition">
        <span className="text-emerald-500/60 text-xl sm:text-3xl font-bold group-hover:text-emerald-400 transition">+</span>
      </div>
      <span className="text-[7px] sm:text-[8px] font-bold text-emerald-300/60 uppercase">{slot.label}</span>
    </button>
  );
});

// ─── Pitch markings (drawn with CSS) ───
const PitchMarkings = React.memo(function PitchMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Center line */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-700/30" />
      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 w-[18%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-700/30" />
      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-700/40" />
      {/* Top penalty area */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-b border-x border-emerald-700/30" />
      {/* Top 6-yard box */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22%] h-[7%] border-b border-x border-emerald-700/30" />
      {/* Bottom penalty area */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-t border-x border-emerald-700/30" />
      {/* Bottom 6-yard box */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[22%] h-[7%] border-t border-x border-emerald-700/30" />
      {/* Outline */}
      <div className="absolute inset-1 border border-emerald-700/30 rounded" />
    </div>
  );
});

// ─── Main Pitch Component ───
export default function FormationPitch({
  formationKey,
  slotPlayers,
  allPlayers,
  selectedIds,
  onSlotChange,
}: {
  formationKey: string;
  /** Array of 11 elements: Player | null for each formation slot */
  slotPlayers: (Player | null)[];
  /** All players in the squad (for popover lists) */
  allPlayers: Player[];
  /** All currently selected IDs (pitch + bench) */
  selectedIds: number[];
  /** Called when a slot assignment changes */
  onSlotChange: (slotIndex: number, playerId: number | null) => void;
}) {
  const formation = FORMATIONS[formationKey] || FORMATIONS[DEFAULT_FORMATION];
  const pitchRef = useRef<HTMLDivElement>(null);
  const [popoverSlot, setPopoverSlot] = useState<number | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [pitchRect, setPitchRect] = useState<DOMRect | null>(null);

  // Build a Set for O(1) lookups, then derive availablePlayers
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const availablePlayers = useMemo(
    () => allPlayers.filter(p => !selectedSet.has(p.id)),
    [allPlayers, selectedSet]
  );

  const openPopover = (slotIndex: number, e: React.MouseEvent | HTMLElement) => {
    const rect = e instanceof HTMLElement ? e.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverAnchor(rect);
    setPitchRect(pitchRef.current?.getBoundingClientRect() || null);
    setPopoverSlot(slotIndex);
  };

  return (
    <div className="relative" ref={pitchRef}>
      {/* The pitch */}
      <div
        className="relative w-full bg-gradient-to-b from-emerald-900 to-emerald-950 rounded-xl overflow-hidden"
        style={{ aspectRatio: "3 / 4" }}
      >
        <PitchMarkings />

        {/* Player slots */}
        {formation.slots.map((slot, i) => {
          const player = slotPlayers[i] ?? null;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              {player ? (
                <PitchPlayerCard
                  player={player}
                  slot={slot}
                  onRemove={() => onSlotChange(i, null)}
                  onSwap={() => openPopover(i, document.querySelector(`[data-slot="${i}"]`) as HTMLElement || pitchRef.current!)}
                />
              ) : (
                <EmptySlot
                  slot={slot}
                  onClick={() => {
                    const el = pitchRef.current?.querySelector(`[data-slot="${i}"]`) as HTMLElement;
                    if (el) openPopover(i, el);
                    else {
                      // fallback: use click event position
                      setPopoverAnchor(new DOMRect(0, 0, 0, 0));
                      setPitchRect(pitchRef.current?.getBoundingClientRect() || null);
                      setPopoverSlot(i);
                    }
                  }}
                />
              )}
              {/* Hidden anchor for popover positioning */}
              <div data-slot={i} className="absolute left-1/2 top-1/2 w-0 h-0" />
            </div>
          );
        })}
      </div>

      {/* Popover for slot selection */}
      {popoverSlot !== null && (
        <SlotPopover
          slot={formation.slots[popoverSlot]}
          availablePlayers={availablePlayers}
          onSelect={(playerId) => {
            onSlotChange(popoverSlot, playerId);
            setPopoverSlot(null);
          }}
          onClose={() => setPopoverSlot(null)}
          anchorRect={popoverAnchor}
          pitchRect={pitchRect}
        />
      )}
    </div>
  );
}
