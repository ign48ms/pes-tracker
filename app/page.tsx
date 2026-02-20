"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "./lib/AppContext";
import { computeRecord, getResult, getTopScorers, getTopAssisters, getMatchCompetitions, computeStreaks, computeMilestones, derivePlayerStats, applySeasonFilter } from "./lib/stats";
import { getPositionColors, getCompColor } from "./lib/constants";
import type { SeasonFilter } from "./lib/types";
import ResultBadge from "./components/ResultBadge";
import CompBadge from "./components/CompBadge";

export default function DashboardPage() {
  const { players, matches, seasons, activeSeason, playerStats, teamName, isLoaded } = useApp();

  const [filterSeason, setFilterSeason] = useState<SeasonFilter>("active");

  // Season matches based on picker
  const seasonMatches = useMemo(() => {
    return applySeasonFilter(matches, filterSeason, activeSeason)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [matches, filterSeason, activeSeason]);

  const record = useMemo(() => computeRecord(seasonMatches), [seasonMatches]);
  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0;

  // Form guide: last 5 matches (keep id for stable React key)
  const formGuide = useMemo(() => {
    return seasonMatches.slice(0, 5).map(m => ({ id: m.id, result: getResult(m) }));
  }, [seasonMatches]);

  // Per-season derived stats (single computation shared by topScorers and topAssisters)
  const seasonStats = useMemo(() => derivePlayerStats(players, seasonMatches), [players, seasonMatches]);

  // Top performers — pass pre-computed statsMap to avoid redundant passes
  const topScorers = useMemo(() => getTopScorers(players, seasonMatches, 5, seasonStats), [players, seasonMatches, seasonStats]);
  const topAssisters = useMemo(() => getTopAssisters(players, seasonMatches, 5, seasonStats), [players, seasonMatches, seasonStats]);

  // Competition breakdown — single O(n) groupBy pass instead of one filter per competition
  const compBreakdown = useMemo(() => {
    const groups = new Map<string, typeof seasonMatches>();
    for (const m of seasonMatches) {
      const comp = m.competition || "Friendly";
      if (!groups.has(comp)) groups.set(comp, []);
      groups.get(comp)!.push(m);
    }
    return Array.from(groups.entries())
      .map(([comp, ms]) => ({ comp, record: computeRecord(ms), matches: ms.length }))
      .sort((a, b) => b.matches - a.matches);
  }, [seasonMatches]);

  // Recent matches
  const recentMatches = useMemo(() => seasonMatches.slice(0, 5), [seasonMatches]);

  // Streaks
  const streaks = useMemo(() => computeStreaks(seasonMatches), [seasonMatches]);

  // Milestones (all-time) — reuse context-provided playerStats instead of re-deriving
  const milestones = useMemo(() => computeMilestones(players, playerStats), [players, playerStats]);

  const isEmpty = matches.length === 0 && players.length === 0;

  // Get display season name
  const displaySeasonName = useMemo(() => {
    if (filterSeason === "active" && activeSeason) return activeSeason.name;
    if (filterSeason === "all") return "All Seasons";
    const s = seasons.find(s => s.id === Number(filterSeason));
    return s?.name || "Unknown";
  }, [filterSeason, activeSeason, seasons]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-800 rounded w-48"></div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 tracking-tight mb-1">Dashboard</h1>
            {teamName && (
              <p className="text-sm font-semibold text-slate-400">{teamName}</p>
            )}
            {!teamName && activeSeason && (
              <p className="text-sm text-slate-500">{displaySeasonName}</p>
            )}
          </div>
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
        </div>

        {isEmpty ? (
          <div className="text-center py-24">
            <p className="text-xl text-slate-500 mb-2">Welcome to MyPES</p>
            <p className="text-sm text-slate-600 mb-6">Start by adding players to your squad and recording matches.</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/squad"
                className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold transition"
              >
                Manage Squad
              </Link>
              <Link
                href="/matches"
                className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-bold transition"
              >
                Record Match
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Season Record */}
            {seasonMatches.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Played</p>
                    <p className="text-xl font-black text-slate-200">{record.played}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-1">Won</p>
                    <p className="text-xl font-black text-green-400">{record.wins}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Drawn</p>
                    <p className="text-xl font-black text-slate-300">{record.draws}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Lost</p>
                    <p className="text-xl font-black text-red-400">{record.losses}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">GF</p>
                    <p className="text-xl font-black text-blue-400">{record.goalsFor}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">GA</p>
                    <p className="text-xl font-black text-orange-400">{record.goalsAgainst}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">GD</p>
                    <p className={`text-xl font-black ${record.goalDifference > 0 ? "text-green-400" : record.goalDifference < 0 ? "text-red-400" : "text-slate-300"}`}>
                      {record.goalDifference > 0 ? "+" : ""}{record.goalDifference}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Win %</p>
                    <p className={`text-xl font-black ${winRate >= 60 ? "text-green-400" : winRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                      {winRate}%
                    </p>
                  </div>
                </div>

                {/* Form Guide */}
                {formGuide.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Form</span>
                    <div className="flex gap-1.5">
                      {formGuide.map(({ id, result }) => (
                        <span
                          key={id}
                          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-black ${
                            result === "W"
                              ? "bg-green-900/50 text-green-400 border border-green-800/50"
                              : result === "L"
                              ? "bg-red-900/50 text-red-400 border border-red-800/50"
                              : "bg-slate-700 text-slate-300 border border-slate-600"
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Streaks */}
            {seasonMatches.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-1">Win Streak</p>
                  <p className="text-xl font-black text-green-400">{streaks.current.winStreak}</p>
                  <p className="text-[9px] text-slate-600">Best: {streaks.best.winStreak}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Unbeaten</p>
                  <p className="text-xl font-black text-blue-400">{streaks.current.unbeatenStreak}</p>
                  <p className="text-[9px] text-slate-600">Best: {streaks.best.unbeatenStreak}</p>
                </div>
                {Object.entries(streaks.byComp).slice(0, 2).map(([comp, cs]) => (
                  <div key={comp} className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 truncate" title={comp}>{comp}</p>
                    <p className="text-xl font-black text-green-400">{cs.current.winStreak}W</p>
                    <p className="text-[9px] text-slate-600">{cs.current.unbeatenStreak} unbeaten</p>
                  </div>
                ))}
              </div>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
                  Milestones
                </h2>
                <div className="flex flex-wrap gap-2">
                  {milestones.map((m, i) => {
                    const p = players.find(pl => pl.id === m.playerId);
                    return (
                      <Link
                        key={i}
                        href={`/squad/${m.playerId}`}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition hover:opacity-80 ${
                          m.type === "appearances"
                            ? "bg-blue-900/30 border-blue-700/50 text-blue-400"
                            : m.type === "goals"
                            ? "bg-green-900/30 border-green-700/50 text-green-400"
                            : "bg-yellow-900/30 border-yellow-700/50 text-yellow-400"
                        }`}
                      >
                        🏆 {p?.name || "?"} — {m.milestone} {m.type}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Two column: Top Performers + Recent Matches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Scorers */}
              {topScorers.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
                    Top Scorers
                  </h2>
                  <div className="space-y-2">
                    {topScorers.map(({ player, goals }, i) => (
                      <Link
                        key={player.id}
                        href={`/squad/${player.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/50 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            i === 0 ? "bg-yellow-900/50 text-yellow-400" : "bg-slate-700 text-slate-400"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition">{player.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPositionColors(player.position)}`}>
                            {player.position}
                          </span>
                        </div>
                        <span className="text-lg font-black text-green-400">{goals}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Assisters */}
              {topAssisters.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-yellow-500 rounded-full"></span>
                    Top Assisters
                  </h2>
                  <div className="space-y-2">
                    {topAssisters.map(({ player, assists }, i) => (
                      <Link
                        key={player.id}
                        href={`/squad/${player.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/50 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            i === 0 ? "bg-yellow-900/50 text-yellow-400" : "bg-slate-700 text-slate-400"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition">{player.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPositionColors(player.position)}`}>
                            {player.position}
                          </span>
                        </div>
                        <span className="text-lg font-black text-yellow-400">{assists}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Matches */}
            {recentMatches.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                    Recent Matches
                  </h2>
                  <Link href="/matches" className="text-xs text-blue-400 hover:text-blue-300 transition font-semibold">
                    View All →
                  </Link>
                </div>
                <div className="space-y-2">
                  {recentMatches.map(match => {
                    return (
                      <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <ResultBadge myScore={match.myScore} opScore={match.opScore} className="text-sm" />
                          <div>
                            <span className="font-semibold text-sm text-slate-200">{match.opponent}</span>
                          </div>
                        </div>
                        <CompBadge competition={match.competition || "Friendly"} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Competition Breakdown */}
            {compBreakdown.length > 1 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>
                  Competition Breakdown
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {compBreakdown.map(({ comp, record: r }) => {
                    const cc = getCompColor(comp);
                    return (
                      <div key={comp} className={`p-3 rounded-lg border ${cc.border} ${cc.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${cc.text}`}>{comp}</span>
                          <span className="text-[10px] text-slate-500">{r.played} matches</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-400 font-bold">{r.wins}W</span>
                          <span className="text-slate-400 font-bold">{r.draws}D</span>
                          <span className="text-red-400 font-bold">{r.losses}L</span>
                          <span className="text-slate-500">GF {r.goalsFor} GA {r.goalsAgainst}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/squad"
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700/50 hover:border-blue-800/50 transition group text-center"
              >
                <p className="text-2xl font-black text-slate-200 mb-1">{players.length}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-400 transition">Squad Players</p>
              </Link>
              <Link
                href="/matches"
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700/50 hover:border-blue-800/50 transition group text-center"
              >
                <p className="text-2xl font-black text-slate-200 mb-1">{matches.length}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-400 transition">Total Matches</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
