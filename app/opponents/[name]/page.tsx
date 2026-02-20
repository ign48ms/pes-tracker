"use client";
import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "../../lib/AppContext";
import type { Player } from "../../lib/types";
import { computeRecord, getResult, getMatchCompetitions, filterMatchesByComp, buildPlayerMap, getGoalSummary, getAssistSummary } from "../../lib/stats";
import { getPositionColors, getCompColor } from "../../lib/constants";
import ResultBadge from "../../components/ResultBadge";
import CompBadge from "../../components/CompBadge";

export default function OpponentDetailPage() {
  const params = useParams();
  const opponentName = decodeURIComponent(String(params.name));

  const { players, matches, isLoaded } = useApp();

  const opMatches = useMemo(() => {
    return matches
      .filter(m => m.opponent === opponentName)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [matches, opponentName]);

  const record = useMemo(() => computeRecord(opMatches), [opMatches]);
  const playerMap = useMemo(() => buildPlayerMap(players), [players]);

  // Competition breakdown
  const compBreakdown = useMemo(() => {
    const comps = getMatchCompetitions(opMatches);
    return comps.map(comp => {
      const compMatches = filterMatchesByComp(opMatches, comp);
      return { comp, record: computeRecord(compMatches) };
    });
  }, [opMatches]);

  // Top scorers vs this opponent
  const topScorers = useMemo(() => {
    const goalMap = new Map<number, number>();
    opMatches.forEach(m => {
      m.goals?.forEach(g => {
        if (!g.isOwnGoal && g.scorerId && g.scorerId !== "OG") {
          const pid = Number(g.scorerId);
          goalMap.set(pid, (goalMap.get(pid) || 0) + 1);
        }
      });
    });
    return Array.from(goalMap.entries())
      .map(([id, goals]) => ({ player: players.find(p => p.id === id), goals }))
      .filter((x): x is { player: Player; goals: number } => x.player !== undefined)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);
  }, [opMatches, players]);

  // Top assisters vs this opponent
  const topAssisters = useMemo(() => {
    const assistMap = new Map<number, number>();
    opMatches.forEach(m => {
      m.goals?.forEach(g => {
        if (!g.isOwnGoal && g.assisterId) {
          const pid = Number(g.assisterId);
          assistMap.set(pid, (assistMap.get(pid) || 0) + 1);
        }
      });
    });
    return Array.from(assistMap.entries())
      .map(([id, assists]) => ({ player: players.find(p => p.id === id), assists }))
      .filter((x): x is { player: Player; assists: number } => x.player !== undefined)
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 5);
  }, [opMatches, players]);

  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0;

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-slate-800 rounded w-32"></div>
            <div className="h-32 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </main>
    );
  }

  if (opMatches.length === 0) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto text-center py-24">
          <p className="text-xl text-slate-500 mb-4">No matches found vs {opponentName}</p>
          <Link href="/opponents" className="text-blue-400 hover:text-blue-300 transition font-semibold">
            ← Back to Opponents
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8 pb-32">
      <div className="max-w-5xl mx-auto">
        <Link href="/opponents" className="text-sm text-blue-400 hover:text-blue-300 transition mb-6 inline-block">
          ← Back to Opponents
        </Link>

        {/* Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h1 className="text-3xl font-black text-slate-200 tracking-tight mb-2">vs {opponentName}</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">{record.played} matches</span>
            <span className={`font-bold ${winRate >= 50 ? "text-green-400" : winRate >= 30 ? "text-yellow-400" : "text-red-400"}`}>
              {winRate}% win rate
            </span>
          </div>
        </div>

        {/* Record */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Scorers vs Opponent */}
          {topScorers.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4">Top Scorers vs {opponentName}</h2>
              <div className="space-y-2">
                {topScorers.map(({ player: p, goals }, i) => p && (
                  <Link
                    key={p.id}
                    href={`/squad/${p.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/50 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        i === 0 ? "bg-yellow-900/50 text-yellow-400" : "bg-slate-700 text-slate-400"
                      }`}>{i + 1}</span>
                      <span className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition">{p.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPositionColors(p.position)}`}>{p.position}</span>
                    </div>
                    <span className="text-lg font-black text-green-400">{goals}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Assisters vs Opponent */}
          {topAssisters.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4">Top Assisters vs {opponentName}</h2>
              <div className="space-y-2">
                {topAssisters.map(({ player: p, assists }, i) => p && (
                  <Link
                    key={p.id}
                    href={`/squad/${p.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/50 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        i === 0 ? "bg-yellow-900/50 text-yellow-400" : "bg-slate-700 text-slate-400"
                      }`}>{i + 1}</span>
                      <span className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition">{p.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPositionColors(p.position)}`}>{p.position}</span>
                    </div>
                    <span className="text-lg font-black text-yellow-400">{assists}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Competition Breakdown */}
        {compBreakdown.length > 1 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">By Competition</h2>
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-5 pb-0">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
              All Matches ({opMatches.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="bg-slate-700/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="p-4">Matchday</th>
                <th className="p-4 text-center">Comp</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-center text-green-400 hidden sm:table-cell">Scorers</th>
                <th className="p-4 text-center text-yellow-400 hidden sm:table-cell">Assists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {opMatches.map(match => (
                <tr key={match.id} className="hover:bg-blue-500/5 transition-colors">
                  <td className="p-4 text-xs text-slate-500">{match.matchday || "-"}</td>
                  <td className="p-4 text-center">
                    <CompBadge competition={match.competition || "Friendly"} />
                  </td>
                  <td className="p-4 text-center">
                    <ResultBadge myScore={match.myScore} opScore={match.opScore} />
                  </td>
                  <td className="p-4 text-center text-green-500 text-xs font-medium max-w-[150px] truncate hidden sm:table-cell">{getGoalSummary(match, playerMap)}</td>
                  <td className="p-4 text-center text-yellow-500 text-xs font-medium max-w-[150px] truncate hidden sm:table-cell">{getAssistSummary(match, playerMap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </main>
  );
}
