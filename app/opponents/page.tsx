"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "../lib/AppContext";
import { groupMatchesByOpponent, computeRecord, filterMatchesByComp, getMatchCompetitions, applySeasonFilter } from "../lib/stats";
import type { SeasonFilter } from "../lib/types";
import Pagination from "../components/Pagination";
import MatchFilters from "../components/MatchFilters";
import ArchivedTeamBanner from "../components/ArchivedTeamBanner";

type SortKey = "name" | "played" | "wins" | "losses" | "draws" | "gf" | "ga" | "gd";
type SortDir = "asc" | "desc";

export default function OpponentsPage() {
  const { matches, seasons, activeSeason, isLoaded } = useApp();
  const [filterSeason, setFilterSeason] = useState<SeasonFilter>("active");
  const [filterComp, setFilterComp] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("played");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const filteredMatches = useMemo(() => {
    return filterMatchesByComp(
      applySeasonFilter(matches, filterSeason, activeSeason),
      filterComp
    );
  }, [matches, filterSeason, activeSeason, filterComp]);

  const matchCompetitions = useMemo(() => getMatchCompetitions(filteredMatches), [filteredMatches]);

  const opponents = useMemo(() => {
    const grouped = groupMatchesByOpponent(filteredMatches);
    return Object.entries(grouped).map(([name, opMatches]) => {
      const record = computeRecord(opMatches);
      return { name, ...record };
    });
  }, [filteredMatches]);

  const sortedOpponents = useMemo(() => {
    let list = opponents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "played": cmp = a.played - b.played; break;
        case "wins": cmp = a.wins - b.wins; break;
        case "draws": cmp = a.draws - b.draws; break;
        case "losses": cmp = a.losses - b.losses; break;
        case "gf": cmp = a.goalsFor - b.goalsFor; break;
        case "ga": cmp = a.goalsAgainst - b.goalsAgainst; break;
        case "gd": cmp = a.goalDifference - b.goalDifference; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [opponents, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedOpponents.length / perPage));
  const paginated = sortedOpponents.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-slate-600 ml-1">⇅</span>;
    return <span className="text-blue-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-800 rounded w-48"></div>
            <div className="h-64 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <ArchivedTeamBanner />
      <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 tracking-tight mb-6">Opponents</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <MatchFilters
            seasons={seasons}
            filterSeason={filterSeason}
            onSeasonChange={v => { setFilterSeason(v); setCurrentPage(1); }}
            competitions={matchCompetitions}
            filterComp={filterComp}
            onCompChange={v => { setFilterComp(v); setCurrentPage(1); }}
            showActiveSeason={true}
          />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search opponents..."
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition w-52"
          />
        </div>

        {sortedOpponents.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <p className="text-lg italic">No opponents found</p>
            <p className="text-xs uppercase tracking-widest mt-2">Play some matches to see head-to-head records</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-700/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="p-4 cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("name")}>
                      Opponent {sortIcon("name")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("played")}>
                      P {sortIcon("played")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition text-green-400" onClick={() => handleSort("wins")}>
                      W {sortIcon("wins")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("draws")}>
                      D {sortIcon("draws")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition text-red-400" onClick={() => handleSort("losses")}>
                      L {sortIcon("losses")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("gf")}>
                      GF {sortIcon("gf")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("ga")}>
                      GA {sortIcon("ga")}
                    </th>
                    <th className="p-4 text-center cursor-pointer select-none hover:text-blue-400 transition" onClick={() => handleSort("gd")}>
                      GD {sortIcon("gd")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {paginated.map(opp => (
                    <tr
                      key={opp.name}
                      className="hover:bg-blue-500/5 transition-colors"
                    >
                      <td className="p-4">
                        <Link href={`/opponents/${encodeURIComponent(opp.name)}`} className="font-bold text-slate-200 hover:text-blue-400 transition">
                          {opp.name}
                        </Link>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-300">{opp.played}</td>
                      <td className="p-4 text-center font-mono font-bold text-green-400">{opp.wins}</td>
                      <td className="p-4 text-center font-mono text-slate-400">{opp.draws}</td>
                      <td className="p-4 text-center font-mono font-bold text-red-400">{opp.losses}</td>
                      <td className="p-4 text-center font-mono text-blue-400">{opp.goalsFor}</td>
                      <td className="p-4 text-center font-mono text-orange-400">{opp.goalsAgainst}</td>
                      <td className="p-4 text-center font-mono font-bold">
                        <span className={opp.goalDifference > 0 ? "text-green-400" : opp.goalDifference < 0 ? "text-red-400" : "text-slate-400"}>
                          {opp.goalDifference > 0 ? "+" : ""}{opp.goalDifference}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedOpponents.length}
              itemsPerPage={perPage}
              onPageChange={setCurrentPage}
              itemLabel="opponents"
            />
          </>
        )}
      </div>
    </main>
    </>
  );
}
