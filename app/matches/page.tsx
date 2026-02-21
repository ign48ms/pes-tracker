"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import CustomModal from '../components/CustomModal';
import PlayerSearchSelect from '../components/PlayerSearchSelect';
import dynamic from 'next/dynamic';
import ArchivedTeamBanner from '../components/ArchivedTeamBanner';
const FormationPitch = dynamic(() => import('../components/FormationPitch'), { ssr: false });
import BenchRow from '../components/BenchRow';
import Pagination from '../components/Pagination';
import type { GoalEvent, ModalConfig, Player, Competition, CompetitionFormat } from '../lib/types';
import { FORMATIONS, FORMATION_NAMES, DEFAULT_FORMATION, COMP_FORMAT_LABELS, getNextMatchday, getKnockoutRoundName } from '../lib/constants';
import { useApp } from '../lib/AppContext';
import { getMatchCompetitions, filterMatchesByComp, applySeasonFilter, getResult as getMatchResult, getGoalSummary, getAssistSummary, buildPlayerMap } from '../lib/stats';
import type { SeasonFilter } from '../lib/types';
import ResultBadge from '../components/ResultBadge';
import CompBadge from '../components/CompBadge';
import MatchFilters from '../components/MatchFilters';

// --- Main Page ---
export default function MatchPage() {
  const { players, matches, seasons, competitions, activeSeason, isLoaded, isViewingActiveTeam, setMatches, setCompetitions, addMatch: ctxAddMatch, deleteMatch: ctxDeleteMatch, updateMatch: ctxUpdateMatch, addCompetition: ctxAddCompetition } = useApp();
  
  // Form Inputs
  const [opponent, setOpponent] = useState("");
  const [myScore, setMyScore] = useState("");
  const [opScore, setOpScore] = useState("");
  const [competition, setCompetition] = useState("");
  const [showNewComp, setShowNewComp] = useState(false);
  const [newCompName, setNewCompName] = useState("");
  const [newCompFormat, setNewCompFormat] = useState<CompetitionFormat>("league");
  const [newCompKORounds, setNewCompKORounds] = useState("4");
  const [newCompGroupGames, setNewCompGroupGames] = useState("6");
  const [newCompGroupKORounds, setNewCompGroupKORounds] = useState("4");
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  
  // Filter for history
  const [filterComp, setFilterComp] = useState("All");
  const [filterSeason, setFilterSeason] = useState<SeasonFilter>("active");
  
  // Matchday (replaces date)
  const [matchday, setMatchday] = useState("");
  const [matchdayOverride, setMatchdayOverride] = useState(false);
  
  // Dynamic goal events synced to myScore count
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Formation / pitch selection state
  const [selectedFormation, setSelectedFormation] = useState(DEFAULT_FORMATION);
  /** 11-element array: player ID or null for each formation slot */
  const [pitchSlots, setPitchSlots] = useState<(number | null)[]>(Array(11).fill(null));
  /** Up to 5 bench player IDs */
  const [benchSlots, setBenchSlots] = useState<(number | null)[]>([]);

  // Refs for current slot state so handleFormationChange doesn't need them in its dep array
  const pitchSlotsRef = useRef(pitchSlots);
  pitchSlotsRef.current = pitchSlots;
  const benchSlotsRef = useRef(benchSlots);
  benchSlotsRef.current = benchSlots;

  // Get the selected Competition object
  const selectedComp = useMemo(() => competitions.find(c => c.name === competition), [competitions, competition]);

  // Auto-compute matchday when competition changes
  useEffect(() => {
    if (!competition || editingMatchId || matchdayOverride) return;
    const comp = competitions.find(c => c.name === competition);
    if (!comp) return;
    const seasonId = activeSeason?.id;
    const existingCount = matches.filter(m =>
      m.competition === competition &&
      (seasonId ? m.seasonId === seasonId : true)
    ).length;
    const { matchday: md } = getNextMatchday(comp, existingCount);
    setMatchday(md);
  }, [competition, competitions, matches, activeSeason, editingMatchId, matchdayOverride]);

  // Sync goal event rows to myScore
  useEffect(() => {
    const count = Math.max(0, Math.min(Number(myScore) || 0, 20));
    setGoalEvents(prev => {
      if (count === prev.length) return prev;
      if (count > prev.length) {
        return [...prev, ...Array.from({ length: count - prev.length }, () => ({
          scorerId: "",
          assisterId: "",
          isOwnGoal: false,
        }))];
      }
      return prev.slice(0, count);
    });
  }, [myScore]);

  // Sync matchAppearances from pitch + bench slots (derived state — no useState needed)
  const matchAppearances = useMemo(() => {
    return [...pitchSlots, ...benchSlots].filter((id): id is number => id !== null);
  }, [pitchSlots, benchSlots]);

  const updateGoalEvent = useCallback((index: number, field: keyof GoalEvent, value: string | boolean) => {
    setGoalEvents(prev => prev.map((g, i) => {
      if (i !== index) return g;
      if (field === "isOwnGoal") {
        const isOG = value as boolean;
        return { ...g, isOwnGoal: isOG, scorerId: isOG ? "OG" : "", assisterId: isOG ? "" : g.assisterId };
      }
      if (field === "scorerId" && value === "OG") {
        return { ...g, scorerId: "OG", isOwnGoal: true, assisterId: "" };
      }
      if (field === "scorerId" && value !== "OG") {
        return { ...g, scorerId: value as string, isOwnGoal: false };
      }
      return { ...g, [field]: value };
    }));
  }, []);

  // Single player lookup map (replaces separate playerById + playerMap)
  const playerMap = useMemo(() => buildPlayerMap(players), [players]);

  // Resolve slot arrays to Player objects for pitch/bench components
  const pitchSlotPlayers = useMemo(
    () => pitchSlots.map(id => (id !== null ? playerMap.get(id) ?? null : null)),
    [pitchSlots, playerMap]
  );
  const benchSlotPlayers = useMemo(
    () => benchSlots.map(id => (id !== null ? playerMap.get(id) ?? null : null)),
    [benchSlots, playerMap]
  );

  // All selected IDs (for availability checks in popovers)
  const allSelectedIds = useMemo(
    () => [...pitchSlots, ...benchSlots].filter((id): id is number => id !== null),
    [pitchSlots, benchSlots]
  );
  const handlePitchSlotChange = useCallback((slotIndex: number, playerId: number | null) => {
    setPitchSlots(prev => {
      const next = [...prev];
      next[slotIndex] = playerId;
      return next;
    });
  }, []);

  // ─── Bench slot change handler ───
  const handleBenchChange = useCallback((slotIndex: number, playerId: number | null) => {
    setBenchSlots(prev => {
      const next = [...prev];
      if (playerId === null) {
        // Remove: shift remaining bench players left
        next.splice(slotIndex, 1);
      } else {
        next[slotIndex] = playerId;
      }
      return next;
    });
  }, []);

  // ─── Auto-fill starters ───
  const autoFillStarters = useCallback(() => {
    const formation = FORMATIONS[selectedFormation] || FORMATIONS[DEFAULT_FORMATION];
    const starters = players.filter(p => p.isStarter && (p.status || "active") === "active");
    const placed = new Set<number>();
    const newSlots: (number | null)[] = Array(11).fill(null);
    const newBench: number[] = [];

    // Pass 1: assign starters to slots by exact position match
    for (let i = 0; i < formation.slots.length; i++) {
      const slot = formation.slots[i];
      const match = starters.find(
        p => !placed.has(p.id) && slot.suggestedPositions.includes(p.position)
      );
      if (match) {
        newSlots[i] = match.id;
        placed.add(match.id);
      }
    }

    // Pass 2: fill remaining empty slots with unplaced starters
    const unplaced = starters.filter(p => !placed.has(p.id));
    let unplacedIdx = 0;
    for (let i = 0; i < newSlots.length; i++) {
      if (newSlots[i] === null && unplacedIdx < unplaced.length) {
        newSlots[i] = unplaced[unplacedIdx].id;
        placed.add(unplaced[unplacedIdx].id);
        unplacedIdx++;
      }
    }

    // Remaining unplaced starters overflow to bench (max 5)
    while (unplacedIdx < unplaced.length && newBench.length < 5) {
      newBench.push(unplaced[unplacedIdx].id);
      unplacedIdx++;
    }

    setPitchSlots(newSlots);
    setBenchSlots(newBench);
  }, [players, selectedFormation]);

  // ─── Clear all selections ───
  const clearSelection = useCallback(() => {
    setPitchSlots(Array(11).fill(null));
    setBenchSlots([]);
  }, []);

  // ─── Distribute existing appearance IDs onto pitch + bench (for editing) ───
  const distributeToFormation = useCallback((appearanceIds: number[], formationKey: string, savedPitchSlotMap?: Record<number, number>) => {
    const formation = FORMATIONS[formationKey] || FORMATIONS[DEFAULT_FORMATION];

    // If we have saved pitch slot mapping, restore it directly
    if (savedPitchSlotMap) {
      const newSlots: (number | null)[] = Array(11).fill(null);
      const usedIds = new Set<number>();
      for (const [slotStr, pid] of Object.entries(savedPitchSlotMap)) {
        const slotIdx = Number(slotStr);
        if (slotIdx >= 0 && slotIdx < 11 && appearanceIds.includes(pid)) {
          newSlots[slotIdx] = pid;
          usedIds.add(pid);
        }
      }
      const bench = appearanceIds.filter(id => !usedIds.has(id)).slice(0, 5);
      setPitchSlots(newSlots);
      setBenchSlots(bench);
      return;
    }

    const remaining = [...appearanceIds];
    const newSlots: (number | null)[] = Array(11).fill(null);
    const newBench: number[] = [];

    // Pass 1: match by position
    for (let i = 0; i < formation.slots.length; i++) {
      const slot = formation.slots[i];
      const idx = remaining.findIndex(id => {
        const p = playerMap.get(id);
        return p && slot.suggestedPositions.includes(p.position);
      });
      if (idx !== -1) {
        newSlots[i] = remaining[idx];
        remaining.splice(idx, 1);
      }
    }

    // Pass 2: fill empty pitch slots with remaining
    for (let i = 0; i < newSlots.length; i++) {
      if (newSlots[i] === null && remaining.length > 0) {
        newSlots[i] = remaining.shift()!;
      }
    }

    // Rest go to bench
    while (remaining.length > 0 && newBench.length < 5) {
      newBench.push(remaining.shift()!);
    }

    setPitchSlots(newSlots);
    setBenchSlots(newBench);
  }, [playerMap]);

  const resetForm = useCallback(() => {
    setEditingMatchId(null);
    setOpponent("");
    setMyScore("");
    setOpScore("");
    setCompetition("");
    setGoalEvents([]);
    setPitchSlots(Array(11).fill(null));
    setBenchSlots([]);
    setMatchday("");
    setMatchdayOverride(false);
    setFieldErrors({});
    setShowNewComp(false);
    setNewCompName("");
    setNewCompFormat("league");
  }, []);

  const saveMatch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!opponent.trim()) errors.opponent = "Opponent is required";
    if (!competition) errors.competition = "Competition is required";
    if (!myScore) errors.myScore = "Required";
    if (!opScore) errors.opScore = "Required";
    if (!matchday.trim()) errors.matchday = "Matchday is required";
    if (matchAppearances.length < 11) errors.general = `Select at least 11 players for the match (currently ${matchAppearances.length})`;
    else if (matchAppearances.length > 16) errors.general = `Max 16 players per match (currently ${matchAppearances.length})`;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const matchComp = competition;

    // Build pitchSlotMap for saving formation
    const pitchSlotMap: Record<number, number> = {};
    pitchSlots.forEach((pid, idx) => {
      if (pid !== null) pitchSlotMap[idx] = pid;
    });

    // Compute matchdaySort
    let matchdaySort = 1;
    if (editingMatchId) {
      const existing = matches.find(m => m.id === editingMatchId);
      matchdaySort = existing?.matchdaySort ?? 1;
    } else {
      const seasonId = activeSeason?.id;
      const existingCount = matches.filter(m =>
        m.competition === matchComp &&
        (seasonId ? m.seasonId === seasonId : true)
      ).length;
      matchdaySort = existingCount + 1;
    }
    
    if (editingMatchId) {
      ctxUpdateMatch(editingMatchId, {
        opponent: opponent.trim(),
        myScore: Number(myScore) || 0,
        opScore: Number(opScore) || 0,
        goals: [...goalEvents],
        appearanceIds: [...matchAppearances],
        competition: matchComp,
        matchday: matchday.trim(),
        formationKey: selectedFormation,
        pitchSlotMap,
      });
    } else {
      const newMatch = {
        id: crypto.randomUUID(),
        opponent: opponent.trim(),
        myScore: Number(myScore) || 0,
        opScore: Number(opScore) || 0,
        goals: [...goalEvents],
        appearanceIds: [...matchAppearances],
        competition: matchComp,
        seasonId: activeSeason?.id ?? 1,
        matchday: matchday.trim(),
        matchdaySort,
        createdAt: Date.now(),
        formationKey: selectedFormation,
        pitchSlotMap,
      };
      ctxAddMatch(newMatch);
    }

    resetForm();
    
    setModal({
      title: editingMatchId ? "Match Updated" : "Match Saved",
      message: editingMatchId 
        ? "The match has been updated. Player stats have been recalculated."
        : "The match result has been recorded and player stats have been updated.",
      type: "success",
      confirmText: "OK",
      onConfirm: () => setModal(null),
    });
  }, [opponent, competition, myScore, opScore, matchday, matchAppearances, pitchSlots, editingMatchId, matches, activeSeason, goalEvents, selectedFormation, ctxUpdateMatch, ctxAddMatch, resetForm]);

  const startEditMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    setEditingMatchId(match.id);
    setOpponent(match.opponent);
    setMyScore(String(match.myScore));
    setOpScore(String(match.opScore));
    setCompetition(match.competition);
    setGoalEvents([...match.goals]);
    setMatchday(match.matchday || "");
    setMatchdayOverride(true);
    // Restore formation if saved
    const formKey = match.formationKey || selectedFormation;
    setSelectedFormation(formKey);
    distributeToFormation(match.appearanceIds, formKey, match.pitchSlotMap);
    setFieldErrors({});
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  // Formation change handler — redistribute current selections
  const handleFormationChange = useCallback((newFormation: string) => {
    setSelectedFormation(newFormation);
    const currentIds = [...pitchSlotsRef.current, ...benchSlotsRef.current]
      .filter((id): id is number => id !== null);
    if (currentIds.length === 0) return;
    const formation = FORMATIONS[newFormation] || FORMATIONS[DEFAULT_FORMATION];
    const remaining = [...currentIds];
    const newSlots: (number | null)[] = Array(11).fill(null);
    const newBench: number[] = [];
    for (let i = 0; i < formation.slots.length; i++) {
      const slot = formation.slots[i];
      const idx = remaining.findIndex(id => {
        const p = playerMap.get(id);
        return p && slot.suggestedPositions.includes(p.position);
      });
      if (idx !== -1) { newSlots[i] = remaining[idx]; remaining.splice(idx, 1); }
    }
    for (let i = 0; i < newSlots.length; i++) {
      if (newSlots[i] === null && remaining.length > 0) newSlots[i] = remaining.shift()!;
    }
    while (remaining.length > 0 && newBench.length < 5) newBench.push(remaining.shift()!);
    setPitchSlots(newSlots);
    setBenchSlots(newBench);
  }, [playerMap]);

  const deleteMatch = (id: string) => {
    setModal({
      title: "Delete Match",
      message: "Delete this match record? Player stats will be recalculated automatically.",
      type: "danger",
      confirmText: "Delete",
      onConfirm: () => {
        ctxDeleteMatch(id);
        setModal(null);
      },
    });
  };

  const clearAllMatches = () => {
    setModal({
      title: "Clear All Matches",
      message: "WARNING: This will delete ALL match records. Player stats are derived from matches and will reset to zero. This action cannot be undone.",
      type: "danger",
      confirmText: "Clear All",
      onConfirm: () => {
        setMatches([]);
        setModal(null);
      },
    });
  };

  // Helpers use shared utils

  // Add new competition with format
  const addNewCompetition = () => {
    const name = newCompName.trim();
    if (!name || competitions.some(c => c.name === name)) return;
    const newComp: Competition = {
      id: Date.now() + (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000),
      name,
      format: newCompFormat,
    };
    if (newCompFormat === "knockout") {
      newComp.knockoutRounds = Math.max(1, Number(newCompKORounds) || 4);
    } else if (newCompFormat === "group-knockout") {
      newComp.groupGames = Math.max(1, Number(newCompGroupGames) || 6);
      newComp.groupKnockoutRounds = Math.max(1, Number(newCompGroupKORounds) || 4);
    }
    ctxAddCompetition(newComp);
    setCompetition(name);
    setNewCompName("");
    setNewCompFormat("league");
    setShowNewComp(false);
  };

  // Unique competitions from actual match data (for filter)
  const matchCompetitions = useMemo(() => getMatchCompetitions(matches), [matches]);

  // Filtered matches for display: filter by season then competition
  const filteredMatches = useMemo(() => {
    return filterMatchesByComp(
      applySeasonFilter(matches, filterSeason, activeSeason),
      filterComp
    ).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [matches, filterComp, filterSeason, activeSeason]);

  const goalCount = Math.max(0, Math.min(Number(myScore) || 0, 20));

  // Only show active/loaned players in match squad selection
  const availablePlayers = useMemo(() => players.filter(p => (p.status || "active") === "active" || p.status === "loaned"), [players]);

  // Pagination for match history
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / matchesPerPage));
  const paginatedMatches = filteredMatches.slice((currentPage - 1) * matchesPerPage, currentPage * matchesPerPage);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterComp, filterSeason]);

  // Clamp currentPage when filteredMatches shrinks (e.g. after deletion)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-800 rounded w-48"></div>
            <div className="h-64 bg-slate-800 rounded-xl"></div>
            <div className="h-48 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <ArchivedTeamBanner />
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400 tracking-tight">
            {editingMatchId ? "Edit Match" : "Match Day"}
          </h1>
          <div className="flex items-center gap-2">
            {editingMatchId && (
              <button
                onClick={resetForm}
                className="text-xs bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1 rounded hover:bg-slate-600 transition"
              >
                Cancel Edit
              </button>
            )}
            {matches.length > 0 && !editingMatchId && isViewingActiveTeam && (
              <button 
                onClick={clearAllMatches}
                className="text-xs bg-red-900/30 text-red-400 border border-red-800/50 px-3 py-1 rounded hover:bg-red-800/50 transition"
              >
                Clear All Matches
              </button>
            )}
          </div>
        </div>

        {/* MATCH ENTRY FORM */}
        {isViewingActiveTeam && <form onSubmit={saveMatch} className="space-y-6 mb-12">
          
          {/* Scoreboard: Competition | Opponent | Score */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-full sm:w-64">
                <label htmlFor="match-competition" className="block text-xs font-bold text-slate-500 uppercase mb-2">Competition</label>
                <select
                  id="match-competition"
                  value={competition}
                  onChange={e => {
                    if (e.target.value === "__new__") {
                      setShowNewComp(true);
                      setCompetition("");
                    } else {
                      setCompetition(e.target.value);
                      setShowNewComp(false);
                      setFieldErrors(prev => { const { competition: _, ...rest } = prev; return rest; });
                    }
                  }}
                  className={`w-full bg-slate-900 p-3 h-[50px] text-lg font-semibold rounded border focus:outline-none transition ${fieldErrors.competition ? "border-red-500" : "border-slate-700 focus:border-blue-500"}`}
                >
                  <option value="" disabled className="text-slate-500">Select...</option>
                  {competitions.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__new__">+ Add New...</option>
                </select>
                <p className="h-4 mt-1 text-[10px] font-medium">
                  {fieldErrors.competition
                    ? <span className="text-red-400">{fieldErrors.competition}</span>
                    : <span className="text-slate-500">{matchday}</span>}
                </p>
              </div>

              <div className="flex-1">
                <label htmlFor="match-opponent" className="block text-xs font-bold text-slate-500 uppercase mb-2">Opponent</label>
                <input 
                  id="match-opponent"
                  value={opponent} 
                  onChange={e => { setOpponent(e.target.value); setFieldErrors(prev => { const { opponent: _, ...rest } = prev; return rest; }); }}
                  placeholder="e.g. Manchester City"
                  className={`w-full bg-slate-900 p-3 h-[50px] text-lg font-semibold rounded border focus:outline-none transition ${fieldErrors.opponent ? "border-red-500" : "border-slate-700 focus:border-blue-500"}`}
                />
                <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.opponent || ""}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-16 text-center">
                  <label htmlFor="match-gf" className="block text-xs font-bold text-blue-400 uppercase mb-2">GF</label>
                  <input 
                    id="match-gf"
                    type="number"
                    min="0"
                    value={myScore} 
                    onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) { setMyScore(v); setFieldErrors(prev => { const { myScore: _, ...rest } = prev; return rest; }); } }}
                    className={`w-full bg-slate-900 p-3 text-center text-xl font-bold rounded border focus:outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${fieldErrors.myScore ? "border-red-500" : "border-slate-700 focus:border-blue-500"}`}
                    placeholder="0"
                  />
                  <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.myScore || ""}</p>
                </div>
                <span className="text-2xl font-bold text-slate-600">-</span>
                <div className="w-16 text-center">
                  <label htmlFor="match-ga" className="block text-xs font-bold text-red-400 uppercase mb-2">GA</label>
                  <input 
                    id="match-ga"
                    type="number"
                    min="0"
                    value={opScore} 
                    onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) { setOpScore(v); setFieldErrors(prev => { const { opScore: _, ...rest } = prev; return rest; }); } }}
                    className={`w-full bg-slate-900 p-3 text-center text-xl font-bold rounded border focus:outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${fieldErrors.opScore ? "border-red-500" : "border-slate-700 focus:border-blue-500"}`}
                    placeholder="0"
                  />
                  <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.opScore || ""}</p>
                </div>
              </div>
            </div>
            {showNewComp && (
              <div className="mt-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={newCompName}
                    onChange={e => setNewCompName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNewCompetition(); } }}
                    placeholder="Competition name..."
                    className="flex-1 bg-slate-900 p-2.5 rounded border border-slate-700 focus:outline-none focus:border-green-500 transition text-sm"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs font-bold text-slate-500 uppercase">Format</label>
                  <select
                    value={newCompFormat}
                    onChange={e => setNewCompFormat(e.target.value as CompetitionFormat)}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                  >
                    {(Object.entries(COMP_FORMAT_LABELS) as [CompetitionFormat, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  {newCompFormat === "knockout" && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rounds</label>
                      <input
                        type="number" min="1" max="10"
                        value={newCompKORounds}
                        onChange={e => setNewCompKORounds(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16 text-sm text-center text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] text-slate-600">
                        ({Number(newCompKORounds) > 0 ? getKnockoutRoundName(Number(newCompKORounds)) : "..."} → Final)
                      </span>
                    </div>
                  )}
                  {newCompFormat === "group-knockout" && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Group Games</label>
                        <input
                          type="number" min="1" max="20"
                          value={newCompGroupGames}
                          onChange={e => setNewCompGroupGames(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16 text-sm text-center text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">KO Rounds</label>
                        <input
                          type="number" min="1" max="10"
                          value={newCompGroupKORounds}
                          onChange={e => setNewCompGroupKORounds(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16 text-sm text-center text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addNewCompetition}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition"
                  >Add Competition</button>
                  <button
                    type="button"
                    onClick={() => { setShowNewComp(false); setNewCompName(""); }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded transition"
                  >Cancel</button>
                </div>
              </div>
            )}


          </div>

          {/* Squad Selection - Formation Pitch */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Squad Selection
                {matchAppearances.length > 0 && (
                  <span className={`ml-2 normal-case ${matchAppearances.length >= 11 && matchAppearances.length <= 16 ? "text-blue-400" : "text-red-400"}`}>
                    ({matchAppearances.length} selected)
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Formation selector */}
                <select
                  value={selectedFormation}
                  onChange={e => handleFormationChange(e.target.value)}
                  className="bg-slate-900 text-sm text-slate-300 px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500 transition"
                >
                  {FORMATION_NAMES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                {/* Auto-fill starters button */}
                {availablePlayers.some(p => p.isStarter) && (
                  <button
                    type="button"
                    onClick={autoFillStarters}
                    className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 hover:text-yellow-400 transition px-2.5 py-1.5 rounded border border-yellow-800/50 hover:border-yellow-600/50 bg-yellow-900/20 hover:bg-yellow-900/30"
                  >
                    ★ Auto-fill Starters
                  </button>
                )}
                {matchAppearances.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400 transition px-2 py-1.5 rounded border border-slate-700 hover:border-red-500/30"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {availablePlayers.length > 0 ? (
              <>
                <FormationPitch
                  formationKey={selectedFormation}
                  slotPlayers={pitchSlotPlayers}
                  allPlayers={availablePlayers}
                  selectedIds={allSelectedIds}
                  onSlotChange={handlePitchSlotChange}
                />
                <BenchRow
                  benchPlayers={benchSlotPlayers}
                  allPlayers={availablePlayers}
                  selectedIds={allSelectedIds}
                  onBenchChange={handleBenchChange}
                />
              </>
            ) : (
              <p className="text-slate-500 text-sm italic">No players found. Go to Squad page to add players.</p>
            )}
          </div>

          {/* Dynamic Goal Events */}
          {goalCount > 0 && (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h2 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">
                Goal Details <span className="text-blue-400">({goalCount})</span>
              </h2>
              <div className="space-y-3">
                {goalEvents.map((goal, i) => {
                  const scorerNotInSquad = goal.scorerId && goal.scorerId !== "OG" && !matchAppearances.includes(Number(goal.scorerId));
                  const assisterNotInSquad = goal.assisterId && !matchAppearances.includes(Number(goal.assisterId));
                  return (
                  <div key={i} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 border border-green-800/50 flex items-center justify-center">
                      <span className="text-green-400 text-xs font-bold">{i + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] text-green-400 font-bold uppercase mb-1">Scorer</label>
                      <PlayerSearchSelect
                        players={availablePlayers}
                        value={goal.scorerId}
                        onChange={(val) => updateGoalEvent(i, "scorerId", val)}
                        placeholder="Who scored?"
                        allowOwnGoal={true}
                        label={`Goal ${i + 1} scorer`}
                        borderColor={scorerNotInSquad ? "border-amber-600" : "border-slate-700"}
                        focusBorderColor="focus-within:border-green-500"
                      />
                      {scorerNotInSquad && <p className="text-amber-400 text-[9px] mt-0.5">Not in match squad</p>}
                    </div>

                    {!goal.isOwnGoal && (
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] text-yellow-400 font-bold uppercase mb-1">Assist</label>
                        <PlayerSearchSelect
                          players={availablePlayers}
                          value={goal.assisterId}
                          onChange={(val) => updateGoalEvent(i, "assisterId", val)}
                          placeholder="Who assisted?"
                          label={`Goal ${i + 1} assist`}
                          borderColor={assisterNotInSquad ? "border-amber-600" : "border-slate-700"}
                          focusBorderColor="focus-within:border-yellow-500"
                        />
                        {assisterNotInSquad && <p className="text-amber-400 text-[9px] mt-0.5">Not in match squad</p>}
                      </div>
                    )}

                    {goal.isOwnGoal && (
                      <div className="flex-1 flex items-end pb-1">
                        <span className="text-xs font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-3 py-1.5 rounded">
                          OWN GOAL
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {fieldErrors.general && (
            <p className="text-red-400 text-sm font-semibold text-center bg-red-900/20 border border-red-800/40 rounded-lg py-2">{fieldErrors.general}</p>
          )}

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 transition active:scale-[0.98]"
          >
            {editingMatchId ? "UPDATE MATCH" : "CONFIRM MATCH RESULT"}
          </button>
        </form>}

        {/* MATCH HISTORY TABLE */}
        {matches.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
                Season Results
                {filterComp !== "All" && (
                  <span className="text-sm font-semibold text-blue-400 ml-2">— {filterComp}</span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <MatchFilters
                  seasons={seasons}
                  filterSeason={filterSeason}
                  onSeasonChange={setFilterSeason}
                  competitions={matchCompetitions}
                  filterComp={filterComp}
                  onCompChange={setFilterComp}
                  showActiveSeason={true}
                />
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-700/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="p-4">Opponent</th>
                    <th className="p-4 text-center hidden sm:table-cell">Matchday</th>
                    {filterComp === "All" && <th className="p-4 text-center">Comp</th>}
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4 text-center text-green-400 hidden md:table-cell">Scorers</th>
                    <th className="p-4 text-center text-yellow-400 hidden md:table-cell">Assists</th>
                    <th className="p-4 text-center w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {paginatedMatches.map(match => {
                    const comp = match.competition || "Friendly";
                    return (
                      <tr key={match.id} className={`hover:bg-blue-500/5 transition-colors group ${editingMatchId === match.id ? "bg-blue-900/20 border-l-2 border-l-blue-500" : ""}`}>
                        <td className="p-4 font-bold text-slate-200">{match.opponent}</td>
                        <td className="p-4 text-center text-xs text-slate-500 hidden sm:table-cell">{match.matchday || "-"}</td>
                        {filterComp === "All" && (
                          <td className="p-4 text-center">
                            <CompBadge competition={comp} />
                          </td>
                        )}
                        <td className="p-4 text-center">
                          <ResultBadge myScore={match.myScore} opScore={match.opScore} />
                        </td>
                        <td className="p-4 text-center text-green-500 text-xs font-medium max-w-[150px] truncate hidden md:table-cell">{getGoalSummary(match, playerMap)}</td>
                        <td className="p-4 text-center text-yellow-500 text-xs font-medium max-w-[150px] truncate hidden md:table-cell">{getAssistSummary(match, playerMap)}</td>
                        <td className="p-4">
                          {isViewingActiveTeam && <div className="flex justify-center gap-1">
                            <button 
                              onClick={() => startEditMatch(match.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20 text-xs"
                              title="Edit Match"
                              aria-label="Edit match"
                            >
                              ✎
                            </button>
                            <button 
                              onClick={() => deleteMatch(match.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 text-xs"
                              title="Delete Match"
                              aria-label="Delete match"
                            >
                              ✕
                            </button>
                          </div>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMatches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-600">
                        <p className="italic">No matches found for the selected filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredMatches.length}
              itemsPerPage={matchesPerPage}
              onPageChange={setCurrentPage}
              itemLabel="matches"
            />
          </div>
        )}
      </div>
      <CustomModal config={modal} onClose={() => setModal(null)} />
    </main>
    </>
  );
}