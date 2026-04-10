// ─── Football API integration with football-data.org ───

import { PLAYER_LOOKUP, NAME_TO_PLAYER_ID } from "./leagueData";
import type { Player } from "./types";

const API_KEY = "130ac932c47b4c3eac1d0d6ffd2ecb24";
const BASE_URL = "https://api.football-data.org/v4";

interface ApiSquadPlayer {
  id: number;
  name: string;
  position: string;
  dateOfBirth?: string;
}

interface ApiTeam {
  id: number;
  name: string;
  squad?: ApiSquadPlayer[];
}

interface ApiResponse {
  team: ApiTeam;
}

/**
 * Maps football-data.org position strings to PES Tracker positions
 */
function mapPosition(apiPos: string | undefined): string {
  if (!apiPos) return "CF";
  
  const pos = apiPos.toUpperCase();
  
  // Goalkeeper
  if (pos.includes("GK")) return "GK";
  
  // Defense
  if (pos.includes("CB")) return "CB";
  if (pos.includes("LB")) return "LB";
  if (pos.includes("RB")) return "RB";
  if (pos.includes("LWB")) return "LB";
  if (pos.includes("RWB")) return "RB";
  
  // Midfield
  if (pos.includes("CDM")) return "DMF";
  if (pos.includes("CAM")) return "AMF";
  if (pos.includes("CM")) return "CMF";
  if (pos.includes("LM")) return "LMF";
  if (pos.includes("RM")) return "RMF";
  if (pos.includes("DM")) return "DMF";
  if (pos.includes("AM")) return "AMF";
  
  // Attack
  if (pos.includes("CF")) return "CF";
  if (pos.includes("ST")) return "CF";
  if (pos.includes("LW")) return "LWF";
  if (pos.includes("RW")) return "RWF";
  if (pos.includes("LF")) return "LWF";
  if (pos.includes("RF")) return "RWF";
  if (pos.includes("SS")) return "SS";
  
  return "CF";
}

/**
 * Calculate age from date of birth string (YYYY-MM-DD format)
 */
function calculateAge(dateOfBirth: string | undefined): number {
  if (!dateOfBirth) return 25; // Default age if not provided
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return Math.max(15, Math.min(50, age)); // Clamp between 15-50
}

/**
 * Search for a team in the football-data.org API by name and get its correct API ID
 * This is needed because game team IDs don't match API team IDs
 */
async function getApiTeamIdByName(teamName: string): Promise<number | null> {
  try {
    // Search for the team using the teams endpoint with filters
    const response = await fetch(
      `${BASE_URL}/competitions/PL/teams`,
      {
        method: "GET",
        headers: { 
          "X-Auth-Token": API_KEY,
          "Content-Type": "application/json",
        },
        mode: "cors",
      }
    );

    if (!response.ok) return null;

    const data: any = await response.json();
    const teams = data.teams || [];
    
    // Find exact or substring match
    const match = teams.find((t: any) => 
      t.name.toLowerCase() === teamName.toLowerCase() ||
      t.shortName?.toLowerCase() === teamName.toLowerCase()
    );
    
    return match?.id || null;
  } catch (error) {
    console.error("Error searching for team:", error);
    return null;
  }
}

/**
 * Fetch team squad from football-data.org and convert to Player objects
 * Only includes players that exist in the PLAYER_LOOKUP
 */
export async function fetchTeamSquad(gameTeamId: number, teamName: string): Promise<Player[]> {
  try {
    // First, get the correct API team ID by searching by name
    const apiTeamId = await getApiTeamIdByName(teamName);
    
    if (!apiTeamId) {
      throw new Error(
        `Team "${teamName}" not found in football-data.org. Try a different team.`
      );
    }

    const response = await fetch(
      `${BASE_URL}/teams/${apiTeamId}`,
      {
        method: "GET",
        headers: { 
          "X-Auth-Token": API_KEY,
          "Content-Type": "application/json",
        },
        mode: "cors",
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();
    const squad = data.team.squad || [];

    // Convert API players to app Player objects
    // Only include players that match PLAYER_LOOKUP by exact name
    const players: Player[] = [];
    const seenPlayerIds = new Set<number>();

    for (const apiPlayer of squad) {
      // Try to find exact name match in our player lookup
      const playerId = NAME_TO_PLAYER_ID[apiPlayer.name];

      if (playerId && !seenPlayerIds.has(playerId)) {
        // Use the known player ID from our lookup
        players.push({
          id: playerId,
          name: apiPlayer.name,
          age: calculateAge(apiPlayer.dateOfBirth),
          rating: 75, // Default rating - user can edit
          position: mapPosition(apiPlayer.position),
          isStarter: false,
          status: "active",
        });
        seenPlayerIds.add(playerId);
      }
    }

    return players;
  } catch (error) {
    console.error("Error fetching team squad:", error);
    throw error;
  }
}

/**
 * Search for teams in a league by partial name match
 * This is a client-side helper since football-data.org doesn't have a team search endpoint
 */
export function searchTeams(
  teams: Array<{ id: number; name: string }>,
  query: string
): Array<{ id: number; name: string }> {
  if (!query.trim()) return teams;

  const lowerQuery = query.toLowerCase();
  return teams.filter((team) => team.name.toLowerCase().includes(lowerQuery));
}
