import React, { useState, useEffect } from 'react';
import { T, API_BASE } from '../../constants/constants';

export default function SectorFarmers({ sectorName, sectorId, setSelectedFarmerId, lang }) {
  const t = T[lang];
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/admin/sector-details/${sectorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setFarmers(data.data.farmers || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // Fallback mock local data
        setFarmers([
          { id: "F001", full_name: "Cesalie Uwimpuhwe", email: "cesalie@gmail.com", phone: "+250782001001", farm_size_are: 25 },
          { id: "F004", full_name: "Amina Uwimana", email: "amina@gmail.com", phone: "+250782004004", farm_size_are: 60 }
        ]);
      });
  }, [sectorId]);

  const filtered = farmers.filter(f => 
    f.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    f.id?.toLowerCase().includes(search.toLowerCase()) ||
    f.farmer_id?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--s900)", margin: 0 }}><i className="bi bi-geo-alt"></i> {sectorName} Sector Farmers</h3>
          <p style={{ fontSize: 11, color: "var(--s500)", margin: "2px 0 0" }}>Local sector directory</p>
        </div>
      </div>

      <input 
        className="finput" 
        placeholder="Search farmers by name or ID…" 
        value={search}
        onChange={e => setSearch(e.target.value)} 
        style={{ marginBottom: 16 }}
      />

      <div className="card" style={{ marginBottom: 25, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--s400)" }}>
            <div className="spin" style={{ margin: "0 auto 10px" }} /> Loading sector farmers...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--s400)" }}>No farmers registered in this sector matching query.</div>
        ) : (
          filtered.map(f => (
            <div 
              key={f.id || f.farmer_id} 
              className="hitem" 
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--s100)", cursor: "pointer" }} 
              onClick={() => setSelectedFarmerId(f.farmer_id || f.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="avatar-sm" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--g100)", display: "flex", alignItems: "center", justify: "center", fontSize: 18 }}>
                  <i className="bi bi-person"></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--s900)" }}>{f.full_name || f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--s500)", marginTop: 2 }}>{f.farmer_id || f.id} · {f.email || f.phone}</div>
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                style={{ width: "auto", padding: "4px 10px", fontSize: 11, borderRadius: 6 }} 
                onClick={(e) => { e.stopPropagation(); setSelectedFarmerId(f.farmer_id || f.id); }}
              >
                View Profile
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
