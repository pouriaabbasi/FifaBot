import { useState } from "react";
import { api } from "../api";

interface LoginFormProps {
  onSuccess: (token: string) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.loginWithPassword(username.trim(), password);
      onSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
      <form className="card" style={{ width: "100%", maxWidth: 340 }} onSubmit={handleSubmit}>
        <div className="screen-title" style={{ marginBottom: 4 }}>ورود</div>
        <div className="screen-sub" style={{ marginBottom: 18 }}>
          نام کاربری و رمز عبور رو از پیام بات دریافت کردی
        </div>
        <input
          className="form-field"
          placeholder="نام کاربری"
          value={username}
          autoFocus
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="form-field"
          type="password"
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={{ color: "var(--danger)", fontSize: "0.78rem", margin: "0 0 8px" }}>{error}</p>}
        <button className="btn-gold" type="submit" disabled={!username.trim() || !password || loading}>
          {loading ? "در حال ورود…" : "ورود"}
        </button>
      </form>
    </div>
  );
}
