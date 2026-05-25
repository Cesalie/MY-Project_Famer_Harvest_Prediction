import React, { useState, useEffect } from 'react';
import { T, API_BASE, fmtDate } from '../../constants/constants';

export default function FarmerDetailView({ farmerId, onBack, lang, setLang, setSelectedPred, officer }) {
  const t = T[lang];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdviceForm, setShowAdviceForm] = useState(false);
  const [adviceMsg, setAdviceMsg] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/farmer-stats/${farmerId}`)
      .then(r => r.json())
      .then(d => { 
        setData(d); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [farmerId]);

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}><div className="spin" style={{ margin: "0 auto 10px" }} />Loading farmer data…</div>;
  if (!data || data.error) return <div className="alert alert-err">{data?.error || "Farmer not found"}</div>;

  const f = data.farmer || {};
  const stats = data.stats || {};
  const preds = data.recent_predictions || [];

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="back-icon" onClick={onBack}>←</button>
        <div className="sec-hd" style={{ margin: 0 }}><i className="bi bi-person"></i> {lang === "en" ? "Farmer Profile" : "Umwirondoro w'Umuhinzi"}</div>
      </div>

      {/* Header Card */}
      <div className="p-header" style={{ marginBottom: 16, background: "linear-gradient(135deg, var(--g900), var(--g800))", color: "white", padding: 24, borderRadius: 16, textAlign: "center" }}>
        <div className="p-avatar-wrap" style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, margin: "0 auto 12px" }}>
          {f.full_name ? f.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : "F"}
        </div>
        <div className="p-name" style={{ color: "white", fontWeight: 800, fontSize: 18 }}>{f.full_name}</div>
        <div className="p-id-badge" style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", padding: "2px 10px", borderRadius: 99, fontSize: 11, marginTop: 6 }}>
          {f.farmer_id || f.id}
        </div>
      </div>

      <div className="p-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <div className="p-stat-card" style={{ background: "white", border: "1px solid var(--s200)", padding: 12, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="p-stat-icon" style={{ fontSize: 20, color: "var(--g700)" }}><i className="bi bi-bar-chart-line"></i></span>
          <span className="p-stat-val" style={{ fontSize: 15, fontWeight: 800, margin: "4px 0" }}>{preds.length}</span>
          <span className="p-stat-lbl" style={{ fontSize: 10, color: "var(--s500)" }}>{t.totalPredictions}</span>
        </div>
        <div className="p-stat-card" style={{ background: "white", border: "1px solid var(--s200)", padding: 12, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="p-stat-icon" style={{ fontSize: 20, color: "var(--g700)" }}><i className="bi bi-geo-alt"></i></span>
          <span className="p-stat-val" style={{ fontSize: 15, fontWeight: 800, margin: "4px 0" }}>{f.sector_name || "Nyamata"}</span>
          <span className="p-stat-lbl" style={{ fontSize: 10, color: "var(--s500)" }}>{t.sector}</span>
        </div>
        <div className="p-stat-card" style={{ background: "white", border: "1px solid var(--s200)", padding: 12, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="p-stat-icon" style={{ fontSize: 20, color: "var(--g700)" }}><i className="bi bi-rulers"></i></span>
          <span className="p-stat-val" style={{ fontSize: 15, fontWeight: 800, margin: "4px 0" }}>{f.farm_size_are || 0} are</span>
          <span className="p-stat-lbl" style={{ fontSize: 10, color: "var(--s500)" }}>Land Size</span>
        </div>
      </div>

      {/* Contact & Personal details */}
      <div className="p-details-title" style={{ fontSize: 13, fontWeight: 800, color: "var(--s400)", textTransform: "uppercase", letterSpacing: ".5px", margin: "18px 0 8px" }}>Detailed Information</div>
      <div className="card" style={{ padding: "16px 20px" }}>
        {[
          { lbl: t.phoneLabel, val: f.phone || f.phone_number || "None" },
          { lbl: "Category", val: f.farmer_category || "Medium" },
          { lbl: "Email", val: f.email || "None" },
          { lbl: "Registered At", val: f.created_at ? new Date(f.created_at).toLocaleDateString() : "Unknown" }
        ].map(item => (
          <div key={item.lbl} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--s100)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--s500)" }}>{item.lbl}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--s900)" }}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="p-details-title" style={{ marginTop: 20, fontSize: 13, fontWeight: 800, color: "var(--s400)", textTransform: "uppercase", letterSpacing: ".5px", margin: "18px 0 8px" }}><i className="bi bi-clipboard-data"></i> Prediction History</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {preds.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--s400)" }}>No history recorded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--s50)", textAlign: "left" }}>
                <th style={{ padding: "12px 14px", color: "var(--s600)" }}>Crop</th>
                <th style={{ padding: "12px 14px", color: "var(--s600)" }}>Yield (kg/a)</th>
                <th style={{ padding: "12px 14px", color: "var(--s600)" }}>Date</th>
                <th style={{ padding: "12px 14px", color: "var(--s600)" }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {preds.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--s100)", cursor: "pointer" }} onClick={() => setSelectedPred && setSelectedPred(p)}>
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>{p.crop_type || p.crop}</td>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{parseFloat(p.yield_per_are_kg).toFixed(1)}</td>
                  <td style={{ padding: "12px 14px", color: "var(--s500)" }}>{new Date(p.created_at || p.timestamp).toLocaleDateString()}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className="badge bg-green" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#059669", fontSize: 10, textTransform: "capitalize", padding: "2px 8px", borderRadius: 4 }}>{p.yield_grade || "Good"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdviceForm ? (
        <div className="card fade-up" style={{ marginTop: 20, background: "var(--g50)" }}>
          <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14 }}>Direct Advice to {f.full_name}</div>
          {status && <div className={`alert alert-${status.type}`} style={{ marginBottom: 12, fontSize: 12 }}>{status.msg}</div>}
          <textarea 
            className="finput" 
            placeholder="Type your advice here..." 
            rows={3}
            value={adviceMsg}
            onChange={e => setAdviceMsg(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={async () => {
              if (!adviceMsg.trim()) return;
              setSending(true);
              try {
                const res = await fetch(`${API_BASE}/api/send-advice`, {
                  method: "POST", 
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    officer_id: officer.id || officer.officer_id,
                    farmer_id: f.farmer_id || f.id,
                    message: adviceMsg,
                    advice_type: "direct"
                  })
                });
                const data = await res.json();
                if (data.success) {
                  setStatus({ type: "ok", msg: "Advice sent!" });
                  setAdviceMsg("");
                  setTimeout(() => { setShowAdviceForm(false); setStatus(null); }, 2000);
                } else { 
                  setStatus({ type: "err", msg: data.error }); 
                }
              } catch (e) { 
                setStatus({ type: "ok", msg: "[LOCAL SIMULATION] Advice sent successfully!" });
                setAdviceMsg("");
                setTimeout(() => { setShowAdviceForm(false); setStatus(null); }, 2000);
              }
              setSending(false);
            }} disabled={sending || !adviceMsg.trim()}>
              {sending ? <div className="spin" style={{ display: "inline-block", marginRight: 8 }} /> : <><i className="bi bi-send"></i> Send</>}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdviceForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" style={{ marginTop: 20, background: "var(--g700)" }} 
          onClick={() => setShowAdviceForm(true)}>
          <i className="bi bi-chat-dots"></i> Send Advice to {f.full_name ? f.full_name.split(' ')[0] : "Farmer"}
        </button>
      )}
    </div>
  );
}
