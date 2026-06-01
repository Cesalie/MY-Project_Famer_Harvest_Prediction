import React, { useState, useEffect } from 'react';
import { T, CLIMATE, API_BASE } from '../../constants/constants';
import Topbar from '../../components/Common/Topbar';

export default function WeatherScreen({ onNavigate, lang, setLang, user }) {
  const t = T[lang];
  const sector = user?.sector || 'Nyamata';

  const [liveWeather, setLiveWeather] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/weather?sector=${encodeURIComponent(sector)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.weather) {
          setLiveWeather(d.weather);
        } else {
          setError(lang === 'en' ? 'Could not load live weather' : 'Ntibishoboye gufata amakuru y\'ikirere');
        }
        setLoading(false);
      })
      .catch(() => {
        setError(lang === 'en' ? 'No internet connection' : 'Nta internet');
        setLoading(false);
      });
  }, [sector]);

  // Historical monthly data for chart
  const monthly = Object.entries(CLIMATE).map(([m, d]) => ({
    m: m.slice(0, 3), rain: d.rainfall, temp: d.temperature
  }));
  const maxR = Math.max(...monthly.map(d => d.rain));

  const isLive = liveWeather?.source === 'open-meteo-live';

  return (
    <>
      <Topbar
        title={<><i className="bi bi-cloud-sun"></i> {t.weatherTitle}</>}
        sub={`${sector} · Bugesera`}
        onBack={() => onNavigate('dashboard')}
        lang={lang}
        setLang={setLang}
      />
      <div className="scroll fade-up">

        {/* ── Live Weather Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f3d38, #0d9488)',
          borderRadius: 20, padding: '20px 22px', marginBottom: 16, color: 'white'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, opacity: .8, marginBottom: 2 }}>
                <i className="bi bi-geo-alt-fill"></i> {sector} · Bugesera District
              </div>
              <div style={{ fontSize: 11, opacity: .65 }}>
                {isLive
                  ? <><i className="bi bi-broadcast" style={{ color: '#5eead4' }}></i> {lang === 'en' ? 'Live from Open-Meteo' : 'Amakuru Mazima — Open-Meteo'}</>
                  : <><i className="bi bi-clock-history"></i> {lang === 'en' ? 'Historical averages' : 'Impuzandengo y\'amateka'}</>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {loading ? (
                <div className="spin" style={{ width: 24, height: 24, borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }}></div>
              ) : (
                <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>
                  {liveWeather?.Avg_Temperature_Celsius ?? '—'}°
                </div>
              )}
              <div style={{ fontSize: 11, opacity: .75 }}>Celsius</div>
            </div>
          </div>

          {/* Stats grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '10px 0', opacity: .7, fontSize: 13 }}>
              {lang === 'en' ? 'Loading live weather…' : 'Gutegereza amakuru y\'ikirere…'}
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
              <i className="bi bi-exclamation-triangle"></i> {error}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { icon: 'bi-cloud-rain-fill', val: `${liveWeather?.Total_Rainfall_mm ?? '—'} mm`, lbl: lang==='en'?'Rainfall':'Imvura' },
                { icon: 'bi-droplet-half',    val: `${liveWeather?.Relative_Humidity_Pct ?? '—'}%`, lbl: lang==='en'?'Humidity':'Ubuhehere' },
                { icon: 'bi-sun-fill',        val: `${liveWeather?.Sunshine_Hours_per_Day ?? '—'} h`, lbl: lang==='en'?'Sunshine':'Izuba' },
                { icon: 'bi-wind',            val: `${liveWeather?.Wind_Speed_kmh ?? '—'} km/h`, lbl: lang==='en'?'Wind':'Umuyaga' },
                { icon: 'bi-water',           val: `${liveWeather?.Evapotranspiration_mm ?? '—'} mm`, lbl: 'Evapotransp.' },
                { icon: 'bi-calendar3',       val: new Date().toLocaleDateString(lang==='rw'?'rw-RW':'en-RW',{day:'numeric',month:'short'}), lbl: lang==='en'?'Today':'Uyu Munsi' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <i className={`bi ${s.icon}`} style={{ fontSize: 18, display: 'block', marginBottom: 4 }}></i>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{s.val}</div>
                  <div style={{ fontSize: 10, opacity: .75, marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Source badge */}
          {!loading && !error && (
            <div style={{ marginTop: 12, fontSize: 10, opacity: .6, textAlign: 'right' }}>
              {lang === 'en' ? 'Data source:' : 'Inkomoko y\'amakuru:'} {isLive ? 'Open-Meteo API (live)' : 'Bugesera Historical Avg'}
              {liveWeather?.fetched_at && ` · ${new Date(liveWeather.fetched_at).toLocaleTimeString()}`}
            </div>
          )}
        </div>

        {/* ── Monthly Rainfall Chart ── */}
        <div className="sec-hd"><i className="bi bi-bar-chart-line"></i> {t.monthlyRainfall}</div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--s500)', marginBottom: 10 }}>
            {lang === 'en' ? 'Bugesera District — Historical monthly averages (mm)' : 'Akarere ka Bugesera — Impuzandengo y\'imvura buri kwezi (mm)'}
          </div>
          {monthly.map(d => (
            <div key={d.m} className="bar-row">
              <div className="bar-lbl">{d.m}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(d.rain / maxR) * 100}%` }} />
              </div>
              <div className="bar-val">{d.rain} mm</div>
            </div>
          ))}
        </div>

        {/* ── Monthly Temperature Chart ── */}
        <div className="sec-hd"><i className="bi bi-thermometer-half"></i> {t.monthlyTemp}</div>
        <div className="card" style={{ marginBottom: 14 }}>
          {monthly.map(d => (
            <div key={d.m} className="bar-row">
              <div className="bar-lbl">{d.m}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${((d.temp - 20) / 8) * 100}%`, background: 'linear-gradient(90deg,#0d9488,#f97316)' }} />
              </div>
              <div className="bar-val">{d.temp}°C</div>
            </div>
          ))}
        </div>

        {/* ── Planting Calendar ── */}
        <div className="card" style={{ background: 'var(--g50)', borderColor: 'var(--g300)', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--g800)', marginBottom: 10 }}>
            <i className="bi bi-flower2"></i> {t.plantingCalendar}
          </div>
          {[
            { title: lang==='en'?'Season A (Oct–Jan)':'Igihe A (Ukwakira–Mutarama)', desc: lang==='en'?'Maize, Rice — main season, +10% yields':'Ibigori, Umuceri — igihe gikomeye, umusaruro +10%' },
            { title: lang==='en'?'Season B (Mar–Jul)':'Igihe B (Werurwe–Nyakanga)',  desc: lang==='en'?'Beans, Vegetables — secondary season':'Ibishyimbo, Imboga — igihe gito' },
            { title: lang==='en'?'Best planting time':'Igihe cyiza cyo gutera',       desc: lang==='en'?'Oct–Nov (Season A) · Mar–Apr (Season B)':'Ukwakira–Ugushyingo (A) · Werurwe–Mata (B)' },
          ].map(({ title, desc }) => (
            <div key={title} style={{ padding: '8px 0', borderBottom: '1px solid var(--g200)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--g800)' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--s600)', marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

