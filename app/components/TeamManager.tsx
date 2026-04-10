"use client";
import React, { useState, useMemo } from "react";
import CustomModal from "./CustomModal";
import type { ModalConfig } from "../lib/types";
import { useApp } from "../lib/AppContext";
import { LEAGUES } from "../lib/leagueData";
import { fetchTeamSquad } from "../lib/footballApi";
import type { Player } from "../lib/types";

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
    addPlayer,
  } = useApp();

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // League/Team selection state
  const [selectedLeagueIdx, setSelectedLeagueIdx] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useCustomTeam, setUseCustomTeam] = useState(true);

  const selectedLeague = useMemo(
    () => (selectedLeagueIdx !== null ? LEAGUES[selectedLeagueIdx] : null),
    [selectedLeagueIdx]
  );

  const selectedTeam = useMemo(
    () =>
      selectedLeague && selectedTeamId
        ? selectedLeague.teams.find(t => t.id === selectedTeamId)
        : null,
    [selectedLeague, selectedTeamId]
  );

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

  const handleLoadTeamPlayers = async () => {
    if (!selectedTeam) return;

    setIsLoadingTeam(true);
    setLoadError(null);

    try {
      // Fetch squad from football-data.org
      const players = await fetchTeamSquad(selectedTeam.id);

      if (players.length === 0) {
        setLoadError(
          `No matching players found for ${selectedTeam.name}. Try a different team or add players manually.`
        );
        setIsLoadingTeam(false);
        return;
      }

      // Create new team with the selected team's name
      const seasonName = newSeasonName.trim() || "Season 1";

      setModal({
        title: "Load Team Squad",
        message: `Your current squad "${teamName}" will be archived. "${selectedTeam.name}" will be created with ${players.length} player(s)${players.length < 11 ? " (you may want to add more)" : ""}.\n\nYou can edit all player details after loading.`,
        type: "info",
        confirmText: "Load Team & Archive Current",
        onConfirm: () => {
          // Create new team
          createNewTeam(selectedTeam.name, seasonName);

          // Add all loaded players to the new team
          players.forEach(player => {
            addPlayer(player);
          });

          // Reset state
          setSelectedLeagueIdx(null);
          setSelectedTeamId(null);
          setNewSeasonName("");
          setLoadError(null);
          setModal(null);
          setIsLoadingTeam(false);
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setLoadError(`Failed to load team: ${errorMsg}`);
      setIsLoadingTeam(false);
    }
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

          {/* Change team / Load team */}
          <div className="border-t border-slate-700 pt-4">
            <div className="space-y-4">
              {/* Tab selector: Custom vs Load */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUseCustomTeam(true)}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded transition ${
                    useCustomTeam
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Custom Team
                </button>
                <button
                  onClick={() => setUseCustomTeam(false)}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded transition ${
                    !useCustomTeam
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Load from League
                </button>
              </div>

              {useCustomTeam ? (
                // Custom team creation
                <>
                  <p className="text-xs text-slate-400">
                    Enter a new team name to archive your current squad and start fresh.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        New Team Name
                      </label>
                      <input
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleChangeTeam();
                        }}
                        placeholder="e.g. Real Madrid, Bayern..."
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                        maxLength={50}
                      />
                    </div>
                    <div className="w-36">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        First Season Name
                      </label>
                      <input
                        value={newSeasonName}
                        onChange={e => setNewSeasonName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleChangeTeam();
                        }}
                        placeholder="Season 1"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                        maxLength={50}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleChangeTeam}
                    disabled={!newTeamName.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition"
                  >
                    Change Team
                  </button>
                </>
              ) : (
                // Load team from league
                <>
                  <p className="text-xs text-slate-400">
                    Select a league and team to automatically load players and archive your current squad.
                  </p>

                  {/* League selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      League
                    </label>
                    <select
                      value={selectedLeagueIdx ?? ""}
                      onChange={e => {
                        setSelectedLeagueIdx(
                          e.target.value === "" ? null : parseInt(e.target.value)
                        );
                        setSelectedTeamId(null);
                        setLoadError(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="">Select a league...</option>
                      {LEAGUES.map((league, idx) => (
                        <option key={idx} value={idx}>
                          {league.name} ({league.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team selector */}
                  {selectedLeague && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        Team
                      </label>
                      <select
                        value={selectedTeamId ?? ""}
                        onChange={e => {
                          setSelectedTeamId(
                            e.target.value === "" ? null : parseInt(e.target.value)
                          );
                          setLoadError(null);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                      >
                        <option value="">Select a team...</option>
                        {selectedLeague.teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Season name */}
                  {selectedTeam && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        First Season Name
                      </label>
                      <input
                        value={newSeasonName}
                        onChange={e => setNewSeasonName(e.target.value)}
                        placeholder="Season 1"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                        maxLength={50}
                      />
                    </div>
                  )}

                  {/* Error message */}
                  {loadError && (
                    <div className="bg-red-900/20 border border-red-800/50 text-red-300 text-xs p-3 rounded">
                      {loadError}
                    </div>
                  )}

                  {/* Load button */}
                  <button
                    onClick={handleLoadTeamPlayers}
                    disabled={!selectedTeam || isLoadingTeam}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition"
                  >
                    {isLoadingTeam ? "Loading players..." : "Load Team"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CustomModal config={modal} onClose={() => setModal(null)} />
    </div>
  );
}
