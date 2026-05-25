import React from 'react';
import { T } from '../../constants/constants';

export default function BottomNav({ current, onNavigate, lang, user }) {
  const t = T[lang];

  if (!user) return null;

  let items = [];
  if (user.role === "farmer") {
    items = [
      { id: "dashboard", icon: <i className="bi bi-house"></i>, label: t.home },
      { id: "predict",   icon: <i className="bi bi-tree"></i>, label: t.predict },
      { id: "history",   icon: <i className="bi bi-bar-chart-line"></i>, label: t.history },
      { id: "weather",   icon: <i className="bi bi-cloud-sun"></i>, label: t.weatherTitle || "Weather" },
      { id: "tips",      icon: <i className="bi bi-book"></i>, label: t.tipsTitle || "Tips" },
    ];
  } else {
    // Sector or District officer roles
    items = [
      { id: "overview", icon: <i className="bi bi-bar-chart-line"></i>, label: t.overview || "Overview" },
      { id: "sectors",  icon: <i className="bi bi-geo-alt"></i>, label: t.sectorsTab || "Sectors" },
      { id: "reports",  icon: <i className="bi bi-file-earmark-text"></i>, label: t.reportsTab || "Reports" },
    ];
    if (user.role === "district") {
      items.push({ id: "admin", icon: <i className="bi bi-person-plus"></i>, label: t.registerTab || "Admin" });
    }
  }

  return (
    <nav className="bottom-nav">
      {items.map(it => (
        <button key={it.id} className={`bn-item ${current === it.id ? "act" : ""}`} onClick={() => onNavigate(it.id)}>
          <span className="bn-icon">{it.icon}</span>
          <span className="bn-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
