"use client";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { Player, Match, Season, Competition, PlayerStats } from "./types";
import { getPlayers, savePlayers, getMatches, saveMatches, getSeasons, saveSeasons, getCompetitions, saveCompetitions, getTeamName, saveTeamName, ensureDefaultSeason, clearAllData, importAllData as storageImportAll } from "./storage";
import { derivePlayerStats } from "./stats";
import { DEFAULT_TEAM_NAME } from "./constants";

// ─── Context shape ───
interface AppContextValue {
  // State
  players: Player[];
  matches: Match[];
  seasons: Season[];
  competitions: Competition[];
  teamName: string;
  isLoaded: boolean;

  // Derived
  activeSeason: Season | null;
  playerStats: Map<number, PlayerStats>;

  // Player mutations
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

  // Competition mutations
  setCompetitions: (update: Competition[] | ((prev: Competition[]) => Competition[])) => void;
  addCompetition: (comp: Competition) => void;

  // Team name
  setTeamName: (name: string) => void;

  // Bulk operations
  importData: (players: Player[], matches: Match[], seasons: Season[], competitions: Competition[], teamName?: string) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [players, _setPlayers] = useState<Player[]>([]);
  const [matches, _setMatches] = useState<Match[]>([]);
  const [seasons, _setSeasons] = useState<Season[]>([]);
  const [competitions, _setCompetitions] = useState<Competition[]>([]);
  const [teamName, _setTeamName] = useState(DEFAULT_TEAM_NAME);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    ensureDefaultSeason();
    _setPlayers(getPlayers());
    _setMatches(getMatches());
    _setSeasons(getSeasons());
    _setCompetitions(getCompetitions());
    _setTeamName(getTeamName());
    setIsLoaded(true);
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handler = () => {
      _setPlayers(getPlayers());
      _setMatches(getMatches());
      _setSeasons(getSeasons());
      _setCompetitions(getCompetitions());
      _setTeamName(getTeamName());
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

  // ─── Derived state ───
  const activeSeason = useMemo(
    () => seasons.find(s => s.isActive) || seasons[0] || null,
    [seasons]
  );

  // All-time stats for all players (derived from ALL matches)
  const playerStats = useMemo(
    () => derivePlayerStats(players, matches),
    [players, matches]
  );

  // ─── Persisting setters ───
  const setPlayers = useCallback((update: Player[] | ((prev: Player[]) => Player[])) => {
    _setPlayers(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      savePlayers(next);
      return next;
    });
  }, []);

  const setMatches = useCallback((update: Match[] | ((prev: Match[]) => Match[])) => {
    _setMatches(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      saveMatches(next);
      return next;
    });
  }, []);

  const setSeasons = useCallback((update: Season[] | ((prev: Season[]) => Season[])) => {
    _setSeasons(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      saveSeasons(next);
      return next;
    });
  }, []);

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
    // Clean up goal events and appearance lists referencing this player
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
    _setTeamName(name);
    saveTeamName(name);
  }, []);

  const importData = useCallback((newPlayers: Player[], newMatches: Match[], newSeasons: Season[], newComps: Competition[], newTeamName?: string) => {
    // Use storage import which resets migration flags and re-runs migrations
    storageImportAll({
      version: 2,
      exportDate: new Date().toISOString(),
      players: newPlayers,
      matches: newMatches,
      seasons: newSeasons,
      competitions: newComps,
      teamName: newTeamName,
    });
    // Reload migrated data from storage
    _setPlayers(getPlayers());
    _setMatches(getMatches());
    _setSeasons(getSeasons());
    _setCompetitions(getCompetitions());
    _setTeamName(getTeamName());
  }, []);

  const clearAll = useCallback(() => {
    // Clear all data and reset migration flags so defaults are reseeded
    clearAllData();
    // Re-run initialization: ensures default season and competitions are created
    ensureDefaultSeason();
    // Reload from storage (migrations will reseed defaults)
    _setPlayers(getPlayers());
    _setMatches(getMatches());
    _setSeasons(getSeasons());
    _setCompetitions(getCompetitions());
    _setTeamName(getTeamName());
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    players, matches, seasons, competitions, teamName, isLoaded,
    activeSeason, playerStats,
    setPlayers, addPlayer, updatePlayer, deletePlayer,
    setMatches, addMatch, deleteMatch, updateMatch,
    setSeasons,
    setCompetitions, addCompetition,
    setTeamName: setTeamNameFn,
    importData, clearAll,
  }), [
    players, matches, seasons, competitions, teamName, isLoaded,
    activeSeason, playerStats,
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
