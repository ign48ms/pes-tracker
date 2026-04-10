// ─── Shared types for PES Tracker ───

export type PlayerStatus = "active" | "loaned" | "sold" | "retired";

export interface Player {
  id: number;
  name: string;
  age: number;
  rating: number;
  position: string;
  isStarter?: boolean;
  status?: PlayerStatus;
}

// ─── Team selection types ───
export interface LeagueTeamOption {
  id: number;
  name: string;
}

export interface LeagueOption {
  name: string;
  country: string;
  teams: LeagueTeamOption[];
}

// ─── Formation types ───
export interface FormationSlot {
  /** Horizontal position on pitch (0 = left, 100 = right) */
  x: number;
  /** Vertical position on pitch (0 = opponent goal, 100 = own goal) */
  y: number;
  /** Positions that naturally fit this slot */
  suggestedPositions: string[];
  /** Display label for the slot (e.g. "LW", "ST", "CDM") */
  label: string;
}

export interface Formation {
  name: string;
  slots: FormationSlot[];
}

export interface GoalEvent {
  /** Player ID as string, or "OG" for own goal, or "" for unset */
  scorerId: string;
  /** Player ID as string, or "" for no assist */
  assisterId: string;
  isOwnGoal: boolean;
}

export interface Match {
  id: string;
  opponent: string;
  myScore: number;
  opScore: number;
  goals: GoalEvent[];
  appearanceIds: number[];
  /** Matchday display label e.g. "Matchday 12", "Quarter-Final" */
  matchday: string;
  /** Numeric sort key for ordering within a competition+season */
  matchdaySort: number;
  /** Timestamp for global ordering (newest first) */
  createdAt: number;
  competition: string;
  seasonId: number;
  /** Formation key used for this match e.g. "4-3-3" */
  formationKey?: string;
  /** Map of formation slot index to player ID */
  pitchSlotMap?: Record<number, number>;
  /** Penalty shootout score (our team) — only for knockout matches that went to pens */
  penMyScore?: number;
  /** Penalty shootout score (opponent) */
  penOpScore?: number;
}

// ─── Competition types ───
export type CompetitionFormat = "league" | "knockout" | "group-knockout" | "freetext";

export interface Competition {
  id: number;
  name: string;
  format: CompetitionFormat;
  /** Total knockout rounds for "knockout" format (e.g. 4 = R16→QF→SF→F) */
  knockoutRounds?: number;
  /** @deprecated Use hasPreliminaryRound + preliminaryLegs instead. Kept for migration compat. */
  playoffLegs?: number;
  /** Group stage game count for "group-knockout" */
  groupGames?: number;
  /** Knockout rounds after group stage for "group-knockout" */
  groupKnockoutRounds?: number;
  /** Number of legs per knockout round: 1 = single-leg (default), 2 = two-legged */
  knockoutLegs?: 1 | 2;
  /** If knockoutLegs is 2, the final is a single match instead of two legs */
  singleLegFinal?: boolean;
  /** Optional preliminary round before the main knockout rounds (e.g. division 2 teams) */
  hasPreliminaryRound?: boolean;
  /** Number of legs for the preliminary round (1 or 2). Requires hasPreliminaryRound. */
  preliminaryLegs?: 1 | 2;
  /** Links this competition instance to a catalogue template ID (e.g. "eng-fa-cup") */
  predefinedId?: string;
  /** User-chosen color palette key (e.g. "red", "blue"). When set, overrides the default name-based color. */
  colorKey?: string;
}

// ─── Competition template (catalogue) types ───
export interface CompetitionTemplate {
  templateId: string;
  name: string;
  country: string;
  group: string;
  format: CompetitionFormat;
  knockoutRounds?: number;
  groupGames?: number;
  groupKnockoutRounds?: number;
  knockoutLegs?: 1 | 2;
  singleLegFinal?: boolean;
  /** Whether this competition supports the optional preliminary round toggle */
  supportsPreliminary?: boolean;
  /** Default preliminary legs when preliminary is enabled */
  defaultPreliminaryLegs?: 1 | 2;
}

export interface LeagueSystem {
  id: string;
  name: string;
  country: string;
  flag: string;
  templates: CompetitionTemplate[];
}

export interface Season {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

// ─── Milestone types ───
export interface Milestone {
  playerId: number;
  playerName: string;
  type: "appearances" | "goals" | "assists";
  milestone: number;
  current: number;
}

export interface StreakData {
  current: { winStreak: number; unbeatenStreak: number };
  best: { winStreak: number; unbeatenStreak: number };
  byComp: Record<string, { current: { winStreak: number; unbeatenStreak: number }; best: { winStreak: number; unbeatenStreak: number } }>;
}

export interface ModalConfig {
  title: string;
  message: string;
  type: "success" | "confirm" | "danger";
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  appearances: number;
}

export interface CompColor {
  text: string;
  bg: string;
  border: string;
}

// Sort types for squad table
export type SortKey = "name" | "position" | "age" | "rating" | "appearances" | "goals" | "assists" | "status";
export type SortDir = "asc" | "desc";

/** Season filter value: 'active' = current active season, 'all' = all seasons, number string = specific season ID */
export type SeasonFilter = "active" | "all" | (string & {});

// ─── Team (multi-team support) ───
/** An archived team snapshot. The active team's live data lives in the individual localStorage keys. */
export interface Team {
  id: string;
  name: string;
  createdAt: number;
  players: Player[];
  matches: Match[];
  seasons: Season[];
}

// Data export format
export interface ExportData {
  version: number;
  exportDate: string;
  players: Player[];
  matches: Match[];
  /**
   * Competition list. Legacy backups may contain string[] — storage.importAllData
   * handles the conversion internally before this reaches consumers.
   */
  competitions: Competition[];
  seasons: Season[];
  teamName?: string;
  /** v3+: all archived teams */
  archivedTeams?: Team[];
  /** v3+: active team id */
  activeTeamId?: string;
}
