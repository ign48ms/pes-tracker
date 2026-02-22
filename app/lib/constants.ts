// ─── Shared constants and color helpers for PES Tracker ───
import type { CompColor, Competition, CompetitionFormat, CompetitionTemplate, LeagueSystem, Formation } from "./types";

// ─── App-wide string constants ───
/** Default competition label for matches with no competition set */
export const FRIENDLY_DEFAULT = "Friendly";
/** Default team name before user sets their own */
export const DEFAULT_TEAM_NAME = "My Team";

// ─── Pagination constants ───
export const MATCHES_PER_PAGE = 15;
export const PLAYERS_PER_PAGE = 20;
export const OPPONENTS_PER_PAGE = 20;

// ─── Match squad size constants ───
export const MIN_MATCH_PLAYERS = 11;
export const MAX_MATCH_PLAYERS = 16;
export const MAX_BENCH_SLOTS = 5;

// ─── Positions ───
export const ALL_POSITIONS = ["CF", "SS", "RWF", "LWF", "AMF", "RMF", "LMF", "CMF", "DMF", "RB", "LB", "CB", "GK"] as const;

export const ATTACK_POS = ["CF", "SS", "RWF", "LWF"];
export const MID_POS = ["AMF", "RMF", "LMF", "CMF", "DMF"];
export const DEF_POS = ["CB", "LB", "RB"];

export const POS_GROUPS: { label: string; positions: string[] }[] = [
  { label: "ATK", positions: ATTACK_POS },
  { label: "MID", positions: MID_POS },
  { label: "DEF", positions: DEF_POS },
  { label: "GK", positions: ["GK"] },
];

export const POS_ORDER: Record<string, number> = {
  CF: 1, SS: 2, RWF: 3, LWF: 4, AMF: 5, RMF: 6, LMF: 7, CMF: 8, DMF: 9, RB: 10, LB: 11, CB: 12, GK: 13,
};

// ─── Default competitions ───
export const DEFAULT_COMPETITIONS = ["League", "Cup", "Champions League", "Friendly"];

// ─── Competition colors ───
export const COMP_COLORS: Record<string, CompColor> = {
  // Generic / legacy
  "League":            { text: "text-purple-400",  bg: "bg-purple-900/30",  border: "border-purple-800/50" },
  "Cup":               { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" },
  "Friendly":          { text: "text-slate-400",   bg: "bg-slate-700/30",   border: "border-slate-600/50" },
  // England
  "Premier League":    { text: "text-purple-400",  bg: "bg-purple-900/30",  border: "border-purple-800/50" },
  "Sky Bet Championship": { text: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-800/50" },
  "Championship Playoffs": { text: "text-orange-300", bg: "bg-orange-900/30", border: "border-orange-700/50" },
  "FA Cup":            { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" },
  "Community Shield":  { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" },
  // France
  "Ligue 1":           { text: "text-blue-400",    bg: "bg-blue-900/30",    border: "border-blue-800/50" },
  "Ligue 2":           { text: "text-sky-400",     bg: "bg-sky-900/30",     border: "border-sky-800/50" },
  "Coupe de France":   { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" },
  "Trophée des Champions": { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" },
  // Spain
  "La Liga EA Sports": { text: "text-orange-400",  bg: "bg-orange-900/30",  border: "border-orange-800/50" },
  "La Liga Hypermotion": { text: "text-amber-400", bg: "bg-amber-900/30",  border: "border-amber-800/50" },
  "La Liga Hypermotion Playoffs": { text: "text-amber-300", bg: "bg-amber-900/30", border: "border-amber-700/50" },
  "Copa del Rey":      { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" },
  "Supercopa de España": { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" },
  // Italy
  "Serie A":           { text: "text-blue-400",    bg: "bg-blue-900/30",    border: "border-blue-800/50" },
  "Serie B":           { text: "text-cyan-400",    bg: "bg-cyan-900/30",    border: "border-cyan-800/50" },
  "Serie B Playoffs":  { text: "text-cyan-300",    bg: "bg-cyan-900/30",    border: "border-cyan-700/50" },
  "Coppa Italia":      { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" },
  "Supercoppa Italiana": { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" },
  // Germany
  "Bundesliga":        { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" },
  "DFB-Pokal":         { text: "text-yellow-400",  bg: "bg-yellow-900/30",  border: "border-yellow-800/50" },
  "DFL-Supercup":      { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" },
  // UEFA
  "Champions League":  { text: "text-blue-300",    bg: "bg-blue-900/30",    border: "border-blue-700/50" },
  "Europa League":     { text: "text-orange-300",  bg: "bg-orange-900/30",  border: "border-orange-700/50" },
  "UEFA Super Cup":    { text: "text-indigo-400",  bg: "bg-indigo-900/30",  border: "border-indigo-800/50" },
  // FIFA
  "Club World Cup":    { text: "text-teal-400",    bg: "bg-teal-900/30",    border: "border-teal-800/50" },
};

export const COMP_FALLBACK_COLORS: CompColor[] = [
  { text: "text-purple-400",  bg: "bg-purple-900/30",  border: "border-purple-800/50" },
  { text: "text-pink-400",    bg: "bg-pink-900/30",    border: "border-pink-800/50" },
  { text: "text-cyan-400",    bg: "bg-cyan-900/30",    border: "border-cyan-800/50" },
  { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" },
  { text: "text-rose-400",    bg: "bg-rose-900/30",    border: "border-rose-800/50" },
  { text: "text-orange-400",  bg: "bg-orange-900/30",  border: "border-orange-800/50" },
  { text: "text-teal-400",    bg: "bg-teal-900/30",    border: "border-teal-800/50" },
  { text: "text-indigo-400",  bg: "bg-indigo-900/30",  border: "border-indigo-800/50" },
];

// ─── User-selectable competition color palette ───
export interface CompColorOption {
  key: string;
  label: string;
  /** Hex swatch colour for the picker circle */
  swatch: string;
  color: CompColor;
}

export const COMP_COLOR_PALETTE: CompColorOption[] = [
  { key: "slate",   label: "Slate",   swatch: "#94a3b8", color: { text: "text-slate-400",   bg: "bg-slate-700/30",   border: "border-slate-600/50" } },
  { key: "red",     label: "Red",     swatch: "#f87171", color: { text: "text-red-400",     bg: "bg-red-900/30",     border: "border-red-800/50" } },
  { key: "orange",  label: "Orange",  swatch: "#fb923c", color: { text: "text-orange-400",  bg: "bg-orange-900/30",  border: "border-orange-800/50" } },
  { key: "amber",   label: "Amber",   swatch: "#fbbf24", color: { text: "text-amber-400",   bg: "bg-amber-900/30",   border: "border-amber-800/50" } },
  { key: "yellow",  label: "Yellow",  swatch: "#facc15", color: { text: "text-yellow-400",  bg: "bg-yellow-900/30",  border: "border-yellow-800/50" } },
  { key: "green",   label: "Green",   swatch: "#4ade80", color: { text: "text-green-400",   bg: "bg-green-900/30",   border: "border-green-800/50" } },
  { key: "emerald", label: "Emerald", swatch: "#34d399", color: { text: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-800/50" } },
  { key: "teal",    label: "Teal",    swatch: "#2dd4bf", color: { text: "text-teal-400",    bg: "bg-teal-900/30",    border: "border-teal-800/50" } },
  { key: "cyan",    label: "Cyan",    swatch: "#22d3ee", color: { text: "text-cyan-400",    bg: "bg-cyan-900/30",    border: "border-cyan-800/50" } },
  { key: "sky",     label: "Sky",     swatch: "#38bdf8", color: { text: "text-sky-400",     bg: "bg-sky-900/30",     border: "border-sky-800/50" } },
  { key: "blue",    label: "Blue",    swatch: "#60a5fa", color: { text: "text-blue-400",    bg: "bg-blue-900/30",    border: "border-blue-800/50" } },
  { key: "indigo",  label: "Indigo",  swatch: "#818cf8", color: { text: "text-indigo-400",  bg: "bg-indigo-900/30",  border: "border-indigo-800/50" } },
  { key: "purple",  label: "Purple",  swatch: "#a78bfa", color: { text: "text-purple-400",  bg: "bg-purple-900/30",  border: "border-purple-800/50" } },
  { key: "pink",    label: "Pink",    swatch: "#f472b6", color: { text: "text-pink-400",    bg: "bg-pink-900/30",    border: "border-pink-800/50" } },
  { key: "rose",    label: "Rose",    swatch: "#fb7185", color: { text: "text-rose-400",    bg: "bg-rose-900/30",    border: "border-rose-800/50" } },
];

const PALETTE_MAP: Record<string, CompColor> = Object.fromEntries(
  COMP_COLOR_PALETTE.map(o => [o.key, o.color])
);

export function getCompColor(comp: string, colorKey?: string): CompColor {
  // 1. User-chosen override via palette key
  if (colorKey && PALETTE_MAP[colorKey]) return PALETTE_MAP[colorKey];
  // 2. Hard-coded name-based lookup
  if (COMP_COLORS[comp]) return COMP_COLORS[comp];
  // 3. Deterministic hash for custom competitions
  let hash = 0;
  for (let i = 0; i < comp.length; i++) hash = ((hash << 5) - hash + comp.charCodeAt(i)) | 0;
  return COMP_FALLBACK_COLORS[Math.abs(hash) % COMP_FALLBACK_COLORS.length];
}

// ─── Position color helpers ───
export function getPositionColors(pos: string): string {
  if (ATTACK_POS.includes(pos)) return "bg-red-900/40 text-red-400 border-red-700/60";
  if (MID_POS.includes(pos)) return "bg-green-900/40 text-green-400 border-green-700/60";
  if (DEF_POS.includes(pos)) return "bg-blue-900/40 text-blue-400 border-blue-700/60";
  if (pos === "GK") return "bg-yellow-900/40 text-yellow-400 border-yellow-700/60";
  return "bg-slate-900 text-slate-400 border-slate-700";
}

// ─── PES-style rating colors ───
export function getRatingColors(ovr: number): string {
  if (ovr >= 100) return "bg-blue-800/40 text-blue-300 border-blue-600/50";
  if (ovr >= 95)  return "bg-cyan-800/40 text-cyan-300 border-cyan-600/50";
  if (ovr >= 90)  return "bg-teal-700/40 text-teal-300 border-teal-500/50";
  if (ovr >= 85)  return "bg-emerald-800/40 text-emerald-300 border-emerald-600/50";
  if (ovr >= 80)  return "bg-green-800/40 text-green-400 border-green-600/50";
  if (ovr >= 75)  return "bg-lime-900/40 text-lime-400 border-lime-700/50";
  if (ovr >= 70)  return "bg-yellow-900/40 text-yellow-400 border-yellow-700/50";
  if (ovr >= 65)  return "bg-amber-950/50 text-amber-600 border-amber-900/50";
  if (ovr >= 60)  return "bg-orange-950/50 text-orange-700 border-orange-900/50";
  if (ovr >= 50)  return "bg-red-950/50 text-red-700 border-red-900/50";
  return "bg-stone-900/50 text-stone-500 border-stone-700/50";
}

// ─── Position group colors (for match squad selection) ───
export function getGroupColor(label: string): string {
  if (label === "ATK") return "text-red-400 border-red-800/50";
  if (label === "MID") return "text-green-400 border-green-800/50";
  if (label === "DEF") return "text-blue-400 border-blue-800/50";
  return "text-yellow-400 border-yellow-800/50";
}

export function getGroupActiveBg(label: string): string {
  if (label === "ATK") return "bg-red-600 border-red-400";
  if (label === "MID") return "bg-green-600 border-green-400";
  if (label === "DEF") return "bg-blue-600 border-blue-400";
  return "bg-yellow-600 border-yellow-400";
}

// ─── Position group label for a given position ───
export function getPositionGroup(pos: string): string {
  if (ATTACK_POS.includes(pos)) return "ATK";
  if (MID_POS.includes(pos)) return "MID";
  if (DEF_POS.includes(pos)) return "DEF";
  if (pos === "GK") return "GK";
  return "OTHER";
}

// ─── Formations ───
// Pitch coordinate system: x = 0 (left) to 100 (right), y = 0 (opponent goal / top) to 100 (own goal / bottom).
// GK is always at the bottom-center.

export const FORMATIONS: Record<string, Formation> = {
  "4-3-3": {
    name: "4-3-3",
    slots: [
      // Forwards (y ~12)
      { x: 20, y: 12, suggestedPositions: ["LWF", "RWF", "SS"], label: "LWF" },
      { x: 50, y: 10, suggestedPositions: ["CF", "SS"], label: "CF" },
      { x: 80, y: 12, suggestedPositions: ["RWF", "LWF", "SS"], label: "RWF" },
      // Midfield: 1 AMF + 2 CMF
      { x: 25, y: 50, suggestedPositions: ["CMF", "DMF"], label: "CMF" },
      { x: 50, y: 28, suggestedPositions: ["AMF", "SS", "CMF"], label: "AMF" },
      { x: 75, y: 50, suggestedPositions: ["CMF", "DMF"], label: "CMF" },
      // Defence (y ~68)
      { x: 15, y: 68, suggestedPositions: ["LB"], label: "LB" },
      { x: 38, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 62, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 85, y: 68, suggestedPositions: ["RB"], label: "RB" },
      // GK
      { x: 50, y: 90, suggestedPositions: ["GK"], label: "GK" },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    slots: [
      // Striker
      { x: 50, y: 10, suggestedPositions: ["CF", "SS"], label: "CF" },
      // Attacking mid trio (y ~28)
      { x: 20, y: 28, suggestedPositions: ["LWF", "RWF", "AMF"], label: "LWF" },
      { x: 50, y: 26, suggestedPositions: ["AMF", "SS", "CMF"], label: "AMF" },
      { x: 80, y: 28, suggestedPositions: ["RWF", "LWF", "AMF"], label: "RWF" },
      // Double pivot (y ~48)
      { x: 35, y: 48, suggestedPositions: ["DMF", "CMF"], label: "DMF" },
      { x: 65, y: 48, suggestedPositions: ["DMF", "CMF"], label: "DMF" },
      // Defence
      { x: 15, y: 68, suggestedPositions: ["LB"], label: "LB" },
      { x: 38, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 62, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 85, y: 68, suggestedPositions: ["RB"], label: "RB" },
      // GK
      { x: 50, y: 90, suggestedPositions: ["GK"], label: "GK" },
    ],
  },
  "4-4-2": {
    name: "4-4-2",
    slots: [
      // Strikers
      { x: 35, y: 12, suggestedPositions: ["CF", "SS"], label: "CF" },
      { x: 65, y: 12, suggestedPositions: ["CF", "SS"], label: "CF" },
      // Midfield
      { x: 15, y: 42, suggestedPositions: ["LWF", "LMF", "CMF", "AMF"], label: "LWF" },
      { x: 38, y: 44, suggestedPositions: ["CMF", "DMF", "AMF"], label: "CMF" },
      { x: 62, y: 44, suggestedPositions: ["CMF", "DMF", "AMF"], label: "CMF" },
      { x: 85, y: 42, suggestedPositions: ["RWF", "RMF", "CMF", "AMF"], label: "RWF" },
      // Defence
      { x: 15, y: 68, suggestedPositions: ["LB"], label: "LB" },
      { x: 38, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 62, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 85, y: 68, suggestedPositions: ["RB"], label: "RB" },
      // GK
      { x: 50, y: 90, suggestedPositions: ["GK"], label: "GK" },
    ],
  },
  "3-5-2": {
    name: "3-5-2",
    slots: [
      // Strikers
      { x: 35, y: 12, suggestedPositions: ["CF", "SS"], label: "CF" },
      { x: 65, y: 12, suggestedPositions: ["CF", "SS"], label: "SS" },
      // Wing-backs + midfield (y ~38-45)
      { x: 10, y: 40, suggestedPositions: ["LB", "LWF", "CMF"], label: "LB" },
      { x: 30, y: 42, suggestedPositions: ["CMF", "AMF"], label: "CMF" },
      { x: 50, y: 38, suggestedPositions: ["AMF", "CMF", "DMF"], label: "AMF" },
      { x: 70, y: 42, suggestedPositions: ["CMF", "AMF"], label: "CMF" },
      { x: 90, y: 40, suggestedPositions: ["RB", "RWF", "CMF"], label: "RB" },
      // 3 CBs (y ~70)
      { x: 25, y: 70, suggestedPositions: ["CB", "LB"], label: "CB" },
      { x: 50, y: 72, suggestedPositions: ["CB"], label: "CB" },
      { x: 75, y: 70, suggestedPositions: ["CB", "RB"], label: "CB" },
      // GK
      { x: 50, y: 90, suggestedPositions: ["GK"], label: "GK" },
    ],
  },
  "4-2-1-3": {
    name: "4-2-1-3",
    slots: [
      // Front 3
      { x: 20, y: 12, suggestedPositions: ["LWF", "RWF", "SS"], label: "LWF" },
      { x: 50, y: 10, suggestedPositions: ["CF", "SS"], label: "CF" },
      { x: 80, y: 12, suggestedPositions: ["RWF", "LWF", "SS"], label: "RWF" },
      // CAM
      { x: 50, y: 30, suggestedPositions: ["AMF", "SS", "CMF"], label: "AMF" },
      // Double pivot
      { x: 35, y: 48, suggestedPositions: ["DMF", "CMF"], label: "DMF" },
      { x: 65, y: 48, suggestedPositions: ["DMF", "CMF"], label: "DMF" },
      // Defence
      { x: 15, y: 68, suggestedPositions: ["LB"], label: "LB" },
      { x: 38, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 62, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 85, y: 68, suggestedPositions: ["RB"], label: "RB" },
      // GK
      { x: 50, y: 90, suggestedPositions: ["GK"], label: "GK" },
    ],
  },
  "4-1-2-3": {
    name: "4-1-2-3",
    slots: [
      // Front 3
      { x: 20, y: 12, suggestedPositions: ["LWF", "RWF", "SS"], label: "LWF" },
      { x: 50, y: 10, suggestedPositions: ["CF", "SS"], label: "CF" },
      { x: 80, y: 12, suggestedPositions: ["RWF", "LWF", "SS"], label: "RWF" },
      // Two CMs
      { x: 35, y: 36, suggestedPositions: ["CMF", "AMF"], label: "CMF" },
      { x: 65, y: 36, suggestedPositions: ["CMF", "AMF"], label: "CMF" },
      // Anchor
      { x: 50, y: 52, suggestedPositions: ["DMF", "CMF"], label: "DMF" },
      // Defence
      { x: 15, y: 68, suggestedPositions: ["LB"], label: "LB" },
      { x: 38, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 62, y: 70, suggestedPositions: ["CB"], label: "CB" },
      { x: 85, y: 68, suggestedPositions: ["RB"], label: "RB" },
      // GK
      { x: 50, y: 90, suggestedPositions: ["GK"], label: "GK" },
    ],
  },
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);
export const DEFAULT_FORMATION = "4-3-3";

// ─── Default competition objects ───
export const DEFAULT_COMPETITION_OBJECTS: Competition[] = [
  { id: 1, name: "League", format: "league" },
  { id: 2, name: "Cup", format: "knockout", knockoutRounds: 4 },
  { id: 3, name: "Champions League", format: "group-knockout", groupGames: 6, groupKnockoutRounds: 4 },
  { id: 4, name: "Friendly", format: "freetext" },
];

// ─── Competition format labels ───
export const COMP_FORMAT_LABELS: Record<CompetitionFormat, string> = {
  league: "League",
  knockout: "Knockout",
  "group-knockout": "Group + Knockout",
  freetext: "Custom",
};

// ─── Knockout round naming ───
/**
 * Given total rounds and the current round number (1-based from the start),
 * return a display label.
 * e.g. totalRounds=4: round 1="Round of 16", round 2="Quarter-Final", round 3="Semi-Final", round 4="Final"
 */
export function getKnockoutRoundName(roundFromEnd: number): string {
  switch (roundFromEnd) {
    case 1: return "Final";
    case 2: return "Semi-Final";
    case 3: return "Quarter-Final";
    case 4: return "Round of 16";
    case 5: return "Round of 32";
    case 6: return "Round of 64";
    default: return `Round of ${Math.pow(2, roundFromEnd)}`;
  }
}

/**
 * Build a flat list of matchday labels for the knockout phase of a competition.
 * Accounts for knockoutLegs (1 or 2), singleLegFinal, hasPreliminaryRound, and preliminaryLegs.
 */
function buildKnockoutMatchdays(
  knockoutRounds: number,
  knockoutLegs: 1 | 2,
  singleLegFinal: boolean,
  hasPreliminaryRound: boolean,
  preliminaryLegs: 1 | 2,
): string[] {
  const labels: string[] = [];

  // Preliminary round (before main knockout)
  if (hasPreliminaryRound) {
    if (preliminaryLegs === 2) {
      labels.push("Preliminary - 1st Leg", "Preliminary - 2nd Leg");
    } else {
      labels.push("Preliminary");
    }
  }

  // Main knockout rounds (from earliest to final)
  for (let r = knockoutRounds; r >= 1; r--) {
    const roundName = getKnockoutRoundName(r);
    const isFinal = r === 1;
    if (knockoutLegs === 2 && !(isFinal && singleLegFinal)) {
      labels.push(`${roundName} - 1st Leg`, `${roundName} - 2nd Leg`);
    } else {
      labels.push(roundName);
    }
  }

  return labels;
}

/**
 * Compute the next matchday label and sort value for a given competition.
 */
export function getNextMatchday(
  comp: Competition,
  existingMatchCount: number
): { matchday: string; matchdaySort: number } {
  const next = existingMatchCount + 1;

  switch (comp.format) {
    case "league":
      return { matchday: `Matchday ${next}`, matchdaySort: next };
    case "knockout": {
      const totalRounds = comp.knockoutRounds || 4;
      const legs = comp.knockoutLegs || 1;
      const slFinal = comp.singleLegFinal ?? false;
      const hasPrelim = comp.hasPreliminaryRound ?? false;
      const prelimLegs = comp.preliminaryLegs || 1;

      // Legacy playoffLegs support (before migration 6 converts it)
      const legacyPlayoff = comp.playoffLegs || 0;
      if (legacyPlayoff > 0 && !hasPrelim && existingMatchCount < legacyPlayoff) {
        const legNum = existingMatchCount + 1;
        return { matchday: `Playoff Leg ${legNum}`, matchdaySort: next };
      }

      const labels = buildKnockoutMatchdays(totalRounds, legs, slFinal, hasPrelim, prelimLegs);
      const idx = existingMatchCount - (legacyPlayoff > 0 && !hasPrelim ? legacyPlayoff : 0);
      if (idx >= 0 && idx < labels.length) {
        return { matchday: labels[idx], matchdaySort: next };
      }
      return { matchday: `Match ${next}`, matchdaySort: next };
    }
    case "group-knockout": {
      const groupGames = comp.groupGames || 6;
      const koRounds = comp.groupKnockoutRounds || 4;
      const legs = comp.knockoutLegs || 1;
      const slFinal = comp.singleLegFinal ?? false;

      if (existingMatchCount < groupGames) {
        return { matchday: `Group Game ${next}`, matchdaySort: next };
      }

      const koLabels = buildKnockoutMatchdays(koRounds, legs, slFinal, false, 1);
      const koIdx = existingMatchCount - groupGames;
      if (koIdx >= 0 && koIdx < koLabels.length) {
        return { matchday: koLabels[koIdx], matchdaySort: next };
      }
      return { matchday: `Match ${next}`, matchdaySort: next };
    }
    case "freetext":
    default:
      return { matchday: `Match ${next}`, matchdaySort: next };
  }
}

// ─── Milestone thresholds ───
export const MILESTONE_THRESHOLDS = [50, 100, 200, 300, 400, 500, 750, 1000];

// ─── Player status colors ───
export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "text-green-400 bg-green-900/30 border-green-800/50";
    case "loaned": return "text-yellow-400 bg-yellow-900/30 border-yellow-800/50";
    case "sold": return "text-red-400 bg-red-900/30 border-red-800/50";
    case "retired": return "text-slate-400 bg-slate-700/30 border-slate-600/50";
    default: return "text-green-400 bg-green-900/30 border-green-800/50";
  }
}

// ─── Competition catalogue ───
export const LEAGUE_SYSTEMS: LeagueSystem[] = [
  {
    id: "eng", name: "English", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    templates: [
      { templateId: "eng-premier-league", name: "Premier League", country: "England", group: "League", format: "league" },
      { templateId: "eng-championship", name: "Sky Bet Championship", country: "England", group: "League", format: "league" },
      { templateId: "eng-championship-playoffs", name: "Championship Playoffs", country: "England", group: "Playoffs", format: "knockout", knockoutRounds: 2, knockoutLegs: 2, singleLegFinal: true },
      { templateId: "eng-fa-cup", name: "FA Cup", country: "England", group: "Cup", format: "knockout", knockoutRounds: 4, knockoutLegs: 1, supportsPreliminary: true, defaultPreliminaryLegs: 1 },
      { templateId: "eng-community-shield", name: "Community Shield", country: "England", group: "Super Cup", format: "knockout", knockoutRounds: 1, knockoutLegs: 1 },
    ],
  },
  {
    id: "fra", name: "French", country: "France", flag: "🇫🇷",
    templates: [
      { templateId: "fra-ligue-1", name: "Ligue 1", country: "France", group: "League", format: "league" },
      { templateId: "fra-ligue-2", name: "Ligue 2", country: "France", group: "League", format: "league" },
      { templateId: "fra-coupe-de-france", name: "Coupe de France", country: "France", group: "Cup", format: "knockout", knockoutRounds: 4, knockoutLegs: 1, supportsPreliminary: true, defaultPreliminaryLegs: 1 },
      { templateId: "fra-trophee-des-champions", name: "Trophée des Champions", country: "France", group: "Super Cup", format: "knockout", knockoutRounds: 1, knockoutLegs: 1 },
    ],
  },
  {
    id: "esp", name: "Spanish", country: "Spain", flag: "🇪🇸",
    templates: [
      { templateId: "esp-la-liga", name: "La Liga EA Sports", country: "Spain", group: "League", format: "league" },
      { templateId: "esp-la-liga-2", name: "La Liga Hypermotion", country: "Spain", group: "League", format: "league" },
      { templateId: "esp-la-liga-2-playoffs", name: "La Liga Hypermotion Playoffs", country: "Spain", group: "Playoffs", format: "knockout", knockoutRounds: 2, knockoutLegs: 2, singleLegFinal: false },
      { templateId: "esp-copa-del-rey", name: "Copa del Rey", country: "Spain", group: "Cup", format: "knockout", knockoutRounds: 4, knockoutLegs: 2, singleLegFinal: true, supportsPreliminary: true, defaultPreliminaryLegs: 2 },
      { templateId: "esp-supercopa", name: "Supercopa de España", country: "Spain", group: "Super Cup", format: "knockout", knockoutRounds: 2, knockoutLegs: 1 },
    ],
  },
  {
    id: "ita", name: "Italian", country: "Italy", flag: "🇮🇹",
    templates: [
      { templateId: "ita-serie-a", name: "Serie A", country: "Italy", group: "League", format: "league" },
      { templateId: "ita-serie-b", name: "Serie B", country: "Italy", group: "League", format: "league" },
      { templateId: "ita-serie-b-playoffs", name: "Serie B Playoffs", country: "Italy", group: "Playoffs", format: "knockout", knockoutRounds: 2, knockoutLegs: 2, singleLegFinal: false },
      { templateId: "ita-coppa-italia", name: "Coppa Italia", country: "Italy", group: "Cup", format: "knockout", knockoutRounds: 4, knockoutLegs: 2, singleLegFinal: true, supportsPreliminary: true, defaultPreliminaryLegs: 1 },
      { templateId: "ita-supercoppa", name: "Supercoppa Italiana", country: "Italy", group: "Super Cup", format: "knockout", knockoutRounds: 1, knockoutLegs: 1 },
    ],
  },
  {
    id: "ger", name: "German", country: "Germany", flag: "🇩🇪",
    templates: [
      { templateId: "ger-bundesliga", name: "Bundesliga", country: "Germany", group: "League", format: "league" },
      { templateId: "ger-dfb-pokal", name: "DFB-Pokal", country: "Germany", group: "Cup", format: "freetext" },
      { templateId: "ger-supercup", name: "DFL-Supercup", country: "Germany", group: "Super Cup", format: "knockout", knockoutRounds: 1, knockoutLegs: 1 },
    ],
  },
  {
    id: "eur", name: "UEFA", country: "Europe", flag: "🇪🇺",
    templates: [
      { templateId: "eur-champions-league", name: "Champions League", country: "Europe", group: "European", format: "group-knockout", groupGames: 6, groupKnockoutRounds: 4, knockoutLegs: 2, singleLegFinal: true },
      { templateId: "eur-europa-league", name: "Europa League", country: "Europe", group: "European", format: "group-knockout", groupGames: 6, groupKnockoutRounds: 4, knockoutLegs: 2, singleLegFinal: true },
      { templateId: "eur-super-cup", name: "UEFA Super Cup", country: "Europe", group: "European", format: "knockout", knockoutRounds: 1, knockoutLegs: 1 },
    ],
  },
  {
    id: "fifa", name: "FIFA", country: "World", flag: "🌍",
    templates: [
      { templateId: "fifa-club-world-cup", name: "Club World Cup", country: "World", group: "World", format: "knockout", knockoutRounds: 2, knockoutLegs: 1 },
    ],
  },
  {
    id: "gen", name: "General", country: "General", flag: "⚽",
    templates: [
      { templateId: "gen-friendly", name: "Friendly", country: "General", group: "Other", format: "freetext" },
    ],
  },
];

/** Flat lookup map of all catalogue templates by templateId */
export const COMPETITION_CATALOGUE: Map<string, CompetitionTemplate> = (() => {
  const map = new Map<string, CompetitionTemplate>();
  for (const sys of LEAGUE_SYSTEMS) {
    for (const t of sys.templates) {
      map.set(t.templateId, t);
    }
  }
  return map;
})();

/** Convert a catalogue template into a Competition instance */
export function templateToCompetition(template: CompetitionTemplate): Competition {
  const comp: Competition = {
    id: Date.now() + (typeof crypto !== "undefined" && crypto.getRandomValues ? (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000) : Math.floor(Math.random() * 1_000_000)),
    name: template.name,
    format: template.format,
    predefinedId: template.templateId,
  };
  if (template.knockoutRounds !== undefined) comp.knockoutRounds = template.knockoutRounds;
  if (template.groupGames !== undefined) comp.groupGames = template.groupGames;
  if (template.groupKnockoutRounds !== undefined) comp.groupKnockoutRounds = template.groupKnockoutRounds;
  if (template.knockoutLegs !== undefined) comp.knockoutLegs = template.knockoutLegs;
  if (template.singleLegFinal !== undefined) comp.singleLegFinal = template.singleLegFinal;
  return comp;
}
