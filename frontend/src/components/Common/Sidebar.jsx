import React from 'react';
import { T } from '../../constants/constants';

export default function Sidebar({ current, onNavigate, user, onLogout, lang, setLang }) {
  const t = T[lang];

  if (!user) return null;

  const isFarmer = user.role === 'farmer';
  const isSector = user.role === 'sector';
  const isDistrict = user.role === 'district';

  // Render navigation links based on user role
  const renderNavLinks = () => {
    if (isFarmer) {
      const navItems = [
        { id: "dashboard", icon: <i className="bi bi-house"></i>, label: t.home },
        { id: "predict", icon: <i className="bi bi-tree"></i>, label: t.predict },
        { id: "history", icon: <i className="bi bi-bar-chart-line"></i>, label: t.history },
        { id: "weather", icon: <i className="bi bi-cloud-sun"></i>, label: t.weatherTitle || "Weather" },
        { id: "tips", icon: <i className="bi bi-book"></i>, label: t.tipsTitle || "Tips" },
        { id: "notifications", icon: <i className="bi bi-bell"></i>, label: t.districtAlerts || "Alerts" },
      ];
      return (
        <>
          <div className="sn-section">Navigation</div>
          {navItems.map(item => (
            <button key={item.id} className={`sn-item ${current === item.id ? "act" : ""}`} onClick={() => onNavigate(item.id)}>
              <span className="sn-icon">{item.icon}</span>
              <span className="sn-label">{item.label}</span>
              {current === item.id && <span className="sn-badge">●</span>}
            </button>
          ))}
          <div className="sn-section" style={{ marginTop: 8 }}>Account</div>
          <button className={`sn-item ${current === "profile" ? "act" : ""}`} onClick={() => onNavigate("profile")}>
            <span className="sn-icon"><i className="bi bi-person"></i></span>
            <span className="sn-label">{t.myProfile || "Profile"}</span>
          </button>
        </>
      );
    } else {
      // Officer roles
      const officerItems = isSector ? [
        { id: "overview",     icon: <i className="bi bi-speedometer2"></i>,      label: t.overview },
        { id: "farmers",      icon: <i className="bi bi-people"></i>,             label: lang === "en" ? "Farmers" : "Abahinzi" },
        { id: "predictions",  icon: <i className="bi bi-clipboard2-data"></i>,    label: lang === "en" ? "Predictions" : "Ibisobanuro" },
        { id: "reports",      icon: <i className="bi bi-file-earmark-text"></i>,  label: t.reportsTab },
      ] : [
        { id: "overview", icon: <i className="bi bi-bar-chart-line"></i>, label: t.overview },
        { id: "sectors",  icon: <i className="bi bi-geo-alt"></i>,        label: t.sectorsTab },
        { id: "reports",  icon: <i className="bi bi-file-earmark-text"></i>, label: t.reportsTab },
      ];

      if (isDistrict) {
        officerItems.push({ id: "admin", icon: <i className="bi bi-person-plus"></i>, label: t.registerTab || "Admin" });
      }

      return (
        <>
          <div className="sn-section">Dashboard</div>
          {officerItems.map(item => (
            <button key={item.id} className={`sn-item ${current === item.id ? "act" : ""}`} onClick={() => onNavigate(item.id)}>
              <span className="sn-icon">{item.icon}</span>
              <span className="sn-label">{item.label}</span>
              {current === item.id && <span className="sn-badge">●</span>}
            </button>
          ))}
        </>
      );
    }
  };

  const getLogoDetails = () => {
    return {
      icon: "🌾",
      title: lang === "en" ? "Harvest Predictor" : "Teganya Imyaka",
      sub: "Bugesera District · Rwanda"
    };
  };

  const logo = getLogoDetails();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">{logo.icon}</div>
        <div className="sidebar-logo-name">{logo.title}</div>
        <div className="sidebar-logo-sub">{logo.sub}</div>
      </div>
      <nav className="sidebar-nav">
        {renderNavLinks()}
        <div className="sn-section" style={{ marginTop: 8 }}>Settings</div>
        <button className="sn-item" onClick={() => setLang(l => l === "en" ? "rw" : "en")}>
          <span className="sn-icon">{lang === "en" ? "EN" : "RW"}</span>
          <span className="sn-label">{lang === "en" ? "Kinyarwanda" : "English"}</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title={t.logout}>
          <div className="sidebar-avatar">
            {isFarmer ? <><i className="bi bi-person"></i>‍<i className="bi bi-tree"></i></> : <i className="bi bi-building"></i>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.name || user.full_name}</div>
            <div className="sidebar-user-role"><i className="bi bi-box-arrow-right"></i> {t.logout}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
