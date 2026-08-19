import { useEffect, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
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

  useEffect(() => {
    initTelegramWebApp();

    if (loadStoredToken()) {
      setAuthState("ready");
      return;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.initData) {
      setAuthState("error");
      return;
    }

    api
      .loginWithTelegram(webApp.initData)
      .then(({ token }) => {
        setAuthToken(token);
        setAuthState("ready");
      })
      .catch(() => setAuthState("error"));
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
          <Route path="/" element={<LeaguesPage />} />
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
