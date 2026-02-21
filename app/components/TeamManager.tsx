"use client";
import React, { useState } from "react";
import CustomModal from "./CustomModal";
import type { ModalConfig } from "../lib/types";
import { useApp } from "../lib/AppContext";

export default function TeamManager() {
  const {
    teamName,
    activeTeamMeta,
    archivedTeams,
    matches,
    seasons,
    viewingTeamId,
    isViewingActiveTeam,
    createNewTeam,
    switchViewingTeam,
    renameArchivedTeam,
    removeArchivedTeam,
  } = useApp();

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChangeTeam = () => {
    const name = newTeamName.trim();
    if (!name) return;
    const seasonName = newSeasonName.trim() || "Season 1";

    setModal({
      title: "Change Team",
      message: `Your current squad "${teamName}" will be archived with all its players, matches, and seasons. You'll start fresh with "${name}" — first season: "${seasonName}".\n\nThis cannot be undone — but you can always browse the archived team's data from Settings.`,
      type: "danger",
      confirmText: "Archive & Start New Team",
      onConfirm: () => {
        createNewTeam(name, seasonName);
        setNewTeamName("");
        setNewSeasonName("");
        setModal(null);
      },
    });
  };

  const handleDeleteArchived = (id: string, name: string) => {
    setModal({
      title: "Delete Archived Team",
      message: `Permanently delete all data for "${name}"? This cannot be undone.`,
      type: "danger",
      confirmText: "Delete",
      onConfirm: () => {
        if (viewingTeamId === id) {
          switchViewingTeam(activeTeamMeta.id);
        }
        removeArchivedTeam(id);
        setModal(null);
      },
    });
  };

  const handleSaveRename = () => {
    if (!renameId || !renameValue.trim()) return;
    renameArchivedTeam(renameId, renameValue.trim());
    setRenameId(null);
    setRenameValue("");
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Team</span>
          <span className="text-sm font-bold text-green-400 bg-green-900/30 border border-green-800/50 px-3 py-1 rounded">
            {teamName || "My Team"}
          </span>
          {archivedTeams.length > 0 && (
            <span className="text-xs text-slate-500">
              +{archivedTeams.length} archived
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-5">
          {/* Active team card */}
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Current</p>
            <div className="flex items-center justify-between bg-slate-900/60 border border-green-800/40 rounded-lg px-4 py-3">
              <div>
                <p className="font-bold text-slate-100">{teamName || "My Team"}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {matches.length} match{matches.length !== 1 ? "es" : ""} · {seasons.length} season{seasons.length !== 1 ? "s" : ""}
                  {activeTeamMeta.createdAt > 0 && (
                    <> · since {new Date(activeTeamMeta.createdAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-900/40 border border-green-800/50 px-2 py-1 rounded">
                Active
              </span>
            </div>
          </div>

          {/* Archived teams */}
          {archivedTeams.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Archived</p>
              <div className="space-y-2">
                {[...archivedTeams].reverse().map(team => (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 border transition ${
                      viewingTeamId === team.id && !isViewingActiveTeam
                        ? "bg-amber-900/20 border-amber-700/50"
                        : "bg-slate-900/40 border-slate-700/50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {renameId === team.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveRename(); if (e.key === "Escape") setRenameId(null); }}
                            autoFocus
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500 w-40"
                            maxLength={50}
                          />
                          <button onClick={handleSaveRename} className="text-xs text-green-400 hover:text-green-300 font-bold">Save</button>
                          <button onClick={() => setRenameId(null)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-200 truncate">{team.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {team.matches.length} match{team.matches.length !== 1 ? "es" : ""} · {team.seasons.length} season{team.seasons.length !== 1 ? "s" : ""}
                            {team.createdAt > 0 && (
                              <> · {new Date(team.createdAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </>
                      )}
                    </div>

                    {renameId !== team.id && (
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {viewingTeamId === team.id && !isViewingActiveTeam ? (
                          <button
                            onClick={() => switchViewingTeam(activeTeamMeta.id)}
                            className="text-xs font-bold text-amber-400 hover:text-amber-200 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-700/40 px-3 py-1.5 rounded transition"
                          >
                            Back to active
                          </button>
                        ) : (
                          <button
                            onClick={() => switchViewingTeam(team.id)}
                            className="text-xs font-bold text-blue-400 hover:text-blue-200 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-800/40 px-3 py-1.5 rounded transition"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={() => { setRenameId(team.id); setRenameValue(team.name); }}
                          className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded hover:bg-slate-700/50 transition"
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteArchived(team.id, team.name)}
                          className="text-xs text-red-500/70 hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-900/20 transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change team */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400 mb-3">
              Enter a new team name to archive your current squad and start fresh.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">New Team Name</label>
                  <input
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleChangeTeam(); }}
                    placeholder="e.g. Real Madrid, Bayern..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                    maxLength={50}
                  />
                </div>
                <div className="w-36">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">First Season Name</label>
                  <input
                    value={newSeasonName}
                    onChange={e => setNewSeasonName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleChangeTeam(); }}
                    placeholder="Season 1"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                    maxLength={50}
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={handleChangeTeam}
                  disabled={!newTeamName.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition"
                >
                  Change Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomModal config={modal} onClose={() => setModal(null)} />
    </div>
  );
}
