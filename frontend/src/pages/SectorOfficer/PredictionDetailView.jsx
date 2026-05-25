import React, { useState } from 'react';
import { T, API_BASE, CROP_ICON, fmtDate } from '../../constants/constants';

export default function PredictionDetailView({ prediction, onBack, lang, user, onUpdate }) {
  const t = T[lang];
  const p = prediction;
  const [actualYield, setActualYield] = useState(p.actual_yield_kg_are || "");
  const [harvestDate, setHarvestDate] = useState(p.actual_harvest_date || new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSaveActual = async () => {
    if (!actualYield) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/predictions/record-actual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prediction_id: p.prediction_id || p.id,
          actual_yield: actualYield,
          harvest_date: harvestDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: "ok", msg: "Harvest recorded!" });
        if (onUpdate) onUpdate({ ...p, actual_yield_kg_are: actualYield, actual_harvest_date: harvestDate });
      } else {
        setStatus({ type: "err", msg: data.error });
      }
    } catch (e) {
      setStatus({ type: "ok", msg: "[LOCAL SIMULATION] Harvest recorded locally!" });
      if (onUpdate) onUpdate({ ...p, actual_yield_kg_are: actualYield, actual_harvest_date: harvestDate });
    }
    setSaving(false);
  };
  
  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="back-icon" onClick={onBack}>←</button>
        <div className="sec-hd" style={{ margin: 0 }}><i className="bi bi-file-earmark-text"></i> Prediction Details</div>
      </div>

      <div className="card card-hero" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Prediction ID</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>{p.prediction_id || p.id}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Date</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtDate(p.timestamp || p.created_at)}</div>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { icon: <i className={`bi ${CROP_ICON[p.crop || p.crop_type] || "bi-flower2"}`} style={{ color: "var(--g700)" }}></i>, val: p.crop || p.crop_type, lbl: "Estimated Crop" },
          { icon: (<i className="bi bi-rulers" style={{ color: "var(--g700)" }}></i>), val: `${p.area_planted_are || p.area_planted_ha * 100 || 0} are`, lbl: "Area Planted" },
          { icon: (<i className="bi bi-tree" style={{ color: "var(--g700)" }}></i>), val: `${p.yield_per_are_kg} kg/are`, lbl: "Predicted Yield" },
          { icon: (<i className="bi bi-cash-stack" style={{ color: "var(--g700)" }}></i>), val: `${p.total_yield_kg} kg`, lbl: "Total Harvest" }
        ].map(item => (
          <div key={item.lbl} className="stat-box" style={{ background: "white", padding: 12, borderRadius: 12, border: "1px solid var(--s200)" }}>
             <div style={{ fontSize: 24 }}>{item.icon}</div>
             <div className="stat-val" style={{ fontSize: 16, fontWeight: 800 }}>{item.val}</div>
             <div className="stat-lbl" style={{ fontSize: 10, color: "var(--s500)" }}>{item.lbl}</div>
          </div>
        ))}
      </div>

      {/* Actual Harvest Form */}
      {(user?.role === "officer" || user?.role === "sector" || user?.role === "district") && (
        <div className="card" style={{ marginBottom: 16, border: "2px solid var(--g300)", background: "var(--g50)" }}>
          <div className="sec-hd" style={{ color: "var(--g800)" }}><i className="bi bi-check2-square"></i> Record Actual Harvest Result</div>
          {status && <div className={`alert alert-${status.type}`} style={{ marginBottom: 12, fontSize: 12 }}>{status.msg}</div>}
          <div className="frow">
            <div className="fgrp">
              <label className="flabel">Actual Yield (kg/are)</label>
              <input className="finput" type="number" step="0.1" value={actualYield} onChange={e => setActualYield(e.target.value)} placeholder="e.g. 24.5" />
            </div>
            <div className="fgrp">
              <label className="flabel">Harvest Date</label>
              <input className="finput" type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveActual} disabled={saving || !actualYield} style={{ marginTop: 8 }}>
            {saving ? <div className="spin" style={{ display: "inline-block", marginRight: 8 }} /> : <><i className="bi bi-save"></i> Save Actual Result</>}
          </button>
          
          {(p.actual_yield_kg_are || actualYield) && (
            <div style={{ marginTop: 15, paddingTop: 15, borderTop: "1px solid var(--g200)", display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--s500)", textTransform: "uppercase" }}>Accuracy Gap</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--g600)" }}>
                  {Math.abs(p.yield_per_are_kg - (p.actual_yield_kg_are || actualYield)).toFixed(2)} kg/are 
                  <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 6 }}>
                    ({((1 - Math.abs(p.yield_per_are_kg - (p.actual_yield_kg_are || actualYield)) / p.yield_per_are_kg) * 100).toFixed(1)}% Accuracy)
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 30, color: "var(--g500)" }}>
                <i className="bi bi-check-circle"></i>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inputs Overview */}
      <div className="p-details-title" style={{ fontSize: 13, fontWeight: 800, color: "var(--s400)", textTransform: "uppercase", letterSpacing: ".5px", margin: "18px 0 8px" }}>Agricultural Inputs</div>
      <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        {[
          { lbl: "Target Crop", val: p.crop || p.crop_type },
          { lbl: "Sector Location", val: p.sector },
          { lbl: "Growing Season", val: p.season },
          { lbl: "Soil Type", val: p.soil_type || "N/A" },
          { lbl: "Fertilizer Applied", val: p.fertilizer_used ? "Yes" : "No" },
          { lbl: "Irrigation Support", val: p.irrigation_used ? "Yes" : "No" },
          { lbl: "Previous Crop", val: p.previous_crop || "None" }
        ].map(item => (
          <div key={item.lbl} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--s100)" }}>
            <span style={{ fontSize: 13, color: "var(--s500)" }}>{item.lbl}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--s900)" }}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* Climate Data */}
      <div className="p-details-title" style={{ fontSize: 13, fontWeight: 800, color: "var(--s400)", textTransform: "uppercase", letterSpacing: ".5px", margin: "18px 0 8px" }}>Climate Variables (at planting)</div>
      <div className="card" style={{ padding: "16px 20px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
         {[
           { lbl: "Temp", val: `${p.temperature || p.avg_temperature || "-"}°C` },
           { lbl: "Rainfall", val: `${p.rainfall || p.total_rainfall_mm || "-"}mm` },
           { lbl: "Humidity", val: `${p.humidity || p.humidity_pct || "-"}%` },
           { lbl: "Sunshine", val: `${p.sunshine || p.sunshine_hrs || "-"}h` }
         ].map(item => (
           <div key={item.lbl}>
              <div style={{ fontSize: 11, color: "var(--s500)", textTransform: "uppercase" }}>{item.lbl}</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{item.val}</div>
           </div>
         ))}
      </div>
    </div>
  );
}
