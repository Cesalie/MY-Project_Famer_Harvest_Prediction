import React from 'react';
import { T } from '../../constants/constants';

export default function ClimateCard({ climate, month, season, lang }) {
  const t = T[lang];

  if (!climate) return (
    <div className="climate-pending">
      <div style={{ fontSize: 32, marginBottom: 8, color: "var(--blue)" }}>
        <i className="bi bi-cloud-sun"></i>
      </div>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--s800)" }}>{t.autoClimateTitle}</div>
      <div style={{ fontSize: 13, opacity: .7, color: "var(--s600)" }}>{t.selectMonthFirst}</div>
    </div>
  );

  return (
    <div className="climate-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="climate-badge">
            <i className="bi bi-magic"></i> {t.autoClimateTitle}
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{month} · {season}</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{t.autoClimateNote}</div>
        </div>
        <div style={{ fontSize: 40, opacity: 0.9 }}>
          <i className="bi bi-sun-fill"></i>
        </div>
      </div>
      <div className="climate-grid">
        {[
          [climate.temperature + "°C",          <><i className="bi bi-thermometer-half"></i> Temp</>],
          [climate.rainfall + "mm",             <><i className="bi bi-cloud-rain"></i> Rain</>],
          [climate.humidity + "%",              <><i className="bi bi-droplet-half"></i> Humid</>],
          [climate.sunshine + "h",              <><i className="bi bi-sun"></i> Sun</>],
          [climate.windSpeed + " km/h",         <><i className="bi bi-wind"></i> Wind</>],
          [climate.evapotranspiration + " mm",  <><i className="bi bi-water"></i> ET</>],
        ].map(([val, lbl], i) => (
          <div key={i} className="climate-item">
            <div className="climate-val">{val}</div>
            <div className="climate-lbl">{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
