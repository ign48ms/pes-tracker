"use client";
import React, { useState, useEffect, useRef, useId } from "react";
import type { Player } from "../lib/types";

interface PlayerSearchSelectProps {
  players: Player[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  allowOwnGoal?: boolean;
  borderColor?: string;
  focusBorderColor?: string;
  label?: string;
}

export default function PlayerSearchSelect({
  players,
  value,
  onChange,
  placeholder = "Search player...",
  allowOwnGoal = false,
  borderColor = "border-slate-700",
  focusBorderColor = "focus-within:border-blue-500",
  label,
}: PlayerSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const inputId = useId();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedPlayer = players.find(p => p.id.toString() === value);
  const displayName = value === "OG" ? "Own Goal" : selectedPlayer ? selectedPlayer.name : "";

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-owns={listboxId}>
      <div
        className={`flex items-center bg-slate-900 rounded border ${borderColor} ${focusBorderColor} transition`}
        onClick={() => setIsOpen(true)}
      >
        {value && !isOpen ? (
          <div className="flex items-center justify-between w-full px-3 py-2 h-10 cursor-pointer">
            <span className="text-sm text-slate-200 truncate">{displayName}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); setSearch(""); }}
              className="text-slate-500 hover:text-red-400 ml-2 text-xs"
              aria-label={`Clear ${label || "selection"}`}
            >✕</button>
          </div>
        ) : (
          <input
            id={inputId}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent px-3 py-2 h-10 text-sm focus:outline-none"
            aria-label={label || placeholder}
            aria-controls={listboxId}
            aria-autocomplete="list"
            role="searchbox"
          />
        )}
      </div>

      {isOpen && (
        <div id={listboxId} role="listbox" aria-label={label || "Player options"} className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {/* None option */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(""); setSearch(""); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-700/50 transition"
          >
            None
          </button>
          {/* Own Goal option */}
          {allowOwnGoal && (
            <button
              type="button"
              role="option"
              aria-selected={value === "OG"}
              onClick={() => { onChange("OG"); setSearch(""); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition font-semibold"
            >
              Own Goal
            </button>
          )}
          {filtered.length > 0 ? (
            filtered.map(p => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={p.id.toString() === value}
                onClick={() => { onChange(p.id.toString()); setSearch(""); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition ${p.id.toString() === value ? "text-blue-400 bg-blue-900/20" : "text-slate-300"}`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-slate-500 ml-2">{p.position}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-600 italic" role="status">No players found</div>
          )}
        </div>
      )}
    </div>
  );
}
