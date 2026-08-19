import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { getTelegramWebApp, initTelegramWebApp } from "./telegram";
import { api, loadStoredToken, setAuthToken } from "./api";
import { BottomNav } from "./components/BottomNav";
import { LeaguesPage } from "./pages/LeaguesPage";
import { NewLeaguePage } from "./pages/NewLeaguePage";
import { LeagueDetailPage } from "./pages/LeagueDetailPage";
import { ResultEntryPage } from "./pages/ResultEntryPage";
import { ProfilePage } from "./pages/ProfilePage";

type AuthState = "loading" | "ready" | "error";

function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [joinedLeagueId, setJoinedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    initTelegramWebApp();
    const webApp = getTelegramWebApp();

    async function bootstrap() {
      if (!loadStoredToken()) {
        if (!webApp?.initData) {
          setAuthState("error");
          return;
        }
        const { token } = await api.loginWithTelegram(webApp.initData);
        setAuthToken(token);
      }

      const inviteCode = webApp?.initDataUnsafe?.start_param;
      if (inviteCode) {
        try {
          const { league } = await api.joinLeague(inviteCode);
          setJoinedLeagueId(league.id);
        } catch {
          // invalid/expired invite link — fall through to the normal league list
        }
      }

      setAuthState("ready");
    }

    bootstrap().catch(() => setAuthState("error"));
  }, []);

  if (authState === "loading") {
    return <div className="loading-state">در حال ورود…</div>;
  }
  if (authState === "error") {
    return <div className="empty-state">اپ را باید از داخل تلگرام باز کنی.</div>;
  }

  return (
    <HashRouter>
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
