import React from 'react';
import { T, CLIMATE } from '../../constants/constants';
import Topbar from '../../components/Common/Topbar';

export default function WeatherScreen({ onNavigate, lang, setLang, user }) {
  const t = T[lang];
  const monthly = Object.entries(CLIMATE).map(([m, d]) => ({ 
    m: m.slice(0, 3), 
    rain: d.rainfall, 
    temp: d.temperature 
  }));
  const maxR = Math.max(...monthly.map(d => d.rain));

  return (
    <>
      <Topbar 
        title={<><i className="bi bi-cloud-sun"></i> {t.weatherTitle}</>} 
        sub="Bugesera District" 
        onBack={() => onNavigate("dashboard")} 
        lang={lang} 
        setLang={setLang}
      />
      <div className="scroll fade-up">
        {/* Current Season stats */}
        <div className="card card-blue" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, opacity: .8, marginBottom: 4 }}><i className="bi bi-globe"></i> Bugesera · {t.currentSeason}</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: "6px 0" }}>23.2°C <i className="bi bi-sun"></i></div>
          <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap", fontSize: 13 }}>
            <div><i className="bi bi-droplet"></i> 74% Humidity</div>
            <div><i className="bi bi-cloud-rain"></i> 78mm Rainfall</div>
            <div><i className="bi bi-sun"></i> 7.6h Sunshine</div>
          </div>
        </div>

        {/* Monthly Rainfall bar chart */}
        <div className="sec-hd"><i className="bi bi-bar-chart-line"></i> {t.monthlyRainfall}</div>
        <div className="card" style={{ marginBottom: 14 }}>
          {monthly.map(d => (
            <div key={d.m} className="bar-row">
              <div className="bar-lbl">{d.m}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.rain / maxR) * 100}%` }} /></div>
              <div className="bar-val">{d.rain} mm</div>
            </div>
          ))}
        </div>

        {/* Monthly Temperature chart */}
        <div className="sec-hd"><i className="bi bi-thermometer-half"></i> {t.monthlyTemp}</div>
        <div className="card" style={{ marginBottom: 14 }}>
          {monthly.map(d => (
            <div key={d.m} className="bar-row">
              <div className="bar-lbl">{d.m}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${((d.temp - 20) / 8) * 100}%`, background: "linear-gradient(90deg, #3b82f6, #f97316)" }} />
              </div>
              <div className="bar-val">{d.temp} °C</div>
            </div>
          ))}
        </div>

        {/* Calendar Card */}
        <div className="card" style={{ background: "var(--g50)", borderColor: "var(--g300)", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "var(--g800)", marginBottom: 10 }}>
            <i className="bi bi-flower2"></i> {t.plantingCalendar}
          </div>
          {[
            ["Season A (Oct–Jan)", "Maize, Rice — main season, +10% yields"],
            ["Season B (Mar–Jul)", "Beans, Vegetables — secondary season"],
            ["Best planting", "Oct–Nov (Season A) · Mar–Apr (Season B)"]
          ].map(([title, desc]) => (
            <div key={title} style={{ padding: "7px 0", borderBottom: "1px solid var(--g200)" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "var(--g800)" }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--s600)", marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
