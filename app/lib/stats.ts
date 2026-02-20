// ─── Stats derivation utilities ───
import type { Match, Player, PlayerStats, Season, StreakData, Milestone } from "./types";
import { MILESTONE_THRESHOLDS, FRIENDLY_DEFAULT } from "./constants";

/**
 * Build a player lookup map for efficient name resolution.
 */
export function buildPlayerMap(players: Player[]): Map<number, Player> {
  const map = new Map<number, Player>();
  for (const p of players) map.set(p.id, p);
  return map;
}

/**
 * Derive player stats (goals, assists, appearances) from a set of matches.
 * Used for competition/season filtering — computes stats from match data rather than stored cumulative values.
 */
export function derivePlayerStats(
  players: Player[],
  matches: Match[]
): Map<number, PlayerStats> {
  const map = new Map<number, PlayerStats>();

  for (const p of players) {
    map.set(p.id, { goals: 0, assists: 0, appearances: 0 });
  }

  for (const m of matches) {
    // Count appearances
    const pidSet = new Set(m.appearanceIds || []);
    pidSet.forEach(pid => {
      const s = map.get(pid);
      if (s) s.appearances++;
    });

    // Count goals and assists from goal events
    if (m.goals) {
      for (const g of m.goals) {
        if (!g.isOwnGoal && g.scorerId && g.scorerId !== "OG") {
          const s = map.get(Number(g.scorerId));
          if (s) s.goals++;
        }
        if (!g.isOwnGoal && g.assisterId) {
          const s = map.get(Number(g.assisterId));
          if (s) s.assists++;
        }
      }
    }
  }

  return map;
}

/**
 * Derive all stat breakdowns for a single player in one pass.
 * Returns overall, per-competition, and per-season breakdowns efficiently.
 */
export function derivePlayerBreakdowns(
  playerId: number,
  playerMatches: Match[],
  seasons: { id: number; name: string; isActive: boolean }[]
): {
  overall: PlayerStats;
  byCompetition: { comp: string; stats: PlayerStats }[];
  bySeason: { season: (typeof seasons)[0]; stats: PlayerStats }[];
} {
  const overall: PlayerStats = { goals: 0, assists: 0, appearances: 0 };
  const compMap = new Map<string, PlayerStats>();
  const seasonMap = new Map<number, PlayerStats>();
  const pid = playerId.toString();

  for (const m of playerMatches) {
    const comp = m.competition || FRIENDLY_DEFAULT;
    const sid = m.seasonId;

    overall.appearances++;

    if (!compMap.has(comp)) compMap.set(comp, { goals: 0, assists: 0, appearances: 0 });
    const cs = compMap.get(comp)!;
    cs.appearances++;

    if (sid != null && !seasonMap.has(sid)) seasonMap.set(sid, { goals: 0, assists: 0, appearances: 0 });
    const ss = sid != null ? seasonMap.get(sid)! : null;
    if (ss) ss.appearances++;

    if (m.goals) {
      for (const g of m.goals) {
        if (!g.isOwnGoal && g.scorerId === pid) {
          overall.goals++;
          cs.goals++;
          if (ss) ss.goals++;
        }
        if (!g.isOwnGoal && g.assisterId === pid) {
          overall.assists++;
          cs.assists++;
          if (ss) ss.assists++;
        }
      }
    }
  }

  return {
    overall,
    byCompetition: Array.from(compMap.entries())
      .map(([comp, stats]) => ({ comp, stats }))
      .sort((a, b) => a.comp.localeCompare(b.comp)),
    bySeason: seasons
      .map(season => ({ season, stats: seasonMap.get(season.id) || { goals: 0, assists: 0, appearances: 0 } }))
      .filter(s => s.stats.appearances > 0),
  };
}

/**
 * Apply a season filter to a match array. Centralises the filter logic used by
 * all four pages so it is never duplicated.
 */
export function applySeasonFilter(
  matches: Match[],
  filterSeason: string,
  activeSeason: Season | null
): Match[] {
  if (filterSeason === "active" && activeSeason) {
    return filterMatchesBySeason(matches, activeSeason.id);
  }
  if (filterSeason !== "all") {
    return filterMatchesBySeason(matches, Number(filterSeason));
  }
  return matches;
}

/**
 * Get unique competition names from match data.
 */
export function getMatchCompetitions(matches: Match[]): string[] {
  const comps = matches.map(m => m.competition || FRIENDLY_DEFAULT);
  return [...new Set(comps)].sort();
}

/**
 * Filter matches by competition.
 */
export function filterMatchesByComp(matches: Match[], filterComp: string): Match[] {
  if (filterComp === "All") return matches;
  return matches.filter(m => (m.competition || FRIENDLY_DEFAULT) === filterComp);
}

/**
 * Filter matches by season.
 */
export function filterMatchesBySeason(matches: Match[], seasonId: number | "all"): Match[] {
  if (seasonId === "all") return matches;
  return matches.filter(m => m.seasonId === seasonId);
}

/**
 * Compute season/competition W/D/L record from a set of matches (single pass).
 */
export function computeRecord(matches: Match[]) {
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  for (const m of matches) {
    const my = m.myScore || 0;
    const op = m.opScore || 0;
    goalsFor += my;
    goalsAgainst += op;
    if (my > op) wins++;
    else if (my === op) draws++;
    else losses++;
  }
  return { played: matches.length, wins, draws, losses, goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst };
}

/**
 * Get match result letter.
 */
export function getResult(match: Match): "W" | "D" | "L" {
  if (match.myScore > match.opScore) return "W";
  if (match.myScore < match.opScore) return "L";
  return "D";
}

/**
 * Get top scorers from matches, using a pre-computed stats map when available
 * to avoid redundant derivePlayerStats calls.
 */
export function getTopScorers(
  players: Player[],
  matches: Match[],
  limit: number = 3,
  statsMap?: Map<number, PlayerStats>
): { player: Player; goals: number }[] {
  const map = statsMap ?? derivePlayerStats(players, matches);
  return players
    .map(p => ({ player: p, goals: map.get(p.id)?.goals || 0 }))
    .filter(e => e.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit);
}

/**
 * Get top assisters from matches, using a pre-computed stats map when available
 * to avoid redundant derivePlayerStats calls.
 */
export function getTopAssisters(
  players: Player[],
  matches: Match[],
  limit: number = 3,
  statsMap?: Map<number, PlayerStats>
): { player: Player; assists: number }[] {
  const map = statsMap ?? derivePlayerStats(players, matches);
  return players
    .map(p => ({ player: p, assists: map.get(p.id)?.assists || 0 }))
    .filter(e => e.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, limit);
}

/**
 * Get the goal summary string for a match (scorer names).
 */
export function getGoalSummary(match: Match, playerMap: Map<number, Player>): string {
  if (match.goals && match.goals.length > 0) {
    const names = match.goals.map(g => {
      if (g.isOwnGoal || g.scorerId === "OG") return "OG";
      const p = playerMap.get(Number(g.scorerId));
      return p ? p.name : "-";
    });
    return names.join(", ");
  }
  return "-";
}

/**
 * Get the assist summary string for a match.
 */
export function getAssistSummary(match: Match, playerMap: Map<number, Player>): string {
  if (match.goals && match.goals.length > 0) {
    const names = match.goals
      .filter(g => !g.isOwnGoal && g.assisterId)
      .map(g => {
        const p = playerMap.get(Number(g.assisterId));
        return p ? p.name : "-";
      });
    return names.length > 0 ? names.join(", ") : "-";
  }
  return "-";
}

/**
 * Group matches by opponent name (case-insensitive, trimmed).
 * Returns groups keyed by the display name (original casing preserved from first occurrence).
 */
export function groupMatchesByOpponent(matches: Match[]): Record<string, Match[]> {
  // Map from normalised key -> { displayName, matches[] }
  const keyToDisplay = new Map<string, string>();
  const groups: Record<string, Match[]> = {};
  for (const m of matches) {
    const normalized = m.opponent.trim().toLowerCase();
    if (!keyToDisplay.has(normalized)) {
      // Use trimmed original casing for the first occurrence as the display name
      keyToDisplay.set(normalized, m.opponent.trim());
    }
    const display = keyToDisplay.get(normalized)!;
    if (!groups[display]) groups[display] = [];
    groups[display].push(m);
  }
  return groups;
}

/**
 * Compute win/unbeaten streaks from matches (sorted newest-first / by createdAt desc).
 * Returns current + best streaks overall and per-competition.
 */
export function computeStreaks(matches: Match[]): StreakData {
  const sorted = [...matches].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  function calcStreaks(ms: Match[]) {
    let currentWin = 0, currentUnbeaten = 0;
    let bestWin = 0, bestUnbeaten = 0;
    let winBroken = false, unbeatenBroken = false;

    // Current streaks (from newest match backwards)
    for (const m of ms) {
      const res = getResult(m);
      if (!winBroken && res === "W") currentWin++;
      else winBroken = true;
      if (!unbeatenBroken && (res === "W" || res === "D")) currentUnbeaten++;
      else unbeatenBroken = true;
      if (winBroken && unbeatenBroken) break;
    }

    // Best streaks: scan oldest-to-newest
    let runWin = 0, runUnbeaten = 0;
    for (let i = ms.length - 1; i >= 0; i--) {
      const res = getResult(ms[i]);
      if (res === "W") { runWin++; runUnbeaten++; }
      else if (res === "D") { runWin = 0; runUnbeaten++; }
      else { runWin = 0; runUnbeaten = 0; }
      bestWin = Math.max(bestWin, runWin);
      bestUnbeaten = Math.max(bestUnbeaten, runUnbeaten);
    }

    return { current: { winStreak: currentWin, unbeatenStreak: currentUnbeaten }, best: { winStreak: bestWin, unbeatenStreak: bestUnbeaten } };
  }

  const overall = calcStreaks(sorted);

  // Per-competition
  const byComp: StreakData["byComp"] = {};
  const compGroups = new Map<string, Match[]>();
  for (const m of sorted) {
    const c = m.competition || FRIENDLY_DEFAULT;
    if (!compGroups.has(c)) compGroups.set(c, []);
    compGroups.get(c)!.push(m);
  }
  for (const [comp, ms] of compGroups) {
    byComp[comp] = calcStreaks(ms);
  }

  return { ...overall, byComp };
}

/**
 * Compute milestones reached by players.
 */
export function computeMilestones(players: Player[], playerStats: Map<number, PlayerStats>): Milestone[] {
  const milestones: Milestone[] = [];
  for (const p of players) {
    const s = playerStats.get(p.id);
    if (!s) continue;
    for (const t of MILESTONE_THRESHOLDS) {
      if (s.appearances >= t) milestones.push({ playerId: p.id, playerName: p.name, type: "appearances", milestone: t, current: s.appearances });
      if (s.goals >= t) milestones.push({ playerId: p.id, playerName: p.name, type: "goals", milestone: t, current: s.goals });
      if (s.assists >= t) milestones.push({ playerId: p.id, playerName: p.name, type: "assists", milestone: t, current: s.assists });
    }
  }
  // Sort: highest milestone first, then by type
  milestones.sort((a, b) => b.milestone - a.milestone || a.type.localeCompare(b.type));
  return milestones;
}

