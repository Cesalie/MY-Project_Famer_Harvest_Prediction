import React from 'react';
import { T, fmtDate } from '../../constants/constants';
import Topbar from '../../components/Common/Topbar';
import CropIcon from '../../components/Common/CropIcon';
import { HiOutlineSquares2X2, HiOutlineBell, HiOutlineChevronRight, HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlineAddCircle, MdOutlineHistory, MdOutlineWbSunny, MdOutlineLightbulb, MdOutlineArrowForwardIos } from "react-icons/md";
import { BiFolderOpen } from "react-icons/bi";

export default function FarmerDashboard({ user, onNavigate, onResult, history = [], lang, setLang, notifications = [] }) {
  const t = T[lang];
  const farmHa = user.farm_size_ha || 0;
  const farmAre = user.farm_size_are || Math.round(farmHa * 100);

  return (
    <>
      <Topbar 
        title={
          <div className="dash-header-clean">
            <span className="dash-header-icon"><HiOutlineSquares2X2 /></span>
            <div className="dash-header-text">
              <h1 className="dash-title">{lang === "en" ? "Farmer Dashboard" : "Ibiranga Umuhinzi"}</h1>
              <p className="dash-subtitle">{fmtDate(new Date())}</p>
            </div>
          </div>
        } 
        onBack={null} 
        lang={lang} 
        setLang={setLang}
        actions={
          <div className="dash-actions">
            <button className="dash-action-btn" onClick={() => onNavigate("notifications")} style={{ position: "relative" }}>
              <HiOutlineBell />
              {notifications.length > 0 && <span className="notif-dot"></span>}
            </button>
            <button className="dash-action-btn profile-trigger" onClick={() => onNavigate("profile")}>
              <div className="dash-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "F"}
              </div>
            </button>
          </div>
        }
      />
      <div className="scroll fade-up dash-content">
        {/* Modern Welcome Section */}
        <div className="modern-welcome-card">
          <div className="welcome-content">
            <h2 className="welcome-greet">
              {t.welcome}, <span className="welcome-name">{user.name ? user.name.split(" ")[0] : "Farmer"}</span>! 👋
            </h2>
            <p className="welcome-sub">
              <i className="bi bi-geo-alt-fill"></i> {user.sector || "Nyamata"} Sector · {t.farmerId}: {user.id || user.farmer_id}
            </p>
            <div className="welcome-stats">
              <div className="w-stat">
                <span className="w-stat-val">{farmHa}</span>
                <span className="w-stat-lbl">{t.totalFarmSize} (ha)</span>
              </div>
              <div className="w-stat-divider"></div>
              <div className="w-stat">
                <span className="w-stat-val">{history.length}</span>
                <span className="w-stat-lbl">{t.predictions}</span>
              </div>
            </div>
          </div>
          <div className="welcome-illustration">
            <i className="bi bi-sun-fill"></i>
          </div>
        </div>

        {/* Action Grid */}
        <div className="modern-action-grid">
          {[
            { icon: <MdOutlineAddCircle />, label: t.newPred, desc: lang === "en" ? "Start new prediction" : "Teganya isarura", color: "#10b981", target: "predict" },
            { icon: <MdOutlineHistory />, label: lang === "en" ? "History" : "Amateka", desc: t.predHistory, color: "#3b82f6", target: "history" },
            { icon: <MdOutlineWbSunny />, label: lang === "en" ? "Weather" : "Ikirere", desc: "Local forecast", color: "#f59e0b", target: "weather" },
            { icon: <MdOutlineLightbulb />, label: lang === "en" ? "Advice" : "Inama", desc: "Agronomic tips", color: "#8b5cf6", target: "tips" }
          ].map(item => (
            <button 
              key={item.target} 
              className="modern-action-card"
              onClick={() => onNavigate(item.target)}
              style={{"--accent-color": item.color}}
            >
              <div className="m-card-icon" style={{backgroundColor: `${item.color}15`, color: item.color}}>
                {item.icon}
              </div>
              <div className="m-card-info">
                <span className="m-card-label">{item.label}</span>
                <span className="m-card-desc">{item.desc}</span>
              </div>
              <HiOutlineChevronRight className="m-card-arrow" />
            </button>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="section-container">
          <div className="section-header">
            <h3 className="section-title"><HiOutlineSparkles /> {t.recentPredictions}</h3>
            <button className="section-link" onClick={() => onNavigate("history")}>{lang === "en" ? "View All" : "Byose"}</button>
          </div>
          
          {history.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon"><BiFolderOpen /></div>
              <p>{lang === "en" ? "No predictions yet. Let's start one!" : "Nta bisobanuro bihari. Reka dutangire!"}</p>
              <button className="btn-start-mini" onClick={() => onNavigate("predict")}>{t.newPred}</button>
            </div>
          ) : (
            <div className="recent-list">
              {history.slice(0, 3).map((p, i) => (
                <div key={i} className="modern-history-item" onClick={() => onResult(p)}>
                  <div className="mh-icon">
                    <CropIcon name={p.crop} size={24} />
                  </div>
                  <div className="mh-info">
                    <span className="mh-crop">{p.crop}</span>
                    <span className="mh-date">{fmtDate(p.timestamp)} · {p.sector}</span>
                  </div>
                  <div className="mh-yield">
                    <span className="mh-val">{p.yield_per_are_kg}</span>
                    <span className="mh-unit">kg/are</span>
                  </div>
                  <div className="mh-arrow"><MdOutlineArrowForwardIos /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
