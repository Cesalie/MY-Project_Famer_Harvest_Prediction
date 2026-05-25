import React, { useState, useEffect } from 'react';
import { T, API_BASE, CROP_BENCH, fmtDate } from '../../constants/constants';
import Sidebar from '../../components/Common/Sidebar';
import Topbar from '../../components/Common/Topbar';
import PredictionDetailView from '../SectorOfficer/PredictionDetailView';
import FarmerDetailView from '../SectorOfficer/FarmerDetailView';
import DistrictSectors from './DistrictSectors';
import DistrictReports from './DistrictReports';
import DistrictAdminPanel from './DistrictAdminPanel';

export default function DistrictAdminDashboard({ user, onLogout, lang, setLang }) {
  const t = T[lang];
  const [tab, setTab] = useState("overview");
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [selectedPred, setSelectedPred] = useState(null);
  const [selectedSectorId, setSelectedSectorId] = useState(null);
  const [underperforming, setUnderperforming] = useState([]);

  const fetchUnderperforming = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officer/underperforming-farms`);
      const data = await res.json();
      if (data.success) setUnderperforming(data.farms);
    } catch (e) {
      setUnderperforming([
        { id: "F001", name: "Cesalie Uwimpuhwe", crop_type: "Maize", sector_name: "Nyamata", predicted: 24.5, actual: 18.2, gap_pct: 25.7 }
      ]);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/officer-dashboard`)
      .then(r => r.json())
      .then(d => { 
        setDashData(d); 
        setLoading(false); 
      })
      .catch(() => {
        setLoading(false);
        setDashData({
          farmer_count: 24,
          crop_data: { Maize: { avg_yield_kg_are: 23.8 }, Beans: { avg_yield_kg_are: 11.9 }, Rice: { avg_yield_kg_are: 36.4 } },
          recent_preds: [
            { id: "PRED-9381A", farmer_id: "F001", crop: "Maize", sector: "Nyamata", yield_per_are_kg: 24.5, total_yield_kg: 612.5, timestamp: new Date().toISOString() }
          ],
          seasons: [
            { season: "Season A", avg_yield: 23.5, count: 12 },
            { season: "Season B", avg_yield: 22.1, count: 8 }
          ]
        });
      });

    fetchUnderperforming();
  }, [user.id]);

  const renderContent = () => {
    if (selectedPred) {
      return (
        <PredictionDetailView 
          prediction={selectedPred} 
          onBack={() => setSelectedPred(null)} 
          lang={lang} 
          user={user}
        />
      );
    }

    if (selectedFarmerId) {
      return (
        <FarmerDetailView 
          farmerId={selectedFarmerId} 
          onBack={() => setSelectedFarmerId(null)} 
          lang={lang} 
          setLang={setLang}
          setSelectedPred={setSelectedPred}
          officer={user}
        />
      );
    }

    switch (tab) {
      case "overview":
        return (
          <div className="modern-dash-overview">
            <div className="modern-stat-grid-web">
              <div className="modern-stat-card-web">
                <div className="m-stat-icon-web" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                  <i className="bi bi-houses-fill"></i>
                </div>
                <div className="m-stat-info-web">
                  <span className="m-stat-lbl-web">{lang === "en" ? "Total Sectors" : "Imirenge yose"}</span>
                  <span className="m-stat-val-web">15</span>
                </div>
                <button className="m-stat-action-web" onClick={() => setTab("sectors")}>
                  {lang === "en" ? "Explore" : "Sura"} <i className="bi bi-arrow-right"></i>
                </button>
              </div>

              <div className="modern-stat-card-web">
                <div className="m-stat-icon-web" style={{ background: "#dcfce7", color: "#16a34a" }}>
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="m-stat-info-web">
                  <span className="m-stat-lbl-web">{lang === "en" ? "Total Farmers" : "Abahinzi bose"}</span>
                  <span className="m-stat-val-web">{(dashData?.farmer_count || 0)}</span>
                </div>
              </div>

              <div className="modern-stat-card-web">
                <div className="m-stat-icon-web" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  <i className="bi bi-bell-fill"></i>
                </div>
                <div className="m-stat-info-web">
                  <span className="m-stat-lbl-web">{lang === "en" ? "Active Alerts" : "Impururu ziriho"}</span>
                  <span className="m-stat-val-web">3</span>
                </div>
              </div>
            </div>

            <div className="modern-grid-layout-web">
              <div className="modern-col-left">
                <div className="modern-section-web">
                  <div className="section-header-web">
                    <h3 className="section-title-web"><i className="bi bi-bar-chart-line-fill"></i> {t.districtYield}</h3>
                  </div>
                  <div className="modern-card-web">
                    {Object.entries(dashData?.crop_data || CROP_BENCH).map(([crop, data]) => {
                      const val = typeof data === "object" ? data.avg_yield_kg_are : data;
                      const col = { Maize: "#f59e0b", Beans: "#22c55e", Rice: "#3b82f6" }[crop] || "#22c55e";
                      const pct = Math.min((val / 50) * 100, 100);
                      return (
                        <div key={crop} className="modern-bar-row">
                          <div className="m-bar-info">
                            <span className="m-bar-name">{crop}</span>
                            <span className="m-bar-val">{val?.toFixed?.(1) || val} kg/are</span>
                          </div>
                          <div className="m-bar-track">
                            <div className="m-bar-fill" style={{ width: `${pct}%`, background: col }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="modern-section-web">
                  <div className="section-header-web">
                    <h3 className="section-title-web"><i className="bi bi-exclamation-triangle-fill"></i> {t.districtAlerts}</h3>
                  </div>
                  <div className="modern-list-web">
                    {[
                      { sev: "high", msg: "Drought risk in Rweru & Musenyi — rainfall <35mm", icon: "bi-sun" },
                      { sev: "med", msg: "Fall Armyworm alert — 3 Gashora farms report infestation", icon: "bi-bug" },
                      { sev: "low", msg: "Rice blast disease risk in Ntarama wetlands", icon: "bi-water" }
                    ].map((alert, i) => (
                      <div key={i} className={`modern-alert-item-web ${alert.sev}`}>
                        <i className={`bi ${alert.icon}`}></i>
                        <span>{alert.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modern-col-right">
                <div className="modern-section-web">
                  <div className="section-header-web">
                    <h3 className="section-title-web"><i className="bi bi-clock-history"></i> District Recent Predictions</h3>
                  </div>
                  <div className="modern-list-web">
                    {dashData?.recent_preds?.slice(0, 6).map((p, i) => (
                      <div key={i} className="modern-list-item-web" onClick={() => setSelectedPred(p)}>
                        <div className="m-item-icon-web">
                          <i className="bi bi-clipboard2-pulse"></i>
                        </div>
                        <div className="m-item-content-web">
                          <span className="m-item-title-web">{p.farmer_id} · {p.crop}</span>
                          <span className="m-item-sub-web">{p.sector} · {fmtDate(p.timestamp)}</span>
                        </div>
                        <div className="m-item-val-web">{p.yield_per_are_kg} <small>kg/a</small></div>
                      </div>
                    ))}
                  </div>
                </div>

                {underperforming.length > 0 && (
                  <div className="modern-section-web">
                    <div className="section-header-web">
                      <h3 className="section-title-web" style={{ color: "#dc2626" }}><i className="bi bi-flag-fill"></i> District High Alert Farms</h3>
                    </div>
                    <div className="modern-list-web">
                      {underperforming.map((f, i) => (
                        <div key={i} className="modern-list-item-web alert" onClick={() => setSelectedFarmerId(f.farmer_id || f.id)}>
                          <div className="m-item-content-web">
                            <span className="m-item-title-web">{f.name}</span>
                            <span className="m-item-sub-web">{f.crop_type} · {f.sector_name}</span>
                          </div>
                          <div className="m-item-badge-web">-{f.gap_pct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "sectors":
        return (
          <DistrictSectors 
            selectedSectorId={selectedSectorId} 
            setSelectedSectorId={setSelectedSectorId}
            setSelectedFarmerId={setSelectedFarmerId}
            setSelectedPred={setSelectedPred}
            lang={lang} 
            user={user}
          />
        );

      case "reports":
        return (
          <DistrictReports 
            user={user}
            lang={lang} 
          />
        );

      case "admin":
        return (
          <DistrictAdminPanel 
            user={user}
            lang={lang} 
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="web-layout">
      <Sidebar 
        current={selectedPred ? "history" : (selectedFarmerId ? "sectors" : tab)} 
        onNavigate={(key) => {
          setTab(key);
          setSelectedPred(null);
          setSelectedFarmerId(null);
          setSelectedSectorId(null);
        }} 
        user={user} 
        onLogout={onLogout} 
        lang={lang} 
        setLang={setLang} 
      />
      <div className="main-content">
        <div className="shell">
          <Topbar 
            title={
              <div className="dash-header-clean">
                <span className="dash-header-icon"><i className="bi bi-buildings"></i></span>
                <div className="dash-header-text">
                  <h1 className="dash-title">{lang === "en" ? "District Dashboard" : "Incumbane y'Akarere"}</h1>
                  <p className="dash-subtitle">{fmtDate(new Date())}</p>
                </div>
              </div>
            } 
            onBack={selectedPred ? () => setSelectedPred(null) : (selectedFarmerId ? () => setSelectedFarmerId(null) : (selectedSectorId ? () => setSelectedSectorId(null) : null))} 
            lang={lang} 
            setLang={setLang}
            actions={
              <div className="dash-actions">
                <button className="dash-action-btn profile-trigger" onClick={() => onLogout()} title={t.logout}>
                  <i className="bi bi-box-arrow-right"></i>
                </button>
              </div>
            }
          />
          <div className="scroll fade-up">
            <div className="modern-welcome-card" style={{ padding: "20px 28px", marginBottom: "24px", background: "linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)" }}>
              <div className="welcome-content">
                <h2 className="welcome-greet" style={{ fontSize: "20px" }}>
                  {t.welcome}, <span className="welcome-name" style={{ color: "#93c5fd" }}>{user.name ? user.name.split(" ")[0] : "Admin"}</span>! 👋
                </h2>
                <p className="welcome-sub" style={{ marginBottom: "0", opacity: "0.8" }}>
                  {lang === "en" ? "Overseeing District-wide agriculture in" : "Gucunga ubuhinzi mu Karere ka"} <strong>Bugesera</strong>
                </p>
              </div>
              <div className="welcome-illustration" style={{ fontSize: "60px" }}>
                <i className="bi bi-bank"></i>
              </div>
            </div>
            
            {!selectedPred && !selectedFarmerId && !selectedSectorId && (
              <div className="pill-tabs" style={{ marginBottom: 16 }}>
                {[
                  [t.overview, "overview"],
                  [t.sectorsTab, "sectors"],
                  [t.reportsTab, "reports"],
                  [t.registerTab || "Admin", "admin"]
                ].map(([label, key]) => (
                  <button 
                    key={key} 
                    className={`pill-tab ${tab === key ? "act" : ""}`} 
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
