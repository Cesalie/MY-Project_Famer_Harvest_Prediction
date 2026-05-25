import React, { useState, useEffect } from 'react';
import { T, SECTORS, API_BASE, CROP_BENCH, fmtDate } from '../../constants/constants';
import Sidebar from '../../components/Common/Sidebar';
import Topbar from '../../components/Common/Topbar';
import FarmerDetailView from './FarmerDetailView';
import PredictionDetailView from './PredictionDetailView';
import SectorFarmers from './SectorFarmers';
import SectorReports from './SectorReports';

export default function SectorOfficerDashboard({ user, onLogout, lang, setLang }) {
  const t = T[lang];
  const [tab, setTab] = useState("overview");
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [selectedPred, setSelectedPred] = useState(null);
  const [underperforming, setUnderperforming] = useState([]);

  const sectorName = user.sector || "Nyamata";
  const sectorId = user.sector_id || (SECTORS.indexOf(sectorName) + 1);

  const fetchUnderperforming = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officer/underperforming-farms?sector_id=${sectorId}`);
      const data = await res.json();
      if (data.success) setUnderperforming(data.farms);
    } catch (e) {
      // Offline fallback mock data
      setUnderperforming([
        { id: "F001", name: "Cesalie Uwimpuhwe", crop_type: "Maize", sector_name: sectorName, predicted: 24.5, actual: 18.2, gap_pct: 25.7 }
      ]);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/officer-dashboard?sector=${sectorName}`)
      .then(r => r.json())
      .then(d => { 
        setDashData(d); 
        setLoading(false); 
      })
      .catch(() => {
        // Offline mock data
        setLoading(false);
        setDashData({
          farmer_count: 8,
          crop_data: { Maize: { avg_yield_kg_are: 23.4 }, Beans: { avg_yield_kg_are: 12.1 }, Rice: { avg_yield_kg_are: 35.8 } },
          recent_preds: [
            { id: "PRED-9381A", farmer_id: "F001", crop: "Maize", sector: sectorName, yield_per_are_kg: 24.5, total_yield_kg: 612.5, timestamp: new Date().toISOString() }
          ],
          seasons: [
            { season: "Season A", avg_yield: 22.8, count: 5 },
            { season: "Season B", avg_yield: 21.2, count: 3 }
          ]
        });
      });

    fetchUnderperforming();
  }, [user.id, sectorName]);

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
                <div className="m-stat-icon-web" style={{ background: "#dcfce7", color: "#16a34a" }}>
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="m-stat-info-web">
                  <span className="m-stat-lbl-web">{lang === "en" ? "Total Sector Farmers" : "Abahinzi bose ba Segiteri"}</span>
                  <span className="m-stat-val-web">{(dashData?.farmer_count || 0)}</span>
                </div>
                <button className="m-stat-action-web" onClick={() => setTab("sectors")}>
                  {lang === "en" ? "Manage" : "Cunga"} <i className="bi bi-arrow-right"></i>
                </button>
              </div>

              <div className="modern-stat-card-web">
                <div className="m-stat-icon-web" style={{ background: "#fef3c7", color: "#d97706" }}>
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <div className="m-stat-info-web">
                  <span className="m-stat-lbl-web">{lang === "en" ? "Average Yield" : "Umusaruro ugereranyije"}</span>
                  <span className="m-stat-val-web">23.8 <small>kg/are</small></span>
                </div>
              </div>

              <div className="modern-stat-card-web">
                <div className="m-stat-icon-web" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div className="m-stat-info-web">
                  <span className="m-stat-lbl-web">{lang === "en" ? "Underperforming" : "Abari munsi"}</span>
                  <span className="m-stat-val-web">{underperforming.length} <small>farms</small></span>
                </div>
              </div>
            </div>

            <div className="modern-grid-layout-web">
              <div className="modern-col-left">
                <div className="modern-section-web">
                  <div className="section-header-web">
                    <h3 className="section-title-web"><i className="bi bi-bar-chart-fill"></i> {lang === "en" ? "Crop Performance" : "Umusaruro w'Ibihingwa"}</h3>
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
                    <h3 className="section-title-web"><i className="bi bi-calendar-check-fill"></i> {t.seasonPerf}</h3>
                  </div>
                  <div className="modern-card-web">
                    {dashData?.seasons?.map(s => (
                      <div key={s.season} className="modern-season-row">
                        <div className="m-season-info">
                          <span className="m-season-name">{s.season}</span>
                          <span className="m-season-yield">{s.avg_yield} kg/are</span>
                        </div>
                        <div className="m-season-meta">
                          <span>{s.count} predictions made</span>
                          <span className="m-season-trend up"><i className="bi bi-caret-up-fill"></i> +2.4%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modern-col-right">
                <div className="modern-section-web">
                  <div className="section-header-web">
                    <h3 className="section-title-web"><i className="bi bi-clock-history"></i> Recent Predictions</h3>
                  </div>
                  <div className="modern-list-web">
                    {dashData?.recent_preds?.slice(0, 6).map((p, i) => (
                      <div key={i} className="modern-list-item-web" onClick={() => setSelectedPred(p)}>
                        <div className="m-item-icon-web">
                          <i className="bi bi-file-earmark-text"></i>
                        </div>
                        <div className="m-item-content-web">
                          <span className="m-item-title-web">{p.farmer_id} · {p.crop}</span>
                          <span className="m-item-sub-web">{fmtDate(p.timestamp)}</span>
                        </div>
                        <div className="m-item-val-web">{p.yield_per_are_kg} <small>kg/a</small></div>
                      </div>
                    ))}
                  </div>
                </div>

                {underperforming.length > 0 && (
                  <div className="modern-section-web">
                    <div className="section-header-web">
                      <h3 className="section-title-web" style={{ color: "#dc2626" }}><i className="bi bi-flag-fill"></i> High Alert Farms</h3>
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
          <SectorFarmers 
            sectorName={sectorName} 
            sectorId={sectorId} 
            setSelectedFarmerId={setSelectedFarmerId} 
            lang={lang} 
          />
        );

      case "reports":
        return (
          <SectorReports 
            user={user} 
            dashData={dashData} 
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
                <span className="dash-header-icon"><i className="bi bi-building"></i></span>
                <div className="dash-header-text">
                  <h1 className="dash-title">{sectorName} {lang === "en" ? "Dashboard" : "Incumbane"}</h1>
                  <p className="dash-subtitle">{fmtDate(new Date())}</p>
                </div>
              </div>
            } 
            onBack={selectedPred ? () => setSelectedPred(null) : (selectedFarmerId ? () => setSelectedFarmerId(null) : null)} 
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
            <div className="modern-welcome-card" style={{ padding: "20px 28px", marginBottom: "24px" }}>
              <div className="welcome-content">
                <h2 className="welcome-greet" style={{ fontSize: "20px" }}>
                  {t.welcome}, <span className="welcome-name">{user.name ? user.name.split(" ")[0] : "Officer"}</span>! 👋
                </h2>
                <p className="welcome-sub" style={{ marginBottom: "0", opacity: "0.8" }}>
                  {lang === "en" ? "Managing agriculture operations in" : "Gucunga ibikorwa by'ubuhinzi muri"} <strong>{sectorName}</strong>
                </p>
              </div>
              <div className="welcome-illustration" style={{ fontSize: "60px" }}>
                <i className="bi bi-shield-check"></i>
              </div>
            </div>
            
            {!selectedPred && !selectedFarmerId && (
              <div className="pill-tabs" style={{ marginBottom: 16 }}>
                {[
                  [t.overview, "overview"],
                  ["Farmers", "sectors"],
                  [t.reportsTab, "reports"]
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
