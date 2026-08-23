import { useState } from "react";

interface MessageModalProps {
  title: string;
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}

export function MessageModal({ title, onClose, onSend }: MessageModalProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim());
      setSent(true);
      setTimeout(onClose, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال پیام ناموفق بود");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: "100%", maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="field-label" style={{ marginTop: 0 }}>{title}</div>
        <textarea
          className="form-field"
          style={{ minHeight: 100, resize: "vertical" }}
          placeholder="متن پیام…"
          value={text}
          maxLength={1000}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p style={{ color: "var(--danger)", fontSize: "0.78rem", margin: "0 0 8px" }}>{error}</p>}
        {sent && <p style={{ color: "var(--gold)", fontSize: "0.78rem", margin: "0 0 8px" }}>ارسال شد ✓</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-gold" style={{ flex: 1 }} disabled={!text.trim() || sending} onClick={handleSend}>
            {sending ? "در حال ارسال…" : "ارسال"}
          </button>
          <button
            className="btn-gold"
            style={{ flex: 1, background: "none", border: "1.5px solid rgba(232,183,63,0.4)", color: "var(--gold)", boxShadow: "none" }}
            onClick={onClose}
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
