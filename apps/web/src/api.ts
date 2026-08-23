const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  sessionStorage.setItem("auth_token", token);
}

export function loadStoredToken() {
  authToken = sessionStorage.getItem("auth_token");
  return authToken;
}

function clearAuthToken() {
  authToken = null;
  sessionStorage.removeItem("auth_token");
}

const REQUEST_TIMEOUT_MS = 20000;

let inFlightCount = 0;
const inFlightListeners = new Set<(count: number) => void>();

export function subscribeInFlight(listener: (count: number) => void) {
  inFlightListeners.add(listener);
  return () => inFlightListeners.delete(listener);
}

function setInFlight(delta: 1 | -1) {
  inFlightCount += delta;
  inFlightListeners.forEach((l) => l(inFlightCount));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  setInFlight(1);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("پاسخی از سرور دریافت نشد، دوباره تلاش کن");
    }
    throw new Error("اتصال به سرور برقرار نشد");
  } finally {
    clearTimeout(timeout);
    setInFlight(-1);
  }

  if (res.status === 401) {
    clearAuthToken();
    throw new Error("نشست شما منقضی شده، دوباره وارد شو");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  loginWithTelegram: (initData: string) =>
    request<{ token: string; user: unknown }>("/api/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ initData }),
    }),

  getLeagues: () => request<League[]>("/api/leagues"),

  createLeague: (payload: {
    name: string;
    isTwoStage: boolean;
    teamSize?: 1 | 2;
    stages: { order: number; format: "round_robin" | "knockout"; qualifyTopN?: number }[];
  }) => request<League>("/api/leagues", { method: "POST", body: JSON.stringify(payload) }),

  generateFixture: (leagueId: string) =>
    request(`/api/leagues/${leagueId}/generate-fixture`, { method: "POST" }),

  removeMember: (leagueId: string, memberId: string) =>
    request(`/api/leagues/${leagueId}/members/${memberId}`, { method: "DELETE" }),

  messageMember: (leagueId: string, memberId: string, text: string) =>
    request(`/api/leagues/${leagueId}/members/${memberId}/message`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  messageLeague: (leagueId: string, text: string) =>
    request(`/api/leagues/${leagueId}/message`, { method: "POST", body: JSON.stringify({ text }) }),

  joinLeague: (inviteCode: string) =>
    request<{ league: League; member: LeagueMember }>(`/api/leagues/join/${inviteCode}`, { method: "POST" }),

  getIncompleteTeams: (leagueId: string) =>
    request<LeagueMember[]>(`/api/leagues/${leagueId}/incomplete-teams`),

  pairTeam: (leagueId: string, targetMemberId: string, sourceMemberId?: string) =>
    request<LeagueMember>(`/api/leagues/${leagueId}/teams/${targetMemberId}/pair`, {
      method: "POST",
      body: JSON.stringify(sourceMemberId ? { memberId: sourceMemberId } : {}),
    }),

  setTeamName: (leagueId: string, memberId: string, name: string | null) =>
    request<LeagueMember>(`/api/leagues/${leagueId}/teams/${memberId}/name`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  getStandings: (leagueId: string, stageId?: string) =>
    request<Standing[]>(`/api/leagues/${leagueId}/standings${stageId ? `?stageId=${stageId}` : ""}`),

  getMatches: (leagueId: string, opts: { status?: "pending" | "played"; mine?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (opts.status) qs.set("status", opts.status);
    if (opts.mine) qs.set("mine", "true");
    return request<Match[]>(`/api/leagues/${leagueId}/matches?${qs.toString()}`);
  },

  getMatch: (matchId: string) => request<Match>(`/api/matches/${matchId}`),

  submitResult: (matchId: string, homeScore: number, awayScore: number) =>
    request<Match>(`/api/matches/${matchId}/result`, {
      method: "PATCH",
      body: JSON.stringify({ homeScore, awayScore }),
    }),

  clearResult: (matchId: string) =>
    request<Match>(`/api/matches/${matchId}/result`, { method: "DELETE" }),

  getProfileStats: () => request<ProfileStats>("/api/profile/stats"),

  getMe: () => request<CurrentUser>("/api/profile/me"),

  updateNickname: (nickname: string | null) =>
    request<CurrentUser>("/api/profile/nickname", {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }),
};

export interface LeagueMember {
  id: string;
  role: "owner" | "admin" | "player";
  status: "incomplete" | "complete";
  nickname: string | null;
  users: { userId: string; user: { firstName: string; nickname: string | null; photoUrl: string | null } }[];
}

export interface League {
  id: string;
  name: string;
  ownerId: string;
  status: "draft" | "active" | "finished";
  isTwoStage: boolean;
  teamSize: number;
  inviteCode: string;
  members: LeagueMember[];
  stages: { id: string; order: number; format: "round_robin" | "knockout"; status: string }[];
}

export interface Standing {
  memberId: string;
  memberUserIds: string[];
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  goalDiff: number;
  points: number;
}

export interface ProfileStats {
  leaguesJoined: number;
  leaguesActive: number;
  leaguesOwned: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
}

export interface CurrentUser {
  telegramId: string;
  firstName: string;
  username: string | null;
  nickname: string | null;
  photoUrl: string | null;
}

export interface Match {
  id: string;
  status: "pending" | "played";
  homeScore: number | null;
  awayScore: number | null;
  playedAt: string | null;
  homeMember: MatchMemberRef;
  awayMember: MatchMemberRef;
}

interface MatchMemberRef {
  id: string;
  nickname: string | null;
  users: { userId: string; user: { firstName: string; nickname: string | null } }[];
}
