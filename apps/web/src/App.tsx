import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { getTelegramWebApp, initTelegramWebApp } from "./telegram";
import { api, loadStoredToken, setAuthToken } from "./api";
import { BottomNav } from "./components/BottomNav";
import { GlobalLoadingBar } from "./components/GlobalLoadingBar";
import { LeaguesPage } from "./pages/LeaguesPage";
import { NewLeaguePage } from "./pages/NewLeaguePage";
import { LeagueDetailPage } from "./pages/LeagueDetailPage";
import { ResultEntryPage } from "./pages/ResultEntryPage";
import { ProfilePage } from "./pages/ProfilePage";

type AuthState = "loading" | "waking" | "ready" | "error";

function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [joinedLeagueId, setJoinedLeagueId] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    initTelegramWebApp();
    const webApp = getTelegramWebApp();
    let cancelled = false;

    // Login can take a couple seconds even on a warm server (network + a DB
    // upsert). Only call out a slow server after that's clearly exceeded.
    const wakingTimer = setTimeout(() => {
      if (!cancelled) setAuthState("waking");
    }, 8000);

    async function bootstrap() {
      if (!loadStoredToken()) {
        if (!webApp?.initData) {
          if (!cancelled) setAuthState("error");
          return;
        }
        const { token } = await api.loginWithTelegram(webApp.initData);
        if (cancelled) return;
        setAuthToken(token);
      }

      const inviteCode = webApp?.initDataUnsafe?.start_param;
      if (inviteCode) {
        try {
          const { league } = await api.joinLeague(inviteCode);
          if (!cancelled) setJoinedLeagueId(league.id);
        } catch {
          // invalid/expired invite link — fall through to the normal league list
        }
      }

      if (!cancelled) setAuthState("ready");
    }

    bootstrap().catch(() => {
      if (!cancelled) setAuthState("error");
    });

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
    };
  }, [retryTick]);

  if (authState === "loading") {
    return <div className="loading-state">در حال ورود…</div>;
  }
  if (authState === "waking") {
    return <div className="loading-state">اتصال کمی طول کشیده، کمی صبر کن…</div>;
  }
  if (authState === "error") {
    return (
      <div className="empty-state">
        <p>مشکلی در اتصال پیش آمد.</p>
        <button className="btn-gold" style={{ marginTop: 14 }} onClick={() => setRetryTick((t) => t + 1)}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <HashRouter>
      <GlobalLoadingBar />
      <div className="app-shell">
        <Routes>
          <Route
            path="/"
            element={joinedLeagueId ? <Navigate to={`/leagues/${joinedLeagueId}`} replace /> : <LeaguesPage />}
          />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/new" element={<NewLeaguePage />} />
          <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/leagues/:leagueId/matches/:matchId/result" element={<ResultEntryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
