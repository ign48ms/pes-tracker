"use client";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { Player, Match, Season, Competition, PlayerStats, Team } from "./types";
import { getPlayers, savePlayers, getMatches, saveMatches, getSeasons, saveSeasons, getCompetitions, saveCompetitions, getTeamName, saveTeamName, ensureDefaultSeason, clearAllData, importAllData as storageImportAll, getArchivedTeams, saveArchivedTeams, getActiveTeamMeta, createNewTeam as storageCreateNewTeam, updateArchivedTeam, deleteArchivedTeam } from "./storage";
import type { ActiveTeamMeta } from "./storage";
import { derivePlayerStats } from "./stats";
import { DEFAULT_TEAM_NAME } from "./constants";

// ─── Context shape ───
interface AppContextValue {
  // Data — reflects the currently *viewed* team (active or archived)
  players: Player[];
  matches: Match[];
  seasons: Season[];
  competitions: Competition[];
  teamName: string;
  isLoaded: boolean;

  // Derived
  activeSeason: Season | null;
  playerStats: Map<number, PlayerStats>;

  // ─── Multi-team ───
  activeTeamMeta: ActiveTeamMeta;
  archivedTeams: Team[];
  /** ID of the team currently being browsed (may differ from activeTeamMeta.id) */
  viewingTeamId: string;
  /** true when browsing the live active team */
  isViewingActiveTeam: boolean;
  createNewTeam: (name: string, firstSeasonName?: string) => void;
  switchViewingTeam: (id: string) => void;
  renameArchivedTeam: (id: string, name: string) => void;
  removeArchivedTeam: (id: string) => void;

  // Player mutations (no-op when viewing archived team)
  setPlayers: (update: Player[] | ((prev: Player[]) => Player[])) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (id: number, updates: Partial<Player>) => void;
  deletePlayer: (id: number) => void;

  // Match mutations
  setMatches: (update: Match[] | ((prev: Match[]) => Match[])) => void;
  addMatch: (match: Match) => void;
  deleteMatch: (id: string) => void;
  updateMatch: (id: string, updates: Partial<Match>) => void;

  // Season mutations
  setSeasons: (update: Season[] | ((prev: Season[]) => Season[])) => void;

  // Competition mutations (global — always writable)
  setCompetitions: (update: Competition[] | ((prev: Competition[]) => Competition[])) => void;
  addCompetition: (comp: Competition) => void;

  // Team name (for active team only)
  setTeamName: (name: string) => void;

  // Bulk operations
  importData: (data: import("./types").ExportData) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ─── Active team live state ───
  const [_activePlayers, _setActivePlayers] = useState<Player[]>([]);
  const [_activeMatches, _setActiveMatches] = useState<Match[]>([]);
  const [_activeSeasons, _setActiveSeasons] = useState<Season[]>([]);
  const [_activeTeamName, _setActiveTeamName] = useState(DEFAULT_TEAM_NAME);
  const [_activeTeamMeta, _setActiveTeamMeta] = useState<ActiveTeamMeta>({ id: "", createdAt: 0 });

  // ─── Multi-team ───
  const [archivedTeams, _setArchivedTeams] = useState<Team[]>([]);
  /** Client-only: which team's data the UI is currently showing */
  const [viewingTeamId, setViewingTeamId] = useState<string>("");

  // ─── Global state ───
  const [competitions, _setCompetitions] = useState<Competition[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    ensureDefaultSeason();
    _setActivePlayers(getPlayers());
    _setActiveMatches(getMatches());
    _setActiveSeasons(getSeasons());
    _setActiveTeamName(getTeamName());
    const meta = getActiveTeamMeta();
    _setActiveTeamMeta(meta);
    _setArchivedTeams(getArchivedTeams());
    _setCompetitions(getCompetitions());
    setViewingTeamId(meta.id);
    setIsLoaded(true);
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handler = () => {
      _setActivePlayers(getPlayers());
      _setActiveMatches(getMatches());
      _setActiveSeasons(getSeasons());
      _setActiveTeamName(getTeamName());
      const meta = getActiveTeamMeta();
      _setActiveTeamMeta(meta);
      _setArchivedTeams(getArchivedTeams());
      _setCompetitions(getCompetitions());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Notify user if a localStorage write fails (e.g. quota exceeded)
  useEffect(() => {
    const handler = (e: Event) => {
      const { key } = (e as CustomEvent<{ key: string }>).detail;
      alert(`Storage error: failed to save data for key "${key}". Your browser storage may be full. Export a backup to avoid data loss.`);
    };
    window.addEventListener("pes-storage-error", handler);
    return () => window.removeEventListener("pes-storage-error", handler);
  }, []);

  // ─── Viewing team resolution ───
  const isViewingActiveTeam = useMemo(
    () => !viewingTeamId || viewingTeamId === _activeTeamMeta.id,
    [viewingTeamId, _activeTeamMeta.id]
  );

  // When browsing an archived team, pull its snapshot
  const _viewingArchivedTeam = useMemo(
    () => isViewingActiveTeam ? null : archivedTeams.find(t => t.id === viewingTeamId) || null,
    [isViewingActiveTeam, archivedTeams, viewingTeamId]
  );

  // Public data — reflects whichever team is being viewed
  const players  = _viewingArchivedTeam ? _viewingArchivedTeam.players  : _activePlayers;
  const matches  = _viewingArchivedTeam ? _viewingArchivedTeam.matches  : _activeMatches;
  const seasons  = _viewingArchivedTeam ? _viewingArchivedTeam.seasons  : _activeSeasons;
  const teamName = _viewingArchivedTeam ? _viewingArchivedTeam.name     : _activeTeamName;

  // ─── Derived state ───
  const activeSeason = useMemo(
    () => seasons.find(s => s.isActive) || seasons[0] || null,
    [seasons]
  );

  const playerStats = useMemo(
    () => derivePlayerStats(players, matches),
    [players, matches]
  );

  // ─── Persisting setters (guard: no-op when viewing archived) ───
  const setPlayers = useCallback((update: Player[] | ((prev: Player[]) => Player[])) => {
    if (!isViewingActiveTeam) return;
    _setActivePlayers(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      savePlayers(next);
      return next;
    });
  }, [isViewingActiveTeam]);

  const setMatches = useCallback((update: Match[] | ((prev: Match[]) => Match[])) => {
    if (!isViewingActiveTeam) return;
    _setActiveMatches(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      saveMatches(next);
      return next;
    });
  }, [isViewingActiveTeam]);

  const setSeasons = useCallback((update: Season[] | ((prev: Season[]) => Season[])) => {
    if (!isViewingActiveTeam) return;
    _setActiveSeasons(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      saveSeasons(next);
      return next;
    });
  }, [isViewingActiveTeam]);

  const setCompetitions = useCallback((update: Competition[] | ((prev: Competition[]) => Competition[])) => {
    _setCompetitions(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      saveCompetitions(next);
      return next;
    });
  }, []);

  // ─── Convenience mutations ───
  const addPlayer = useCallback((player: Player) => {
    setPlayers(prev => [...prev, player]);
  }, [setPlayers]);

  const updatePlayer = useCallback((id: number, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setPlayers]);

  const deletePlayer = useCallback((id: number) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    const idStr = id.toString();
    setMatches(prev => prev.map(m => {
      const hasGoalRef = m.goals && m.goals.length > 0 && m.goals.some(g => g.scorerId === idStr || g.assisterId === idStr);
      const hasAppRef = m.appearanceIds.includes(id);
      if (!hasGoalRef && !hasAppRef) return m;
      return {
        ...m,
        appearanceIds: m.appearanceIds.filter(aId => aId !== id),
        goals: m.goals.map(g => ({
          ...g,
          scorerId: g.scorerId === idStr ? "" : g.scorerId,
          assisterId: g.assisterId === idStr ? "" : g.assisterId,
        })),
      };
    }));
  }, [setPlayers, setMatches]);

  const addMatch = useCallback((match: Match) => {
    setMatches(prev => [match, ...prev]);
  }, [setMatches]);

  const deleteMatch = useCallback((id: string) => {
    setMatches(prev => prev.filter(m => m.id !== id));
  }, [setMatches]);

  const updateMatch = useCallback((id: string, updates: Partial<Match>) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [setMatches]);

  const addCompetition = useCallback((comp: Competition) => {
    setCompetitions(prev => {
      if (prev.some(c => c.name === comp.name)) return prev;
      return [...prev, comp];
    });
  }, [setCompetitions]);

  const setTeamNameFn = useCallback((name: string) => {
    if (!isViewingActiveTeam) return;
    _setActiveTeamName(name);
    saveTeamName(name);
  }, [isViewingActiveTeam]);

  // ─── Multi-team actions ───
  const createNewTeam = useCallback((name: string, firstSeasonName?: string) => {
    const newMeta = storageCreateNewTeam(name, firstSeasonName);
    // Reload everything from storage
    _setActivePlayers(getPlayers());
    _setActiveMatches(getMatches());
    _setActiveSeasons(getSeasons());
    _setActiveTeamName(getTeamName());
    _setActiveTeamMeta(newMeta);
    _setArchivedTeams(getArchivedTeams());
    setViewingTeamId(newMeta.id);
  }, []);

  const switchViewingTeam = useCallback((id: string) => {
    setViewingTeamId(id);
  }, []);

  const renameArchivedTeam = useCallback((id: string, name: string) => {
    updateArchivedTeam(id, { name });
    _setArchivedTeams(getArchivedTeams());
  }, []);

  const removeArchivedTeam = useCallback((id: string) => {
    deleteArchivedTeam(id);
    _setArchivedTeams(getArchivedTeams());
  }, []);

  // ─── Bulk operations ───
  const importData = useCallback((data: import("./types").ExportData) => {
    storageImportAll(data);
    const meta = getActiveTeamMeta();
    _setActivePlayers(getPlayers());
    _setActiveMatches(getMatches());
    _setActiveSeasons(getSeasons());
    _setActiveTeamName(getTeamName());
    _setActiveTeamMeta(meta);
    _setArchivedTeams(getArchivedTeams());
    _setCompetitions(getCompetitions());
    setViewingTeamId(meta.id);
  }, []);

  const clearAll = useCallback(() => {
    clearAllData();
    ensureDefaultSeason();
    const meta = getActiveTeamMeta();
    _setActivePlayers(getPlayers());
    _setActiveMatches(getMatches());
    _setActiveSeasons(getSeasons());
    _setActiveTeamName(getTeamName());
    _setActiveTeamMeta(meta);
    _setArchivedTeams(getArchivedTeams());
    _setCompetitions(getCompetitions());
    setViewingTeamId(meta.id);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    players, matches, seasons, competitions, teamName, isLoaded,
    activeSeason, playerStats,
    activeTeamMeta: _activeTeamMeta,
    archivedTeams,
    viewingTeamId,
    isViewingActiveTeam,
    createNewTeam,
    switchViewingTeam,
    renameArchivedTeam,
    removeArchivedTeam,
    setPlayers, addPlayer, updatePlayer, deletePlayer,
    setMatches, addMatch, deleteMatch, updateMatch,
    setSeasons,
    setCompetitions, addCompetition,
    setTeamName: setTeamNameFn,
    importData, clearAll,
  }), [
    players, matches, seasons, competitions, teamName, isLoaded,
    activeSeason, playerStats,
    _activeTeamMeta, archivedTeams, viewingTeamId, isViewingActiveTeam,
    createNewTeam, switchViewingTeam, renameArchivedTeam, removeArchivedTeam,
    setPlayers, addPlayer, updatePlayer, deletePlayer,
    setMatches, addMatch, deleteMatch, updateMatch,
    setSeasons,
    setCompetitions, addCompetition,
    setTeamNameFn,
    importData, clearAll,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
