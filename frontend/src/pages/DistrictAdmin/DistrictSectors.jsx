import React, { useState, useEffect } from 'react';
import { T, API_BASE, SECTORS, fmtDate } from '../../constants/constants';

export default function DistrictSectors({
  selectedSectorId,
  setSelectedSectorId,
  setSelectedFarmerId,
  setSelectedPred,
  lang,
  user
}) {
  const t = T[lang];
  const [sectorData, setSectorData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSectorDetails = async (sid) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/sector-details/${sid}`);
      const data = await res.json();
      if (data.success) {
        setSectorData(data.data);
      }
    } catch (e) {
      // Offline fallback
      setSectorData({
        sector: { sector_name: SECTORS[sid - 1] },
        farmers: [
          { id: "F001", farmer_id: "F001", full_name: "Cesalie Uwimpuhwe", email: "cesalie@gmail.com", phone: "+250788111222" },
          { id: "F002", farmer_id: "F002", full_name: "Jean Bosco", email: "bosco@gmail.com", phone: "+250788333444" }
        ],
        predictions: [
          { prediction_id: "P001", farmer_name: "Cesalie Uwimpuhwe", crop_type: "Maize", yield_per_are_kg: 24.5, created_at: new Date().toISOString() },
          { prediction_id: "P002", farmer_name: "Jean Bosco", crop_type: "Beans", yield_per_are_kg: 12.8, created_at: new Date().toISOString() }
        ]
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedSectorId) {
      fetchSectorDetails(selectedSectorId);
    }
  }, [selectedSectorId]);

  if (selectedSectorId) {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: 50, color: "var(--s400)" }}>
          <div style={{ fontSize: 40, marginBottom: 15 }}><i className="bi bi-arrow-repeat spin"></i></div>
          <div style={{ fontWeight: 700 }}>Loading Sector Details...</div>
          <div style={{ fontSize: 12, marginTop: 5 }}>Connecting to Bugesera database</div>
        </div>
      );
    }

    return (
      <div className="fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div className="topbar-brand"><i className="bi bi-geo-alt"></i> {sectorData?.sector?.sector_name} Sector</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Detailed view of farming activities</div>
          </div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 15px" }} onClick={() => setSelectedSectorId(null)}>
            <i className="bi bi-arrow-left"></i> Back to Sectors
          </button>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 20 }}>
          <div className="stat-box">
            <div className="stat-val" style={{ color: "var(--g600)" }}>{sectorData?.farmers?.length || 0}</div>
            <div className="stat-lbl">Registered Farmers</div>
          </div>
          <div className="stat-box">
            <div className="stat-val" style={{ color: "var(--s600)" }}>{sectorData?.predictions?.length || 0}</div>
            <div className="stat-lbl">Total Predictions</div>
          </div>
        </div>

        <div className="sec-hd"><i className="bi bi-people"></i> Farmers in {sectorData?.sector?.sector_name}</div>
        <div className="card" style={{ marginBottom: 25 }}>
          {sectorData?.farmers?.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--s400)" }}>No farmers registered in this sector.</div>
          ) : (
            sectorData?.farmers?.map(f => (
              <div 
                key={f.id} 
                className="hitem" 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer" }} 
                onClick={() => setSelectedFarmerId(f.farmer_id || f.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar-sm"><i className="bi bi-person"></i></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{f.full_name || f.name}</div>
                    <div style={{ fontSize: 11, color: "var(--s500)" }}>{f.farmer_id || f.id} · {f.email || f.phone}</div>
                  </div>
                </div>
                <button 
                  className="btn btn-ghost" 
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} 
                  onClick={(e) => { e.stopPropagation(); setSelectedFarmerId(f.farmer_id || f.id); }}
                >
                  View Profile
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sec-hd"><i className="bi bi-clipboard-data"></i> Predictions in {sectorData?.sector?.sector_name}</div>
        <div className="card">
          {sectorData?.predictions?.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--s400)" }}>No predictions made in this sector yet.</div>
          ) : (
            sectorData?.predictions?.map(p => (
              <div 
                key={p.prediction_id || p.id} 
                className="hitem" 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer" }} 
                onClick={() => setSelectedPred(p)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.farmer_name || p.farmer_id} — {p.crop_type || p.crop}</div>
                    <div style={{ fontSize: 11, color: "var(--s500)" }}>{fmtDate(p.created_at || p.timestamp)}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "var(--g700)", fontSize: 13 }}>{p.yield_per_are_kg} kg/a</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sec-hd"><i className="bi bi-geo-alt"></i> Select a Sector to View Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 15 }}>
        {SECTORS.map((sec, idx) => (
          <div 
            key={sec} 
            className="card hvr" 
            style={{ padding: 20, cursor: "pointer", transition: "all 0.2s" }} 
            onClick={() => setSelectedSectorId(idx + 1)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="avatar-sm" style={{ background: "var(--s50)", color: "var(--s600)" }}><i className="bi bi-geo-alt"></i></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{sec}</div>
                <div style={{ fontSize: 11, color: "var(--s500)" }}>Drill-down data <i className="bi bi-arrow-right"></i></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
