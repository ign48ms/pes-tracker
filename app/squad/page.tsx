"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CustomModal from '../components/CustomModal';
import Pagination from '../components/Pagination';
import ArchivedTeamBanner from '../components/ArchivedTeamBanner';
import type { Player, PlayerStatus, ModalConfig, SortKey, SortDir } from '../lib/types';
import { ALL_POSITIONS, POS_GROUPS, POS_ORDER, getCompColor, getPositionColors, getRatingColors, getStatusColor } from '../lib/constants';
import { useApp } from '../lib/AppContext';
import { derivePlayerStats, getMatchCompetitions, filterMatchesByComp, applySeasonFilter } from '../lib/stats';
import type { SeasonFilter } from '../lib/types';

export default function SquadPage() {
  const router = useRouter();
  const { players, matches, seasons, activeSeason, isLoaded, isViewingActiveTeam, setPlayers, setMatches, addPlayer: ctxAddPlayer, deletePlayer: ctxDeletePlayer, updatePlayer: ctxUpdatePlayer, compColorOverrides } = useApp();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [rating, setRating] = useState("");
  const [position, setPosition] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string | number>>({});
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [filterComp, setFilterComp] = useState("All");
  const [filterSeason, setFilterSeason] = useState<SeasonFilter>("active");

  // Also listen for search input
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStarters, setFilterStarters] = useState(false);
  const [filterPosition, setFilterPosition] = useState("");

  // ─── Competition filtering ───
  const matchCompetitions = useMemo(() => getMatchCompetitions(matches), [matches]);

  const filteredMatches = useMemo(() => {
    return filterMatchesByComp(
      applySeasonFilter(matches, filterSeason, activeSeason),
      filterComp
    );
  }, [matches, filterComp, filterSeason, activeSeason]);

  // Per-player stats computed from filtered matches (always derived from match data)
  const playerFilteredStats = useMemo(() => {
    return derivePlayerStats(players, filteredMatches);
  }, [players, filteredMatches]);

  // Helper to get display stats for a player
  const getStats = (player: Player) => playerFilteredStats.get(player.id) || { goals: 0, assists: 0, appearances: 0 };

  // ─── Sorting (always uses derived stats) ───
  const sortedPlayers = useMemo(() => {
    // First apply search filter
    let filtered = players;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    if (filterStarters) {
      filtered = filtered.filter(p => p.isStarter && (p.status || "active") === "active");
    }
    if (filterPosition) {
      filtered = filtered.filter(p => p.position === filterPosition);
    }
    const statKeys = ["goals", "assists", "appearances"] as const;
    const STATUS_ORDER: Record<string, number> = { active: 0, loaned: 1, sold: 2, retired: 3 };
    // Pre-compute stats per player ONCE to avoid two .get() calls per comparator invocation
    const withStats = filtered.map(p => ({ p, stats: playerFilteredStats.get(p.id) }));
    const sorted = [...withStats].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.p.name.localeCompare(b.p.name);
      else if (sortKey === "position") cmp = (POS_ORDER[a.p.position] ?? 99) - (POS_ORDER[b.p.position] ?? 99);
      else if (sortKey === "status") cmp = (STATUS_ORDER[a.p.status || "active"] ?? 0) - (STATUS_ORDER[b.p.status || "active"] ?? 0);
      else if ((statKeys as readonly string[]).includes(sortKey)) {
        cmp = ((a.stats as Record<string, number> | undefined)?.[sortKey] ?? 0)
            - ((b.stats as Record<string, number> | undefined)?.[sortKey] ?? 0);
      }
      else cmp = ((a.p[sortKey as keyof Player] as number) ?? 0) - ((b.p[sortKey as keyof Player] as number) ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted.map(({ p }) => p);
  }, [players, searchQuery, filterStarters, filterPosition, sortKey, sortDir, playerFilteredStats]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "position" || key === "status" ? "asc" : "desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-slate-600 ml-1">⇅</span>;
    return <span className="text-blue-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // ─── Add player ───
  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = " ";
    if (!position) errors.position = " ";
    if (!age) errors.age = " ";
    if (!rating) errors.rating = " ";
    if (Number(rating) > 105) errors.rating = "Max 105";
    if (Number(age) > 50 || Number(age) < 15) errors.age = "15-50";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    ctxAddPlayer({
      id: Date.now() + (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000),
      name: name.trim(),
      age: Math.max(15, Math.min(50, Number(age) || 18)),
      rating: Math.max(1, Math.min(105, Number(rating) || 50)),
      position,
      isStarter: false,
    });
    setName(""); setAge(""); setRating(""); setPosition("");
  };

  // ─── Inline edit ───
  const startEdit = (player: { id: number; name: string; age: number; rating: number; position: string; isStarter?: boolean; status?: PlayerStatus }) => {
    setEditingId(player.id);
    setEditValues({ name: player.name, age: player.age, rating: player.rating, position: player.position, isStarter: player.isStarter ? 1 : 0, status: player.status || "active" });
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const saveEdit = (id: number) => {
    const editName = String(editValues.name ?? "").trim();
    const editAge = Number(editValues.age);
    const editRating = Number(editValues.rating);
    const editPosition = String(editValues.position ?? "");
    const editStatus = (editValues.status as PlayerStatus) || "active";
    // Validate inline edit
    if (!editName) return;
    if (!editPosition || !(ALL_POSITIONS as readonly string[]).includes(editPosition)) return;
    if (isNaN(editAge) || editAge < 15 || editAge > 50) return;
    if (isNaN(editRating) || editRating < 1 || editRating > 105) return;
    const isFormer = editStatus === "sold" || editStatus === "retired" || editStatus === "loaned";
    ctxUpdatePlayer(id, {
      name: editName,
      age: editAge,
      rating: editRating,
      position: editPosition,
      isStarter: isFormer ? false : editValues.isStarter === 1,
      status: editStatus,
    });
    setEditingId(null);
    setEditValues({});
  };

  const toggleStarter = (id: number) => {
    const player = players.find(p => p.id === id);
    if (player) ctxUpdatePlayer(id, { isStarter: !player.isStarter });
  };

  const starterCount = players.filter(p => p.isStarter && (p.status || "active") === "active").length;

  const deletePlayer = (id: number) => {
    setModal({
      title: "Remove Player",
      message: "Are you sure you want to remove this player from the squad?",
      type: "danger",
      confirmText: "Remove",
      onConfirm: () => {
        ctxDeletePlayer(id);
        setModal(null);
      },
    });
  };

  const clearAllPlayers = () => {
    setModal({
      title: "Clear Entire Squad",
      message: "WARNING: This will delete your ENTIRE squad. This action cannot be undone.",
      type: "danger",
      confirmText: "Clear Squad",
      onConfirm: () => {
        setPlayers([]);
        // Clean up all player references from matches
        setMatches((prev: import('../lib/types').Match[]) => prev.map(m => ({
          ...m,
          appearanceIds: [],
          goals: m.goals.map(g => ({ ...g, scorerId: '', assisterId: '' })),
        })));
        setModal(null);
      },
    });
  };

  // ─── Split players by status (single useMemo to halve iterations on sortedPlayers change) ───
  const { activePlayers, formerPlayers } = useMemo(() => ({
    activePlayers: sortedPlayers.filter(p => (p.status || "active") === "active" || p.status === "loaned"),
    formerPlayers: sortedPlayers.filter(p => p.status === "sold" || p.status === "retired"),
  }), [sortedPlayers]);

  // ─── Pagination for active players ───
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 20;
  const totalActivePages = Math.max(1, Math.ceil(activePlayers.length / playersPerPage));
  const paginatedActive = activePlayers.slice((currentPage - 1) * playersPerPage, currentPage * playersPerPage);
  useEffect(() => { setCurrentPage(1); }, [filterComp, filterSeason, searchQuery, filterStarters, filterPosition]);
  useEffect(() => { if (currentPage > totalActivePages) setCurrentPage(totalActivePages); }, [currentPage, totalActivePages]);

  // ─── Squad summary stats (memoized) ───
  const activePlayersAll = useMemo(() => players.filter(p => (p.status || "active") === "active" || p.status === "loaned"), [players]);
  const squadSummary = useMemo(() => {
    const avgRating = activePlayersAll.length > 0
      ? Math.round(activePlayersAll.reduce((s, p) => s + p.rating, 0) / activePlayersAll.length)
      : 0;
    const avgAge = activePlayersAll.length > 0
      ? (activePlayersAll.reduce((s, p) => s + p.age, 0) / activePlayersAll.length).toFixed(1)
      : "0";
    const statsValues = Array.from(playerFilteredStats.values());
    const totalGoals = statsValues.reduce((s, v) => s + v.goals, 0);
    const totalAssists = statsValues.reduce((s, v) => s + v.assists, 0);
    return { avgRating, avgAge, totalGoals, totalAssists };
  }, [activePlayersAll, playerFilteredStats]);

  return (
    <>
      <ArchivedTeamBanner />
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      {!isLoaded ? (
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-800 rounded w-48"></div>
            <div className="h-16 bg-slate-800 rounded-lg"></div>
            <div className="h-64 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      ) : (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400 tracking-tight">Squad Management</h1>
          {players.length > 0 && isViewingActiveTeam && (
            <button 
              onClick={clearAllPlayers}
              className="text-xs bg-red-900/30 text-red-400 border border-red-800/50 px-3 py-1 rounded hover:bg-red-800/50 transition"
            >
              Clear Entire Squad
            </button>
          )}
        </div>

        {/* Filters */}
        {(matchCompetitions.length > 0 || seasons.length > 0) && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {seasons.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Season</label>
                <select
                  value={filterSeason}
                  onChange={e => setFilterSeason(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="active">Active Season</option>
                  <option value="all">All Seasons</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {matchCompetitions.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="squad-comp-filter" className="text-xs font-bold uppercase tracking-widest text-slate-500">Competition</label>
                <select
                  id="squad-comp-filter"
                  value={filterComp}
                  onChange={e => setFilterComp(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="All">All Competitions</option>
                  {matchCompetitions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {filterComp !== "All" && (
                  <span className={`text-xs font-bold ${getCompColor(filterComp, compColorOverrides.get(filterComp)).text} ${getCompColor(filterComp, compColorOverrides.get(filterComp)).bg} border ${getCompColor(filterComp, compColorOverrides.get(filterComp)).border} px-3 py-1 rounded`}>{filterComp}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* SQUAD SUMMARY */}
        {players.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Players</p>
              <p className="text-2xl font-black text-slate-200">{activePlayersAll.length}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Avg Rating</p>
              <p className={`text-2xl font-black ${squadSummary.avgRating >= 80 ? "text-emerald-400" : squadSummary.avgRating >= 70 ? "text-lime-400" : "text-amber-400"}`}>{squadSummary.avgRating}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Avg Age</p>
              <p className="text-2xl font-black text-blue-400">{squadSummary.avgAge}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{filterComp === "All" ? "Total" : filterComp} Goals</p>
              <p className="text-2xl font-black text-green-400">{squadSummary.totalGoals}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{filterComp === "All" ? "Total" : filterComp} Assists</p>
              <p className="text-2xl font-black text-yellow-400">{squadSummary.totalAssists}</p>
            </div>
          </div>
        )}

        {/* REGISTRATION FORM */}
        {isViewingActiveTeam && <form onSubmit={addPlayer} className="bg-slate-800 p-6 rounded-lg mb-8 flex flex-wrap gap-4 items-start border border-slate-700 shadow-lg">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="squad-name" className="block text-xs font-semibold mb-1 text-slate-500 uppercase">Player Name</label>
            <input 
              id="squad-name"
              value={name} 
              onChange={e => { setName(e.target.value); setFieldErrors(prev => { const { name: _, ...rest } = prev; return rest; }); }} 
              className={`w-full bg-slate-900 p-2 h-10 rounded border focus:outline-none transition ${fieldErrors.name ? "border-red-500" : "border-slate-700 focus:border-blue-500"}`}
              placeholder="Player Name" 
            />
            <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.name || ""}</p>
          </div>
          
          <div className="w-28">
            <label htmlFor="squad-position" className="block text-xs font-semibold mb-1 text-slate-500 uppercase">POS</label>
            <select 
              id="squad-position"
              value={position} 
              onChange={e => { setPosition(e.target.value); setFieldErrors(prev => { const { position: _, ...rest } = prev; return rest; }); }} 
              className={`w-full bg-slate-900 p-2 h-10 rounded border focus:outline-none transition ${fieldErrors.position ? "border-red-500" : "border-slate-700 focus:border-blue-500"}`}
            >
              <option value="" disabled className="text-slate-500">Select</option>
              {ALL_POSITIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.position || ""}</p>
          </div>

          <div className="w-20">
            <label htmlFor="squad-age" className="block text-xs font-semibold mb-1 text-slate-500 uppercase">Age</label>
            <input 
                id="squad-age"
                type="number" 
                min="0" 
                value={age} 
                onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) { setAge(v); setFieldErrors(prev => { const { age: _, ...rest } = prev; return rest; }); } }} 
                className={`w-full bg-slate-900 p-2 h-10 rounded border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${fieldErrors.age ? "border-red-500" : "border-slate-700"}`}
                placeholder="18"
            />
            <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.age || ""}</p>
          </div>

          <div className="w-20">
            <label htmlFor="squad-rating" className="block text-xs font-semibold mb-1 text-slate-500 uppercase">OVR</label>
            <input 
                id="squad-rating"
                type="number" 
                min="0" 
                value={rating} 
                onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) { setRating(v); setFieldErrors(prev => { const { rating: _, ...rest } = prev; return rest; }); } }} 
                className={`w-full bg-slate-900 p-2 h-10 rounded border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${fieldErrors.rating ? "border-red-500" : "border-slate-700"}`}
                placeholder="80"
            />
            <p className="h-4 mt-1 text-red-400 text-[10px]">{fieldErrors.rating || ""}</p>
          </div>

          <div className="flex flex-col">
            <div className="h-5" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 h-10 rounded font-bold shadow-lg shadow-blue-900/20 transition active:scale-95">
              Add Player
            </button>
          </div>
        </form>}

        {/* Player Search + Position Filter */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-3">
            <label htmlFor="squad-search" className="sr-only">Search players</label>
            <input
              id="squad-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition w-64"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-xs text-slate-500 hover:text-slate-300">✕ Clear</button>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setFilterPosition("")}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                filterPosition === ""
                  ? "bg-slate-600 text-slate-100 border-slate-400"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              All
            </button>
            {POS_GROUPS.map(group => (
              <React.Fragment key={group.label}>
                <span className="text-slate-700 text-xs select-none">│</span>
                {group.positions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setFilterPosition(prev => prev === pos ? "" : pos)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                      filterPosition === pos
                        ? getPositionColors(pos)
                        : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* SQUAD TABLE */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-700/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th scope="col" className={`p-4 w-10 text-center cursor-pointer select-none transition ${filterStarters ? 'text-yellow-400' : 'hover:text-yellow-400'}`} title={filterStarters ? 'Showing starters only — click to show all' : 'Click to show starters only'} onClick={() => setFilterStarters(v => !v)}>
                  <span className="text-yellow-400">★</span>
                  {!filterStarters && starterCount > 0 && (
                    <span className={`ml-1 ${starterCount > 11 ? "text-red-400" : starterCount === 11 ? "text-green-400" : "text-slate-400"}`}>{starterCount}/11</span>
                  )}
                  {filterStarters && <span className="ml-1 text-yellow-400 text-[9px]">only</span>}
                </th>
                <th scope="col" className="p-4 cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("name")}>
                  Player {sortIcon("name")}
                </th>
                <th scope="col" className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("position")}>
                  Pos {sortIcon("position")}
                </th>
                <th scope="col" className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("age")}>
                  Age {sortIcon("age")}
                </th>
                <th scope="col" className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("rating")}>
                  OVR {sortIcon("rating")}
                </th>
                <th scope="col" className="p-4 text-center text-blue-400 cursor-pointer select-none hover:text-blue-300 transition" onClick={() => handleSort("appearances")}>
                  Apps {sortIcon("appearances")}
                </th>
                <th scope="col" className="p-4 text-center text-green-400 cursor-pointer select-none hover:text-green-300 transition" onClick={() => handleSort("goals")}>
                  Goals {sortIcon("goals")}
                </th>
                <th scope="col" className="p-4 text-center text-yellow-400 cursor-pointer select-none hover:text-yellow-300 transition" onClick={() => handleSort("assists")}>
                  Assists {sortIcon("assists")}
                </th>
                <th scope="col" className="p-4 text-center text-red-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {paginatedActive.map(player => (
                <tr
                  key={player.id}
                  className={`hover:bg-blue-500/5 transition-colors group ${editingId !== player.id ? 'cursor-pointer' : ''}`}
                  onClick={() => { if (editingId !== player.id) router.push(`/squad/${player.id}`); }}
                >
                  {editingId === player.id ? (
                    <>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setEditValues(v => ({ ...v, isStarter: v.isStarter === 1 ? 0 : 1 }))}
                          className={`text-lg transition hover:scale-110 ${editValues.isStarter === 1 ? "text-yellow-400" : "text-slate-700 hover:text-yellow-600"}`}
                          title="Toggle starter"
                        >
                          ★
                        </button>
                      </td>
                      <td className="p-3">
                        <input
                          value={editValues.name ?? ""}
                          onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                          className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-full text-sm focus:outline-none focus:border-blue-500 mb-1"
                        />
                        <select
                          value={String(editValues.status || "active")}
                          onChange={e => setEditValues({ ...editValues, status: e.target.value })}
                          className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-blue-500 w-full"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="active">Active</option>
                          <option value="loaned">Loaned</option>
                          <option value="sold">Sold</option>
                          <option value="retired">Retired</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={editValues.position ?? ""}
                          onChange={e => setEditValues({ ...editValues, position: e.target.value })}
                          className="bg-slate-900 border border-slate-600 rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                        >
                          {ALL_POSITIONS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number" min="0"
                          value={editValues.age ?? 0}
                          onChange={e => setEditValues({ ...editValues, age: Number(e.target.value) })}
                          className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-14 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number" min="0"
                          value={editValues.rating ?? 0}
                          onChange={e => setEditValues({ ...editValues, rating: Number(e.target.value) })}
                          className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-14 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono">{getStats(player).appearances}</td>
                      <td className="p-3 text-center text-slate-500 font-mono">{getStats(player).goals}</td>
                      <td className="p-3 text-center text-slate-500 font-mono">{getStats(player).assists}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => saveEdit(player.id)}
                            className="text-[10px] font-bold bg-green-900/40 text-green-400 border border-green-700/50 px-2 py-1 rounded hover:bg-green-800/50 transition"
                          >Save</button>
                          <button
                            onClick={cancelEdit}
                            className="text-[10px] font-bold bg-slate-700/40 text-slate-400 border border-slate-600/50 px-2 py-1 rounded hover:bg-slate-600/50 transition"
                          >Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStarter(player.id); }}
                          className={`text-lg transition hover:scale-110 ${player.isStarter ? "text-yellow-400" : "text-slate-700 hover:text-yellow-600"}`}
                          title={player.isStarter ? "Remove from starting XI" : "Add to starting XI"}
                          aria-label={player.isStarter ? "Remove from starting XI" : "Add to starting XI"}
                        >
                          ★
                        </button>
                      </td>
                      <td className="p-4 font-bold text-slate-200 group-hover:text-blue-400 transition">
                        <span>{player.name}</span>
                        {player.status === "loaned" && (
                          <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor("loaned")}`}>LOANED</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-1 rounded border ${getPositionColors(player.position)}`}>
                          {player.position}
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-400 font-medium">{player.age}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isViewingActiveTeam && (
                            <button
                              onClick={(e) => { e.stopPropagation(); ctxUpdatePlayer(player.id, { rating: Math.max(1, player.rating - 1) }); }}
                              className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 select-none"
                              title="Decrease rating"
                            >
                              −
                            </button>
                          )}
                          <span className={`px-2.5 py-1 rounded-md border font-bold ${getRatingColors(player.rating)}`}>
                            {player.rating}
                          </span>
                          {isViewingActiveTeam && (
                            <button
                              onClick={(e) => { e.stopPropagation(); ctxUpdatePlayer(player.id, { rating: Math.min(99, player.rating + 1) }); }}
                              className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-slate-500 hover:bg-green-500/20 hover:text-green-400 transition-all opacity-0 group-hover:opacity-100 select-none"
                              title="Increase rating"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-300">{getStats(player).appearances}</td>
                      <td className="p-4 text-center font-mono font-bold text-green-500">{getStats(player).goals}</td>
                      <td className="p-4 text-center font-mono font-bold text-yellow-500">{getStats(player).assists}</td>
                      <td className="p-4 px-3">
                        {isViewingActiveTeam && <div className="flex justify-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEdit(player); }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20 text-xs"
                            title="Edit Player"
                            aria-label={`Edit ${player.name}`}
                          >
                            ✎
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePlayer(player.id); }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 text-xs"
                            title="Remove Player"
                            aria-label={`Remove ${player.name}`}
                          >
                            ✕
                          </button>
                        </div>}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {activePlayers.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-slate-600">
                    <p className="italic text-lg mb-1">No active players found</p>
                    <p className="text-xs uppercase tracking-widest">Sign players to begin tracking stats</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalActivePages}
          totalItems={activePlayers.length}
          itemsPerPage={playersPerPage}
          onPageChange={setCurrentPage}
          itemLabel="players"
        />

        {/* FORMER PLAYERS TABLE */}
        {formerPlayers.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-slate-600 rounded-full inline-block"></span>
              Former Players
              <span className="text-sm font-normal text-slate-600">({formerPlayers.length})</span>
            </h2>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-700/20 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="p-3">Player</th>
                    <th className="p-3 text-center">Pos</th>
                    <th className="p-3 text-center">OVR</th>
                    <th className="p-3 text-center">Apps</th>
                    <th className="p-3 text-center">Goals</th>
                    <th className="p-3 text-center">Assists</th>
                    <th className="p-3 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("status")}>Status {sortIcon("status")}</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30 text-sm">
                  {formerPlayers.map(player => {
                    const stats = getStats(player);
                    const sc = getStatusColor(player.status || "active");
                    return (
                      <tr
                        key={player.id}
                        className={`hover:bg-slate-700/20 transition-colors ${editingId !== player.id ? 'cursor-pointer opacity-70 hover:opacity-100' : 'opacity-100'}`}
                        onClick={() => { if (editingId !== player.id) router.push(`/squad/${player.id}`); }}
                      >
                        {editingId === player.id ? (
                          <>
                            <td className="p-3">
                              <input
                                value={editValues.name ?? ""}
                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-full text-sm focus:outline-none focus:border-blue-500"
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={editValues.position ?? ""}
                                onChange={e => setEditValues({ ...editValues, position: e.target.value })}
                                className="bg-slate-900 border border-slate-600 rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                                onClick={e => e.stopPropagation()}
                              >
                                {ALL_POSITIONS.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number" min="0"
                                value={editValues.rating ?? 0}
                                onChange={e => setEditValues({ ...editValues, rating: Number(e.target.value) })}
                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-14 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500">{stats.appearances}</td>
                            <td className="p-3 text-center font-mono text-green-600">{stats.goals}</td>
                            <td className="p-3 text-center font-mono text-yellow-600">{stats.assists}</td>
                            <td className="p-3">
                              <select
                                value={String(editValues.status || "active")}
                                onChange={e => setEditValues({ ...editValues, status: e.target.value })}
                                className="bg-slate-900 border border-slate-600 rounded px-1 py-1 text-[10px] focus:outline-none focus:border-blue-500 w-full"
                                onClick={e => e.stopPropagation()}
                              >
                                <option value="active">Active</option>
                                <option value="loaned">Loaned</option>
                                <option value="sold">Sold</option>
                                <option value="retired">Retired</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => saveEdit(player.id)}
                                  className="text-[10px] font-bold bg-green-900/40 text-green-400 border border-green-700/50 px-2 py-1 rounded hover:bg-green-800/50 transition"
                                >Save</button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-[10px] font-bold bg-slate-700/40 text-slate-400 border border-slate-600/50 px-2 py-1 rounded hover:bg-slate-600/50 transition"
                                >Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-bold text-slate-400">{player.name}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${getPositionColors(player.position)}`}>
                                {player.position}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-500 font-bold">{player.rating}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{stats.appearances}</td>
                            <td className="p-3 text-center font-mono text-green-600">{stats.goals}</td>
                            <td className="p-3 text-center font-mono text-yellow-600">{stats.assists}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sc}`}>
                                {(player.status || "active").toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              {isViewingActiveTeam && <div className="flex justify-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEdit(player); }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20 text-xs"
                                  title="Edit Player"
                                >✎</button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deletePlayer(player.id); }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 text-xs"
                                  title="Remove Player"
                                >✕</button>
                              </div>}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      <CustomModal config={modal} onClose={() => setModal(null)} />
    </main>
    </>
  );
}