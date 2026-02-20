"use client";
import React, { useState } from "react";
import CustomModal from "./CustomModal";
import type { Season, ModalConfig } from "../lib/types";
import { useApp } from "../lib/AppContext";

export default function SeasonManager() {
  const { seasons, matches, setSeasons, setMatches } = useApp();
  const [newSeasonName, setNewSeasonName] = useState("");
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeSeason = seasons.find(s => s.isActive) || seasons[0];

  const createNewSeason = () => {
    const name = newSeasonName.trim();
    if (!name) return;
    if (seasons.some(s => s.name === name)) return;

    setModal({
      title: "Start New Season",
      message: `This will archive "${activeSeason?.name}" and start "${name}" as the new active season. Player stats are derived from match data and will remain accurate.`,
      type: "confirm",
      confirmText: "Start Season",
      onConfirm: () => {
        const newSeason: Season = {
          id: Date.now() + (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000),
          name,
          isActive: true,
        };

        setSeasons(prev => [
          ...prev.map(s => ({ ...s, isActive: false })),
          newSeason,
        ]);
        setNewSeasonName("");
        setModal(null);
      },
    });
  };

  const switchToSeason = (seasonId: number) => {
    // This only changes which season is "active" for new match recording
    setModal({
      title: "Switch Active Season",
      message: "New matches will be recorded under this season. Existing match data is unchanged.",
      type: "confirm",
      confirmText: "Switch",
      onConfirm: () => {
        setSeasons(prev => prev.map(s => ({
          ...s,
          isActive: s.id === seasonId,
        })));
        setModal(null);
      },
    });
  };

  const deleteSeason = (seasonId: number) => {
    const season = seasons.find(s => s.id === seasonId);
    if (!season) return;

    // Count matches in this season
    const seasonMatches = matches.filter(m => m.seasonId === seasonId);

    setModal({
      title: "Delete Season",
      message: `Delete "${season.name}"? ${seasonMatches.length > 0 ? `${seasonMatches.length} match(es) will be reassigned to the active season.` : "No matches are associated with this season."}`,
      type: "danger",
      confirmText: "Delete",
      onConfirm: () => {
        // Reassign matches BEFORE updating seasons so there's no interim state mismatch
        if (seasonMatches.length > 0) {
          const targetSeason = seasons.find(s => s.isActive && s.id !== seasonId)
            || seasons.find(s => s.id !== seasonId);
          if (targetSeason) {
            setMatches(prevMatches => prevMatches.map(m =>
              m.seasonId === seasonId ? { ...m, seasonId: targetSeason.id } : m
            ));
          }
        }

        const otherSeasons = seasons.filter(s => s.id !== seasonId);
        const deletedSeason = seasons.find(s => s.id === seasonId);

        let updatedSeasons = otherSeasons;

        // If we deleted the active season, activate the most recent one
        if (deletedSeason?.isActive && updatedSeasons.length > 0) {
          updatedSeasons = updatedSeasons.map((s, i) => ({
            ...s,
            isActive: i === updatedSeasons.length - 1,
          }));
        }

        // Ensure at least one season exists
        if (updatedSeasons.length === 0) {
          updatedSeasons = [{
            id: Date.now() + (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000),
            name: "Season 1",
            isActive: true,
          }];
        }

        setSeasons(updatedSeasons);
        setModal(null);
      },
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Season</span>
          {activeSeason && (
            <span className="text-sm font-bold text-blue-400 bg-blue-900/30 border border-blue-800/50 px-3 py-1 rounded">
              {activeSeason.name}
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Season list */}
          <div className="space-y-2">
            {seasons.map(season => (
              <div
                key={season.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  season.isActive
                    ? "bg-blue-900/20 border-blue-800/50"
                    : "bg-slate-900/50 border-slate-700/50"
                }`}
              >
                <div>
                  <span className={`font-semibold text-sm ${season.isActive ? "text-blue-400" : "text-slate-300"}`}>
                    {season.name}
                  </span>

                  {season.isActive && (
                    <span className="text-[10px] font-bold text-green-400 ml-2 bg-green-900/30 px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {!season.isActive && (
                    <button
                      onClick={() => switchToSeason(season.id)}
                      className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-800/50 px-2 py-1 rounded hover:bg-blue-800/50 transition"
                    >
                      Activate
                    </button>
                  )}
                  {seasons.length > 1 && (
                    <button
                      onClick={() => deleteSeason(season.id)}
                      className="text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-2 py-1 rounded hover:bg-red-800/50 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create new season */}
          <div className="flex gap-2">
            <input
              value={newSeasonName}
              onChange={e => setNewSeasonName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); createNewSeason(); } }}
              placeholder="New season name..."
              className="flex-1 bg-slate-900 p-2.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500 transition text-sm"
            />
            <button
              onClick={createNewSeason}
              disabled={!newSeasonName.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition"
            >
              New Season
            </button>
          </div>
        </div>
      )}

      <CustomModal config={modal} onClose={() => setModal(null)} />
    </div>
  );
}
