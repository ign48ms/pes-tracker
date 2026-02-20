// ─── localStorage utilities with typed helpers and migration ───
import type { Player, Match, Season, Competition, ExportData } from "./types";
import { DEFAULT_COMPETITIONS, DEFAULT_COMPETITION_OBJECTS, FRIENDLY_DEFAULT, DEFAULT_TEAM_NAME } from "./constants";

const KEYS = {
  players: "pes-players",
  matches: "pes-matches",
  competitions: "pes-competitions",
  seasons: "pes-seasons",
  teamName: "pes-team-name",
} as const;

const MIGRATION_KEY = "pes-migration-version";
const CURRENT_MIGRATION = 4;
let _migrated = false;

// ─── Safe JSON parse ───
function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Data migration (runs once per session) ───
function ensureMigrations(): void {
  if (_migrated) return;
  _migrated = true;

  const version = Number(localStorage.getItem(MIGRATION_KEY) || "0");
  if (version >= CURRENT_MIGRATION) return;

  // Migration 1: normalize match data (string scores, seasonId, dates)
  if (version < 1) {
    let seasons = safeParse<Season[]>(KEYS.seasons, []);
    if (seasons.length === 0) {
      seasons = [{ id: 1, name: "Season 1", isActive: true }];
      localStorage.setItem(KEYS.seasons, JSON.stringify(seasons));
    }
    const defaultSeasonId = (seasons.find(s => s.isActive) || seasons[0]).id;

    const matches = safeParse<Record<string, unknown>[]>(KEYS.matches, []);
    const migrated = matches.map((m) => ({
      ...m,
      myScore: typeof m.myScore === "string" ? (Number(m.myScore) || 0) : (m.myScore ?? 0),
      opScore: typeof m.opScore === "string" ? (Number(m.opScore) || 0) : (m.opScore ?? 0),
      seasonId: m.seasonId || defaultSeasonId,
      date: m.date || new Date((m.id as number) || Date.now()).toISOString(),
      goals: m.goals || [],
      appearanceIds: m.appearanceIds || [],
      competition: m.competition || FRIENDLY_DEFAULT,
    }));
    localStorage.setItem(KEYS.matches, JSON.stringify(migrated));
  }

  // Migration 2: seed default competitions if none saved
  if (version < 2) {
    const saved = safeParse<string[]>(KEYS.competitions, []);
    if (saved.length === 0) {
      localStorage.setItem(KEYS.competitions, JSON.stringify(DEFAULT_COMPETITIONS));
    }
  }

  // Migration 3: convert numeric match IDs to string UUIDs
  if (version < 3) {
    const matches = safeParse<Record<string, unknown>[]>(KEYS.matches, []);
    const migrated = matches.map((m) => ({
      ...m,
      id: typeof m.id === "number" ? crypto.randomUUID() : m.id,
    }));
    localStorage.setItem(KEYS.matches, JSON.stringify(migrated));
  }

  // Migration 4: competition objects, matchday system, player status
  if (version < 4) {
    // 4a: Convert competitions from string[] to Competition[]
    const rawComps = safeParse<unknown[]>(KEYS.competitions, []);
    const isStringArray = rawComps.length === 0 || typeof rawComps[0] === "string";
    if (isStringArray) {
      const compStrings = rawComps as string[];
      const compObjects: Competition[] = compStrings.map((name, i) => {
        // Map known defaults to their formats
        if (name === "League") return { id: 1, name, format: "league" as const };
        if (name === "Cup") return { id: 2, name, format: "knockout" as const, knockoutRounds: 4 };
        if (name === "Champions League") return { id: 3, name, format: "group-knockout" as const, groupGames: 6, groupKnockoutRounds: 4 };
        if (name === "Friendly") return { id: 4, name, format: "freetext" as const };
        // Custom competitions default to league format
        return { id: Date.now() + i + 100, name, format: "league" as const };
      });
      localStorage.setItem(KEYS.competitions, JSON.stringify(compObjects));
    }

    // 4b: Add matchday, matchdaySort, createdAt to matches; add status to players
    const matches = safeParse<Record<string, unknown>[]>(KEYS.matches, []);
    const competitions = safeParse<Competition[]>(KEYS.competitions, []);

    // Group matches by competition+season to compute matchday labels
    const compSeasonGroups = new Map<string, Record<string, unknown>[]>();
    // Sort by date first so matchday numbering is chronological
    const sortedMatches = [...matches].sort((a, b) => {
      const da = (a.date as string) || "";
      const db = (b.date as string) || "";
      return da.localeCompare(db);
    });
    for (const m of sortedMatches) {
      const key = `${m.competition || "Friendly"}__${m.seasonId || 1}`;
      if (!compSeasonGroups.has(key)) compSeasonGroups.set(key, []);
      compSeasonGroups.get(key)!.push(m);
    }

    // Assign matchday labels
    const matchdayMap = new Map<unknown, { matchday: string; matchdaySort: number }>();
    for (const [key, groupMatches] of compSeasonGroups) {
      const compName = key.split("__")[0];
      const comp = competitions.find(c => c.name === compName);
      for (let i = 0; i < groupMatches.length; i++) {
        const m = groupMatches[i];
        let matchday: string;
        const sort = i + 1;

        if (comp) {
          if (comp.format === "league") {
            matchday = `Matchday ${sort}`;
          } else if (comp.format === "knockout") {
            const totalRounds = comp.knockoutRounds || 4;
            const roundFromEnd = totalRounds - i;
            if (roundFromEnd >= 1) {
              switch (roundFromEnd) {
                case 1: matchday = "Final"; break;
                case 2: matchday = "Semi-Final"; break;
                case 3: matchday = "Quarter-Final"; break;
                case 4: matchday = "Round of 16"; break;
                default: matchday = `Round of ${Math.pow(2, roundFromEnd)}`; break;
              }
            } else {
              matchday = `Match ${sort}`;
            }
          } else if (comp.format === "group-knockout") {
            const groupGames = comp.groupGames || 6;
            if (i < groupGames) {
              matchday = `Group Game ${sort}`;
            } else {
              const koRounds = comp.groupKnockoutRounds || 4;
              const koIdx = i - groupGames;
              const roundFromEnd = koRounds - koIdx;
              if (roundFromEnd >= 1) {
                switch (roundFromEnd) {
                  case 1: matchday = "Final"; break;
                  case 2: matchday = "Semi-Final"; break;
                  case 3: matchday = "Quarter-Final"; break;
                  case 4: matchday = "Round of 16"; break;
                  default: matchday = `Round of ${Math.pow(2, roundFromEnd)}`; break;
                }
              } else {
                matchday = `Match ${sort}`;
              }
            }
          } else {
            matchday = `Match ${sort}`;
          }
        } else {
          matchday = `Matchday ${sort}`;
        }

        matchdayMap.set(m.id, { matchday, matchdaySort: sort });
      }
    }

    const migratedMatches = matches.map((m) => {
      const md = matchdayMap.get(m.id) || { matchday: "Match 1", matchdaySort: 1 };
      return {
        ...m,
        matchday: m.matchday || md.matchday,
        matchdaySort: m.matchdaySort ?? md.matchdaySort,
        createdAt: m.createdAt ?? (m.date ? new Date(m.date as string).getTime() : Date.now()),
      };
    });
    localStorage.setItem(KEYS.matches, JSON.stringify(migratedMatches));

    // 4c: Ensure all players have status
    const players = safeParse<Record<string, unknown>[]>(KEYS.players, []);
    const migratedPlayers = players.map(p => ({
      ...p,
      status: p.status || "active",
    }));
    localStorage.setItem(KEYS.players, JSON.stringify(migratedPlayers));
  }

  localStorage.setItem(MIGRATION_KEY, CURRENT_MIGRATION.toString());
}

// ─── Debounce timers for batching rapid writes ───
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const WRITE_DEBOUNCE_MS = 300;

// ─── Safe localStorage write with debounce and user notification on quota exceeded ───
function safeWrite(key: string, value: string): void {
  // Clear any pending write for this key
  const existing = _debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    _debounceTimers.delete(key);
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to write to localStorage key "${key}":`, e);
      // Notify the user so data loss is not silent
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pes-storage-error", {
          detail: { key, error: e },
        }));
      }
    }
  }, WRITE_DEBOUNCE_MS);
  _debounceTimers.set(key, timer);
}

/** Write immediately (bypass debounce) — used for migrations and imports. */
function safeWriteNow(key: string, value: string): void {
  // Flush any pending debounced write for the same key
  const existing = _debounceTimers.get(key);
  if (existing) { clearTimeout(existing); _debounceTimers.delete(key); }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to write to localStorage key "${key}":`, e);
  }
}

// ─── Players ───
export function getPlayers(): Player[] {
  ensureMigrations();
  return safeParse<Player[]>(KEYS.players, []);
}

export function savePlayers(players: Player[]): void {
  safeWrite(KEYS.players, JSON.stringify(players));
}

// ─── Matches ───
export function getMatches(): Match[] {
  ensureMigrations();
  return safeParse<Match[]>(KEYS.matches, []);
}

export function saveMatches(matches: Match[]): void {
  safeWrite(KEYS.matches, JSON.stringify(matches));
}

// ─── Competitions ───
export function getCompetitions(): Competition[] {
  ensureMigrations();
  const raw = safeParse<unknown[]>(KEYS.competitions, []);
  if (raw.length === 0) return DEFAULT_COMPETITION_OBJECTS;
  // Runtime guard: if localStorage still holds plain strings, convert on the fly
  if (typeof raw[0] === "string") {
    const converted: Competition[] = (raw as string[]).map((name, i) => {
      const found = DEFAULT_COMPETITION_OBJECTS.find(d => d.name === name);
      return found || { id: Date.now() + i, name, format: "league" as const };
    });
    saveCompetitions(converted);
    return converted;
  }
  return raw as Competition[];
}

export function saveCompetitions(competitions: Competition[]): void {
  safeWrite(KEYS.competitions, JSON.stringify(competitions));
}

// ─── Team Name ───
export function getTeamName(): string {
  ensureMigrations();
  return localStorage.getItem(KEYS.teamName) || DEFAULT_TEAM_NAME;
}

export function saveTeamName(name: string): void {
  safeWrite(KEYS.teamName, name);
}

// ─── Seasons ───
export function getSeasons(): Season[] {
  ensureMigrations();
  return safeParse<Season[]>(KEYS.seasons, []);
}

export function saveSeasons(seasons: Season[]): void {
  safeWrite(KEYS.seasons, JSON.stringify(seasons));
}

export function getActiveSeason(): Season | null {
  const seasons = getSeasons();
  return seasons.find(s => s.isActive) || seasons[0] || null;
}

export function ensureDefaultSeason(): Season {
  const seasons = getSeasons();
  if (seasons.length === 0) {
    const defaultSeason: Season = { id: 1, name: "Season 1", isActive: true };
    // Write immediately — clearAll/init flows read back from storage right after this call
    safeWriteNow(KEYS.seasons, JSON.stringify([defaultSeason]));
    return defaultSeason;
  }
  return seasons.find(s => s.isActive) || seasons[0];
}

// ─── Full data export/import ───
export function exportAllData(): ExportData {
  return {
    version: 2,
    exportDate: new Date().toISOString(),
    players: getPlayers(),
    matches: getMatches(),
    competitions: getCompetitions(),
    seasons: getSeasons(),
    teamName: getTeamName(),
  };
}

export function importAllData(data: ExportData): void {
  // Use immediate writes so all data is in localStorage before ensureMigrations() runs
  if (data.players) safeWriteNow(KEYS.players, JSON.stringify(data.players));
  if (data.matches) safeWriteNow(KEYS.matches, JSON.stringify(data.matches));
  if (data.competitions) {
    // Handle legacy string[] format from old backups at runtime (narrowed in types but old files exist)
    const rawComps = data.competitions as unknown as Competition[] | string[];
    if (Array.isArray(rawComps) && rawComps.length > 0 && typeof rawComps[0] === "string") {
      // Old string[] format — will be converted by migration 4a
      safeWriteNow(KEYS.competitions, JSON.stringify(rawComps));
    } else {
      safeWriteNow(KEYS.competitions, JSON.stringify(rawComps));
    }
  }
  if (data.seasons) safeWriteNow(KEYS.seasons, JSON.stringify(data.seasons));
  if (data.teamName) safeWriteNow(KEYS.teamName, data.teamName);
  // Re-run migrations on imported data
  _migrated = false;
  localStorage.removeItem(MIGRATION_KEY);
  ensureMigrations();
}

export function clearAllData(): void {
  // Flush all pending debounced writes first so they don't re-write after the clear
  for (const [, timer] of _debounceTimers) clearTimeout(timer);
  _debounceTimers.clear();
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(MIGRATION_KEY);
  _migrated = false;
}
