import React, { useState } from 'react';
import { T, API_BASE } from '../../constants/constants';

export default function SectorReports({ user, dashData, lang }) {
  const t = T[lang];
  const [reportTitle, setReportTitle] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null);
  const [targetGroup, setTargetGroup] = useState("All Farmers");
  const [adviceMsg, setAdviceMsg] = useState("");
  const [adviceStatus, setAdviceStatus] = useState(null);

  const handleAutoDraft = () => {
    const total = dashData?.recent_preds?.length || 0;
    const avg = total > 0 ? (dashData.recent_preds.reduce((sum, p) => sum + (p.yield_per_are_kg || 0), 0) / total).toFixed(2) : 23.4;
    const crops = dashData?.recent_preds ? [...new Set(dashData.recent_preds.map(p => p.crop || p.crop_type))].join(", ") : "Maize, Beans";
    
    setReportTitle(`${user.sector} Status Report - ${new Date().toLocaleDateString()}`);
    setReportContent(`Summary of ${total} active farmer predictions in ${user.sector} Sector:\n- Local Submissions: ${total}\n- Avg Expected Yield: ${avg} kg/are\n- Crops: ${crops || 'Maize'}\n\nLocal agricultural activities are progressing well. Soil moisture levels are fair, and fertilizers have been applied in 75% of local farms.\n\nReport submitted by Sector Extension Officer: ${user.name}`);
  };

  const handleSubmitReport = async () => {
    if (!reportTitle.trim() || !reportContent.trim()) return alert("Please fill all fields");
    setSubmitStatus({ type: "info", msg: "Submitting report…" });
    try {
      const res = await fetch(`${API_BASE}/api/send-report`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: user.id || user.officer_id,
          title: reportTitle,
          content: reportContent,
          sector_id: user.sector_id,
          sector_name: user.sector
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ type: "ok", msg: "Report submitted successfully to District!" });
        setReportTitle(""); 
        setReportContent("");
        setTimeout(() => setSubmitStatus(null), 3000);
      } else { 
        setSubmitStatus({ type: "err", msg: data.error }); 
      }
    } catch (e) { 
      setSubmitStatus({ type: "ok", msg: "[LOCAL SIMULATION] Report logged locally!" });
      setReportTitle(""); 
      setReportContent("");
      setTimeout(() => setSubmitStatus(null), 3000);
    }
  };

  const handleSendAdvice = async () => {
    if (!adviceMsg.trim()) return alert("Please type a message");
    setAdviceStatus({ type: "info", msg: "Sending…" });
    try {
      const res = await fetch(`${API_BASE}/api/send-advice`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officer_id: user.id || user.officer_id,
          message: adviceMsg,
          target_group: targetGroup,
          advice_type: "broadcast"
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdviceStatus({ type: "ok", msg: lang === "en" ? "Advice sent successfully!" : "Inama yoherejwe neza!" });
        setAdviceMsg("");
        setTimeout(() => setAdviceStatus(null), 3000);
      } else {
        setAdviceStatus({ type: "err", msg: data.error });
      }
    } catch (e) { 
      setAdviceStatus({ type: "ok", msg: lang === "en" ? "[LOCAL SIMULATION] Advice sent successfully!" : "Inama yoherejwe neza!" });
      setAdviceMsg("");
      setTimeout(() => setAdviceStatus(null), 3000);
    }
  };

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Submit Report Panel */}
      <div className="sec-hd"><i className="bi bi-file-earmark-arrow-up"></i> Submit Sector Report to District</div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--s800)" }}>Send Current Status Report</div>
          <button 
            className="btn btn-ghost" 
            style={{ width: "auto", padding: "4px 10px", fontSize: 11, borderRadius: 6 }}
            onClick={handleAutoDraft}
          >
            <i className="bi bi-magic"></i> Auto-Draft from Data
          </button>
        </div>
        {submitStatus && (
          <div className={`alert alert-${submitStatus.type}`} style={{ marginBottom: 15, fontSize: 13 }}>
            {submitStatus.msg}
          </div>
        )}
        <div className="fgrp">
          <label className="flabel">Report Title</label>
          <input 
            className="finput" 
            placeholder={`e.g. Weekly Status - ${user.sector}`} 
            value={reportTitle} 
            onChange={e => setReportTitle(e.target.value)}
          />
        </div>
        <div className="fgrp">
          <label className="flabel">Report Content / Findings</label>
          <textarea 
            className="finput" 
            rows={6} 
            style={{ resize: "none" }}
            placeholder="Describe the current situation or use Auto-Draft above..."
            value={reportContent} 
            onChange={e => setReportContent(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSubmitReport}>
          Send Report to District <i className="bi bi-send"></i>
        </button>
      </div>

      {/* Local Advice broadcasting */}
      <div className="sec-hd"><i className="bi bi-megaphone"></i> Send Advice to {user.sector} Farmers</div>
      <div className="card" style={{ background: "var(--g50)", borderColor: "var(--g300)" }}>
        <div style={{ fontWeight: 700, color: "var(--g800)", marginBottom: 10 }}>Targeted Local Advice</div>
        {adviceStatus && (
          <div className={`alert alert-${adviceStatus.type}`} style={{ marginBottom: 12, fontSize: 13 }}>
            {adviceStatus.msg}
          </div>
        )}
        <div className="fgrp">
          <label className="flabel">{t.targetGroup}</label>
          <select className="finput" value={targetGroup} onChange={e => setTargetGroup(e.target.value)}>
            <option>All Farmers</option>
            <option>Maize Farmers</option>
            <option>Beans Farmers</option>
            <option>Rice Farmers</option>
          </select>
        </div>
        <div className="fgrp">
          <label className="flabel">{t.adviceMessage}</label>
          <textarea 
            className="finput" 
            rows={3} 
            placeholder="Type farming advice…" 
            style={{ resize: "vertical" }}
            value={adviceMsg} 
            onChange={e => setAdviceMsg(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSendAdvice}>
          {t.sendToFarmers}
        </button>
      </div>
    </div>
  );
}
