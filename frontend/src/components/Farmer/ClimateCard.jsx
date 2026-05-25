import React from 'react';
import { T } from '../../constants/constants';
import { BiDroplet, BiSun, BiWind, BiCloudRain } from "react-icons/bi";
import { MdOutlineWbSunny, MdOutlineAutoFixHigh } from "react-icons/md";
import { WiRaindrops, WiThermometer } from "react-icons/wi";

export default function ClimateCard({ climate, month, season, lang }) {
  const t = T[lang];

  if (!climate) return (
    <div className="climate-pending">
      <div style={{ fontSize: 32, marginBottom: 8, color: "var(--blue)" }}><MdOutlineWbSunny /></div>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--s800)" }}>{t.autoClimateTitle}</div>
      <div style={{ fontSize: 13, opacity: .7, color: "var(--s600)" }}>{t.selectMonthFirst}</div>
    </div>
  );

  return (
    <div className="climate-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="climate-badge"><MdOutlineAutoFixHigh /> {t.autoClimateTitle}</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{month} · {season}</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{t.autoClimateNote}</div>
        </div>
        <div style={{ fontSize: 40, opacity: 0.9 }}><MdOutlineWbSunny /></div>
      </div>
      <div className="climate-grid">
        {[
          [climate.temperature + "°C", (<><WiThermometer /> Temp</>)],
          [climate.rainfall + "mm", (<><BiCloudRain /> Rain</>)],
          [climate.humidity + "%", (<><BiDroplet /> Humid</>)],
          [climate.sunshine + "h", (<><BiSun /> Sun</>)],
          [climate.windSpeed + " km/h", (<><BiWind /> Wind</>)],
          [climate.evapotranspiration + " mm", (<><WiRaindrops /> ET</>)]
        ].map(([val, lbl], index) => (
          <div key={index} className="climate-item">
            <div className="climate-val">{val}</div>
            <div className="climate-lbl">{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
