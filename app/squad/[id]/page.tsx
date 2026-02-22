"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Match } from "../../lib/types";
import { useApp } from "../../lib/AppContext";
import { getCompColor, getPositionColors, getRatingColors, getStatusColor } from "../../lib/constants";
import { derivePlayerBreakdowns, filterMatchesBySeason, getMatchCompetitions, filterMatchesByComp, getResult as getMatchResult, computeMilestones } from "../../lib/stats";
import ResultBadge from "../../components/ResultBadge";
import CompBadge from "../../components/CompBadge";
import MatchFilters from "../../components/MatchFilters";

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = Number(params.id);

  const { players, matches, seasons, playerStats, isLoaded, compColorOverrides, updatePlayer: ctxUpdatePlayer, isViewingActiveTeam } = useApp();
  const [filterComp, setFilterComp] = useState("All");
  const [filterSeason, setFilterSeason] = useState<string>("all");

  const player = players.find(p => p.id === playerId);

  // All matches this player appeared in
  const playerMatches = useMemo(() => {
    return matches.filter(m => m.appearanceIds?.includes(playerId));
  }, [matches, playerId]);

  // Filtered matches
  const filteredPlayerMatches = useMemo(() => {
    let filtered = playerMatches;
    if (filterSeason !== "all") {
      filtered = filterMatchesBySeason(filtered, Number(filterSeason));
    }
    if (filterComp !== "All") {
      filtered = filterMatchesByComp(filtered, filterComp);
    }
    return filtered;
  }, [playerMatches, filterSeason, filterComp]);

  // Player stats from filtered matches (single-pass computation)
  const { filteredStats, compBreakdown, seasonBreakdown } = useMemo(() => {
    if (!player) return {
      filteredStats: { goals: 0, assists: 0, appearances: 0 },
      compBreakdown: [] as { comp: string; stats: { goals: number; assists: number; appearances: number } }[],
      seasonBreakdown: [] as { season: { id: number; name: string; isActive: boolean }; stats: { goals: number; assists: number; appearances: number } }[],
    };
    const breakdowns = derivePlayerBreakdowns(playerId, playerMatches, seasons);
    // Apply current filters for the display stats
    let filtered = playerMatches;
    if (filterSeason !== "all") filtered = filterMatchesBySeason(filtered, Number(filterSeason));
    if (filterComp !== "All") filtered = filterMatchesByComp(filtered, filterComp);
    // Recompute filtered-only stats
    let fStats = breakdowns.overall;
    if (filterSeason !== "all" || filterComp !== "All") {
      const fb = derivePlayerBreakdowns(playerId, filtered, seasons);
      fStats = fb.overall;
    }
    return {
      filteredStats: fStats,
      compBreakdown: breakdowns.byCompetition,
      seasonBreakdown: breakdowns.bySeason,
    };
  }, [player, playerMatches, seasons, playerId, filterSeason, filterComp]);

  // Goals and assists in a specific match
  const getPlayerGoalsInMatch = useCallback((match: Match) => {
    if (!match.goals) return 0;
    return match.goals.filter(g => !g.isOwnGoal && g.scorerId === playerId.toString()).length;
  }, [playerId]);

  const getPlayerAssistsInMatch = useCallback((match: Match) => {
    if (!match.goals) return 0;
    return match.goals.filter(g => !g.isOwnGoal && g.assisterId === playerId.toString()).length;
  }, [playerId]);

  // Available competitions from player's matches
  const availableComps = useMemo(() => getMatchCompetitions(playerMatches), [playerMatches]);

  // Player milestones
  const playerMilestones = useMemo(() => {
    if (!player) return [];
    const allMilestones = computeMilestones(players, playerStats);
    return allMilestones.filter(m => m.playerId === playerId);
  }, [player, players, playerStats, playerId]);

  // Form graph: goals in last 10 matches
  const formData = useMemo(() => {
    return filteredPlayerMatches.slice(0, 10).reverse().map(m => ({
      opponent: m.opponent,
      goals: getPlayerGoalsInMatch(m),
      assists: getPlayerAssistsInMatch(m),
      result: getMatchResult(m),
    }));
  }, [filteredPlayerMatches, getPlayerGoalsInMatch, getPlayerAssistsInMatch]);

  const maxGoalsInForm = Math.max(1, ...formData.map(d => d.goals + d.assists));

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-slate-800 rounded w-32"></div>
            <div className="h-32 bg-slate-800 rounded-xl"></div>
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!player || isNaN(playerId)) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto text-center py-24">
          <p className="text-xl text-slate-500 mb-4">Player not found</p>
          <Link href="/squad" className="text-blue-400 hover:text-blue-300 transition font-semibold">
            ← Back to Squad
          </Link>
        </div>
      </main>
    );
  }

  const goalsPerGame = filteredStats.appearances > 0
    ? (filteredStats.goals / filteredStats.appearances).toFixed(2)
    : "0.00";
  const assistsPerGame = filteredStats.appearances > 0
    ? (filteredStats.assists / filteredStats.appearances).toFixed(2)
    : "0.00";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8 pb-32">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link href="/squad" className="text-sm text-blue-400 hover:text-blue-300 transition mb-6 inline-block">
          ← Back to Squad
        </Link>

        {/* Player Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-200 tracking-tight">{player.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-black px-2.5 py-1 rounded border ${getPositionColors(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="text-sm text-slate-400">Age {player.age}</span>
                  {player.status && player.status !== "active" && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(player.status)}`}>
                      {player.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isViewingActiveTeam && (
                <button
                  onClick={() => ctxUpdatePlayer(player.id, { rating: Math.max(1, player.rating - 1) })}
                  className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700 hover:border-red-500/30 select-none"
                  title="Decrease rating"
                >
                  −
                </button>
              )}
              <div className={`text-4xl font-black px-4 py-2 rounded-lg border ${getRatingColors(player.rating)}`}>
                {player.rating}
              </div>
              {isViewingActiveTeam && (
                <button
                  onClick={() => ctxUpdatePlayer(player.id, { rating: Math.min(99, player.rating + 1) })}
                  className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center text-slate-500 hover:bg-green-500/20 hover:text-green-400 transition-all border border-slate-700 hover:border-green-500/30 select-none"
                  title="Increase rating"
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <MatchFilters
            seasons={seasons}
            filterSeason={filterSeason}
            onSeasonChange={setFilterSeason}
            competitions={availableComps}
            filterComp={filterComp}
            onCompChange={setFilterComp}
          />
        </div>

        {/* Career Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Apps</p>
            <p className="text-2xl font-black text-slate-200">{filteredStats.appearances}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-1">Goals</p>
            <p className="text-2xl font-black text-green-400">{filteredStats.goals}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-1">Assists</p>
            <p className="text-2xl font-black text-yellow-400">{filteredStats.assists}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">G+A</p>
            <p className="text-2xl font-black text-slate-200">{filteredStats.goals + filteredStats.assists}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Goals/Game</p>
            <p className="text-2xl font-black text-emerald-400">{goalsPerGame}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Assists/Game</p>
            <p className="text-2xl font-black text-amber-400">{assistsPerGame}</p>
          </div>
        </div>

        {/* Milestones */}
        {playerMilestones.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {playerMilestones.map((m, i) => (
              <span
                key={i}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${
                  m.type === "appearances"
                    ? "bg-blue-900/30 border-blue-700/50 text-blue-400"
                    : m.type === "goals"
                    ? "bg-green-900/30 border-green-700/50 text-green-400"
                    : "bg-yellow-900/30 border-yellow-700/50 text-yellow-400"
                }`}
              >
                🏆 {m.milestone} {m.type}
              </span>
            ))}
          </div>
        )}

        {/* Form Graph */}
        {formData.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
              Contributions (Last {formData.length} Matches)
            </h2>
            <div className="flex items-end gap-1.5" style={{ height: 120 }}>
              {formData.map((d, i) => {
                const barMax = 100; // max height in px for bars
                const totalContrib = d.goals + d.assists;
                const totalHeight = totalContrib > 0 ? Math.max((totalContrib / maxGoalsInForm) * barMax, 6) : 0;
                const goalPortion = totalContrib > 0 ? (d.goals / totalContrib) * totalHeight : 0;
                const assistPortion = totalContrib > 0 ? (d.assists / totalContrib) * totalHeight : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`vs ${d.opponent}: ${d.goals}G ${d.assists}A`}>
                    {/* Bar */}
                    {totalContrib > 0 ? (
                      <div className="w-full flex flex-col">
                        {d.assists > 0 && (
                          <div
                            className="bg-yellow-500/40 rounded-t"
                            style={{ height: `${assistPortion}px` }}
                          />
                        )}
                        {d.goals > 0 && (
                          <div
                            className={`bg-green-500/60 ${d.assists === 0 ? "rounded-t" : ""} rounded-b`}
                            style={{ height: `${goalPortion}px` }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full bg-slate-700/30 rounded" style={{ height: 2 }} />
                    )}
                    {/* Result badge */}
                    <span className={`text-[8px] font-black mt-1 ${
                      d.result === "W" ? "text-green-400" : d.result === "L" ? "text-red-400" : "text-slate-500"
                    }`}>
                      {d.result}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/60 rounded"></span> Goals</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500/40 rounded"></span> Assists</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Per-Competition Stats */}
          {compBreakdown.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">By Competition</h2>
              <div className="space-y-2">
                {compBreakdown.map(({ comp, stats }) => {
                  const cc = getCompColor(comp, compColorOverrides.get(comp));
                  return (
                    <div key={comp} className={`flex items-center justify-between p-3 rounded-lg border ${cc.border} ${cc.bg}`}>
                      <span className={`text-sm font-bold ${cc.text}`}>{comp}</span>
                      <div className="flex gap-4 text-xs font-bold">
                        <span className="text-blue-400">{stats.appearances} apps</span>
                        <span className="text-green-400">{stats.goals} goals</span>
                        <span className="text-yellow-400">{stats.assists} assists</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-Season Stats */}
          {seasonBreakdown.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">By Season</h2>
              <div className="space-y-2">
                {seasonBreakdown.map(({ season, stats }) => (
                  <div key={season.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <span className={`text-sm font-bold ${season.isActive ? "text-blue-400" : "text-slate-300"}`}>
                      {season.name}
                      {season.isActive && <span className="text-xs text-green-400 ml-2">(active)</span>}
                    </span>
                    <div className="flex gap-4 text-xs font-bold">
                      <span className="text-blue-400">{stats.appearances} apps</span>
                      <span className="text-green-400">{stats.goals} goals</span>
                      <span className="text-yellow-400">{stats.assists} assists</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Match Log */}
        {filteredPlayerMatches.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-5 pb-0">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Match Log ({filteredPlayerMatches.length} matches)
              </h2>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-slate-700/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="p-4">Opponent</th>
                  <th className="p-4 text-center hidden sm:table-cell">Matchday</th>
                  <th className="p-4 text-center">Comp</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4 text-center text-green-400">Goals</th>
                  <th className="p-4 text-center text-yellow-400">Assists</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {filteredPlayerMatches.map(match => {
                  const goals = getPlayerGoalsInMatch(match);
                  const assists = getPlayerAssistsInMatch(match);
                  const comp = match.competition || "Friendly";
                  return (
                    <tr key={match.id} className="hover:bg-blue-500/5 transition-colors">
                      <td className="p-4 font-bold text-slate-200">{match.opponent}</td>
                      <td className="p-4 text-center text-xs text-slate-500 hidden sm:table-cell">{match.matchday || "-"}</td>
                      <td className="p-4 text-center">
                        <CompBadge competition={comp} colorKey={compColorOverrides.get(comp)} />
                      </td>
                      <td className="p-4 text-center">
                        <ResultBadge myScore={match.myScore} opScore={match.opScore} penMyScore={match.penMyScore} penOpScore={match.penOpScore} />
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-green-500">{goals > 0 ? goals : "-"}</td>
                      <td className="p-4 text-center font-mono font-bold text-yellow-500">{assists > 0 ? assists : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {filteredPlayerMatches.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg italic">No match appearances yet</p>
          </div>
        )}
      </div>
    </main>
  );
}
