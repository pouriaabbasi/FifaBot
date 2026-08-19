import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function NewLeaguePage() {
  const [name, setName] = useState("");
  const [isTwoStage, setIsTwoStage] = useState(false);
  const [format, setFormat] = useState<"round_robin" | "knockout">("round_robin");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const league = await api.createLeague({
        name: name.trim(),
        isTwoStage,
        stages: [{ order: 1, format }],
      });
      navigate(`/leagues/${league.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">ساخت لیگ جدید</div>
          <div className="screen-sub">فرمت را انتخاب کن، بعد بازیکن‌ها را اضافه کن</div>
        </div>
      </div>

      <input
        className="form-field"
        placeholder="نام لیگ (مثلا لیگ جمعه‌ها)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="section-label">فرمت مرحله اول</div>
      <div className="stage-tabs">
        <button
          className={`stage-tab${format === "round_robin" ? " active" : ""}`}
          onClick={() => setFormat("round_robin")}
        >
          رفت و برگشت
        </button>
        <button
          className={`stage-tab${format === "knockout" ? " active" : ""}`}
          onClick={() => setFormat("knockout")}
        >
          حذفی
        </button>
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="pname">لیگ دو‌مرحله‌ای باشد؟</span>
        <input type="checkbox" checked={isTwoStage} onChange={(e) => setIsTwoStage(e.target.checked)} />
      </div>

      <button className="btn-gold" disabled={!name.trim() || submitting} onClick={handleSubmit}>
        {submitting ? "در حال ساخت…" : "ساخت لیگ"}
      </button>
    </div>
  );
}
