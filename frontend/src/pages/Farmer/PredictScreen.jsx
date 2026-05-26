import React, { useState, useCallback } from 'react';
import { 
  T, SECTORS, SEASONS, CROPS, SOILS, CROP_BENCH, 
  SECTOR_SOIL_TYPE, SOIL_DISPLAY, API_BASE, 
  getClimate, getSeasonFromMonth, simulateOffline, buildRecs 
} from '../../constants/constants';
import Topbar from '../../components/Common/Topbar';
import ClimateCard from '../../components/Farmer/ClimateCard';
import CropIcon from '../../components/Common/CropIcon';
import { HiArrowLeft, HiCheck, HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlineAgriculture, MdOutlineLocationOn, MdOutlineCalendarToday, MdOutlineBadge, MdOutlineInfo, MdOutlineWbSunny, MdWifiOff } from "react-icons/md";
import { FaRulerCombined, FaCheckCircle, FaToggleOn, FaPencilAlt, FaMagic } from "react-icons/fa";
import { BiCalendar, BiDroplet, BiWater, BiMap } from "react-icons/bi";

export default function PredictScreen({ user, onNavigate, onResult, onSave, history = [], lang, setLang }) {
  const t = T[lang];
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [form, setForm] = useState({
    crop: "", 
    sector: user.sector || "", 
    season: "", 
    month: "",
    plantingDate: "", 
    areaPlantedHa: String(user.farm_size_ha || ""),
    soil: SECTOR_SOIL_TYPE[user.sector || ""] || "Clay Soil",
    farmerCategory: "Medium", 
    previousCrop: "Beans", 
    laborAvail: "Adequate",
    pestPressure: "Low", 
    extensionAccess: "Yes", 
    creditAccess: "No",
    fertilizer: false, 
    irrigation: false,
  });

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  const autoClimate = (form.month && form.season) ? getClimate(form.month, form.season) : null;

  const step1Valid = form.crop && form.sector && form.season && form.month
                  && form.areaPlantedHa && form.plantingDate;

  const handleDateChange = (val) => {
    set("plantingDate", val);
    if (val) {
      const d = new Date(val);
      const mo = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"][d.getMonth()];
      set("month", mo);
      set("season", getSeasonFromMonth(mo));
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    const areaAre = Math.round(parseFloat(form.areaPlantedHa) * 100);
    const farmAre = areaAre; // area planted IS the farm size sent to model
    const clim = getClimate(form.month, form.season);
    const payload = {
      farmer_id: user.id || user.farmer_id,
      crop: form.crop,
      sector: form.sector,
      season: form.season,
      month: form.month,
      planting_date: form.plantingDate,
      farm_size: farmAre,
      area_planted: areaAre,
      farmer_category: form.farmerCategory,
      fertilizer_used: form.fertilizer ? 'Yes' : 'No',
      irrigation_used: form.irrigation ? 'Yes' : 'No',
      soil_type: form.soil,
      previous_crop: form.previousCrop || 'Beans',
      labor_availability: form.laborAvail || 'Adequate',
      pest_pressure: form.pestPressure || 'Low',
      extension_access: form.extensionAccess || 'Yes',
      credit_access: form.creditAccess || 'No',
      temperature: clim.temperature,
      rainfall: clim.rainfall,
      humidity: clim.humidity,
      sunshine: clim.sunshine,
      wind_speed: clim.windSpeed,
      evapotranspiration: clim.evapotranspiration,
    };

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setLoading(false); 
      setOffline(false);
      
      const formattedData = {
        ...data,
        id: data.id || data.prediction_id,
        crop: data.crop || form.crop,
        timestamp: data.timestamp || new Date().toISOString(),
        sector: data.sector || form.sector
      };
      
      if (onSave) await onSave(formattedData);
      onResult(formattedData); 
      onNavigate("result");
    } catch (err) {
      console.log("Prediction API error, falling back to offline:", err);
      // Offline fallback
      setOffline(true);
      const yieldPA = simulateOffline({
        crop: form.crop, 
        month: form.month, 
        season: form.season,
        farmSizeAre: areaAre, 
        areaPlantedAre: areaAre,
        fertilizer: form.fertilizer, 
        irrigation: form.irrigation, 
        soil: form.soil
      });

      const result = {
        id: `PRED-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        farmer_id: user.id || user.farmer_id,
        crop: form.crop,
        sector: form.sector,
        season: form.season,
        month: form.month,
        planting_date: form.plantingDate,
        farm_size_are: farmAre,
        farm_size_ha: parseFloat(form.areaPlantedHa),
        area_planted_are: areaAre,
        area_planted_ha: areaAre / 100,
        yield_per_are_kg: yieldPA,
        yield_per_ha_kg: Math.round(yieldPA * 100 * 10) / 10,
        total_yield_kg: Math.round(yieldPA * areaAre * 10) / 10,
        yield_range: `${Math.round(yieldPA * 0.92 * 10) / 10}–${Math.round(yieldPA * 1.08 * 10) / 10} kg/are`,
        confidence_pct: 84.8,
        model_used: "Local Simulation (API offline)",
        district_avg_kg_are: CROP_BENCH[form.crop] || 20,
        inputs: {
          temperature: clim.temperature, 
          rainfall: clim.rainfall,
          humidity: clim.humidity, 
          sunshine: clim.sunshine,
          fertilizer_used: form.fertilizer, 
          irrigation_used: form.irrigation,
          soil_type: form.soil, 
          climate_source: "auto"
        },
        recommendations: buildRecs(form.crop, yieldPA, {
          area_are: areaAre,
          history: history,
          fertilizer: form.fertilizer,
          irrigation: form.irrigation,
          soil: form.soil,
          season: form.season,
          month: form.month,
          pest: form.pestPressure || "Low",
          prevCrop: form.previousCrop || "Beans",
          sector: form.sector,
          labor: form.laborAvail || "Adequate",
          credit: form.creditAccess || "No",
          extension: form.extensionAccess || "Yes",
          plantingDate: form.plantingDate,
        }),
      };
      setLoading(false);
      onResult(result);
      if (onSave) onSave(result);
      onNavigate("result");
    }
  };

  return (
    <>
      <Topbar 
        title={
          <div className="dash-header-clean">
            <button className="back-btn-modern" onClick={() => step === 1 ? onNavigate("dashboard") : setStep(1)}>
              <HiArrowLeft />
            </button>
            <div className="dash-header-text">
              <h1 className="dash-title">{t.newPred}</h1>
              <p className="dash-subtitle">{t.stepOf} {step}/2 — {step === 1 ? t.cropLocation : t.summary}</p>
            </div>
          </div>
        }
        onBack={null}
        lang={lang} 
        setLang={setLang}
        actions={null}
      />
      
      <div className="modern-steps-container">
        <div className={`m-step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
        <div className={`m-step-line ${step >= 2 ? 'active' : ''}`}></div>
        <div className={`m-step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
      </div>

      {offline && <div className="modern-alert alert-error" style={{ margin: "0 24px 16px" }}>
        <MdWifiOff /> {t.offlineMode}
      </div>}

      <div className="scroll fade-up predict-content">
        {step === 1 ? (
          <div className="modern-form-container">
            <div className="form-section-title">
              <span className="title-icon"><MdOutlineInfo /></span>
              <h3>{t.enterFarmDetails}</h3>
            </div>

            {/* Crop selection */}
            <div className="m-fgrp">
              <label className="m-flabel">{t.selectCrop}</label>
              <div className="modern-crop-selector">
                {CROPS.map(c => (
                  <button key={c} className={`m-crop-card ${form.crop === c ? "active" : ""}`} onClick={() => set("crop", c)}>
                    <div className="m-crop-icon"><CropIcon name={c} size={32} /></div>
                    <span className="m-crop-name">{c}</span>
                    {form.crop === c && <div className="m-crop-check"><HiCheck /></div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="m-form-grid">
              {/* Area Planted */}
              <div className="m-fgrp">
                <label className="m-flabel">{t.areaPlantedHa}</label>
                <div className="m-input-wrapper">
                  <FaRulerCombined className="m-input-icon" />
                  <input 
                    className="m-finput" 
                    type="number" 
                    min="0.01" 
                    max="25" 
                    step="0.01"
                    placeholder="0.00"
                    value={form.areaPlantedHa}
                    onChange={e => set("areaPlantedHa", e.target.value)}
                  />
                  <span className="m-input-suffix">ha</span>
                </div>
                {form.areaPlantedHa && (
                  <div className="m-hint">
                    <MdOutlineInfo /> {Math.round(parseFloat(form.areaPlantedHa) * 100)} are
                    {parseFloat(form.areaPlantedHa) < 0.5 ? " (Small)" : parseFloat(form.areaPlantedHa) <= 1.5 ? " (Medium)" : " (Large)"}
                  </div>
                )}
              </div>

              {/* Farmer Category */}
              <div className="m-fgrp">
                <label className="m-flabel">{t.farmerCategory}</label>
                <div className="m-input-wrapper">
                  <MdOutlineBadge className="m-input-icon" />
                  <select className="m-finput" value={form.farmerCategory} onChange={e => set("farmerCategory", e.target.value)}>
                    <option value="Small">Small (&lt; 50 are)</option>
                    <option value="Medium">Medium (50–150 are)</option>
                    <option value="Large">Large (&gt; 150 are)</option>
                  </select>
                </div>
              </div>

              {/* Sector */}
              <div className="m-fgrp">
                <label className="m-flabel">{t.districtSector}</label>
                <div className="m-input-wrapper">
                  <MdOutlineLocationOn className="m-input-icon" />
                  <select className="m-finput" value={form.sector} onChange={e => {
                    set("sector", e.target.value);
                    set("soil", SECTOR_SOIL_TYPE[e.target.value] || "Clay Soil");
                  }}>
                    <option value="">{t.selectLocation}</option>
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Planting Date */}
              <div className="m-fgrp">
                <label className="m-flabel">{t.plantingDate}</label>
                <div className="m-input-wrapper">
                  <MdOutlineCalendarToday className="m-input-icon" />
                  <input 
                    className="m-finput" 
                    type="date" 
                    value={form.plantingDate}
                    onChange={e => handleDateChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Soil Type Info */}
            <div className="m-fgrp">
              <label className="m-flabel">{t.soilType}</label>
              {form.sector ? (() => {
                const st = SECTOR_SOIL_TYPE[form.sector] || "Clay Soil";
                const sd = SOIL_DISPLAY[st] || SOIL_DISPLAY["Clay Soil"];
                return (
                  <div className="modern-info-tile" style={{"--tile-color": sd.color}}>
                    <div className="tile-icon"><MdOutlineAgriculture /></div>
                    <div className="tile-content">
                      <div className="tile-title">{st}</div>
                      <div className="tile-sub">{sd.health} Quality · {form.sector} Sector</div>
                    </div>
                    <div className="tile-badge">{sd.health}</div>
                  </div>
                );
              })() : (
                <div className="modern-empty-tile">
                  <MdOutlineLocationOn /> {lang === "en" ? "Select sector to detect soil type" : "Hitamo Segiteri"}
                </div>
              )}
            </div>

            {/* Climate preview */}
            <div className="m-fgrp">
              <ClimateCard climate={autoClimate} month={form.month} season={form.season} lang={lang} />
            </div>

            <div className="form-section-title" style={{marginTop: 24}}>
              <span className="title-icon"><FaToggleOn /></span>
              <h3>{lang === "en" ? "Additional Factors" : "Ibindi bintu"}</h3>
            </div>

            <div className="m-form-grid">
              <div className="m-fgrp">
                <label className="m-flabel">{t.fertilizerUsed}</label>
                <div className="modern-toggle">
                  <button className={`m-toggle-btn ${form.fertilizer ? "active" : ""}`} onClick={() => set("fertilizer", true)}>{lang === "en" ? "Yes" : "Yego"}</button>
                  <button className={`m-toggle-btn ${!form.fertilizer ? "active" : ""}`} onClick={() => set("fertilizer", false)}>{lang === "en" ? "No" : "Oya"}</button>
                </div>
              </div>

              <div className="m-fgrp">
                <label className="m-flabel">{t.irrigationUsed}</label>
                <div className="modern-toggle">
                  <button className={`m-toggle-btn ${form.irrigation ? "active" : ""}`} onClick={() => set("irrigation", true)}>{lang === "en" ? "Yes" : "Yego"}</button>
                  <button className={`m-toggle-btn ${!form.irrigation ? "active" : ""}`} onClick={() => set("irrigation", false)}>{lang === "en" ? "No" : "Oya"}</button>
                </div>
              </div>
            </div>

            <div className="m-fgrp">
              <label className="m-flabel">{lang === "en" ? "Previous Crop" : "Igihingwa Cyahinzwe"}</label>
              <div className="modern-chip-selector">
                {["Beans", "Maize", "Rice", "Fallow", "Cassava"].map(pc => (
                  <button key={pc} className={`m-chip ${form.previousCrop === pc ? "active" : ""}`} onClick={() => set("previousCrop", pc)}>
                    {pc}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-modern-primary" onClick={() => setStep(2)} disabled={!step1Valid}>
              {t.continueStep2} <HiArrowLeft style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
        ) : (
          <div className="modern-form-container">
            <div className="form-section-title">
              <span className="title-icon"><FaCheckCircle /></span>
              <h3>{t.reviewPredict}</h3>
            </div>

            <div className="modern-summary-card">
              <div className="summary-main">
                <div className="s-main-item">
                  <span className="s-label">{t.cropType}</span>
                  <div className="s-val-group">
                    <CropIcon name={form.crop} size={32} />
                    <span className="s-val-large">{form.crop}</span>
                  </div>
                </div>
                <div className="s-main-item">
                  <span className="s-label">{t.areaPlantedHa}</span>
                  <span className="s-val-large">{form.areaPlantedHa} ha</span>
                </div>
              </div>
              
              <div className="summary-grid">
                {[
                  { label: "Location", val: form.sector, icon: <BiMap color="var(--g600)" /> },
                  { label: "Date", val: form.plantingDate, icon: <BiCalendar color="var(--g600)" /> },
                  { label: "Season", val: form.season, icon: <MdOutlineWbSunny color="var(--g600)" /> },
                  { label: "Soil", val: form.soil, icon: <MdOutlineAgriculture color="var(--g600)" /> },
                  { label: "Fertilizer", val: form.fertilizer ? "Yes" : "No", icon: <BiDroplet color="var(--g600)" /> },
                  { label: "Irrigation", val: form.irrigation ? "Yes" : "No", icon: <BiWater color="var(--g600)" /> }
                ].map(item => (
                  <div key={item.label} className="s-grid-item">
                    <div className="s-grid-icon">{item.icon}</div>
                    <div className="s-grid-info">
                      <span className="s-grid-lbl">{item.label}</span>
                      <span className="s-grid-val">{item.val}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="btn-edit-modern" onClick={() => setStep(1)}>
                <FaPencilAlt /> {t.edit}
              </button>
            </div>

            <ClimateCard climate={autoClimate} month={form.month} season={form.season} lang={lang} />

            <div className="modern-info-banner">
              <HiOutlineSparkles />
              <p>{lang === "en" ? "Ready to generate your prediction using Gradient Boosting ML model." : "Teguye gukora isubiramo ukoresheje ML model."}</p>
            </div>

            <button className="btn-modern-primary btn-predict" onClick={handlePredict} disabled={loading}>
              {loading ? <><div className="spin-white" /> {t.runningModel}</> : <><FaMagic /> {t.getHarvestPrediction}</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
