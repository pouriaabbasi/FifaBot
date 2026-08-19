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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });
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
    stages: { order: number; format: "round_robin" | "knockout"; qualifyTopN?: number }[];
  }) => request<League>("/api/leagues", { method: "POST", body: JSON.stringify(payload) }),

  addMember: (leagueId: string, telegramId: string, nickname?: string) =>
    request(`/api/leagues/${leagueId}/members`, {
      method: "POST",
      body: JSON.stringify({ telegramId, nickname }),
    }),

  generateFixture: (leagueId: string) =>
    request(`/api/leagues/${leagueId}/generate-fixture`, { method: "POST" }),

  getStandings: (leagueId: string, stageId?: string) =>
    request<Standing[]>(`/api/leagues/${leagueId}/standings${stageId ? `?stageId=${stageId}` : ""}`),

  getMatches: (leagueId: string, opts: { status?: "pending" | "played"; mine?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (opts.status) qs.set("status", opts.status);
    if (opts.mine) qs.set("mine", "true");
    return request<Match[]>(`/api/leagues/${leagueId}/matches?${qs.toString()}`);
  },

  submitResult: (matchId: string, homeScore: number, awayScore: number, playedAt: string) =>
    request(`/api/matches/${matchId}/result`, {
      method: "PATCH",
      body: JSON.stringify({ homeScore, awayScore, playedAt }),
    }),
};

export interface League {
  id: string;
  name: string;
  status: "draft" | "active" | "finished";
  isTwoStage: boolean;
  members: { id: string; userId: string }[];
  stages: { id: string; order: number; format: "round_robin" | "knockout"; status: string }[];
}

export interface Standing {
  memberId: string;
  telegramId: string;
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

export interface Match {
  id: string;
  status: "pending" | "played";
  homeScore: number | null;
  awayScore: number | null;
  playedAt: string | null;
  homeMember: { id: string; nickname: string | null; user: { firstName: string } };
  awayMember: { id: string; nickname: string | null; user: { firstName: string } };
}
