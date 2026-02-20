import React, { useId } from "react";
import type { Season } from "../lib/types";

interface MatchFiltersProps {
  seasons: Season[];
  filterSeason: string;
  onSeasonChange: (value: string) => void;
  competitions: string[];
  filterComp: string;
  onCompChange: (value: string) => void;
  /** Show "Active Season" option (matches page) vs only "All Seasons" (player detail) */
  showActiveSeason?: boolean;
}

/**
 * Reusable season + competition filter dropdowns.
 */
export default function MatchFilters({
  seasons,
  filterSeason,
  onSeasonChange,
  competitions,
  filterComp,
  onCompChange,
  showActiveSeason = false,
}: MatchFiltersProps) {
  const seasonSelectId = useId();
  const compSelectId = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {seasons.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor={seasonSelectId} className="text-xs font-bold uppercase tracking-widest text-slate-500">Season</label>
          <select
            id={seasonSelectId}
            value={filterSeason}
            onChange={e => onSeasonChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
          >
            {showActiveSeason && <option value="active">Active Season</option>}
            <option value="all">All Seasons</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      {competitions.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor={compSelectId} className="text-xs font-bold uppercase tracking-widest text-slate-500">Competition</label>
          <select
            id={compSelectId}
            value={filterComp}
            onChange={e => onCompChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="All">All Competitions</option>
            {competitions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
