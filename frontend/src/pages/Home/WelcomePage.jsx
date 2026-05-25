import React from 'react';
import { T } from '../../constants/constants';

export default function WelcomePage({ lang, setLang, onOpenLogin, onOpenRegister }) {
  const t = T[lang];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "radial-gradient(circle, rgba(17, 83, 40, 0.40) 0%, rgba(5, 38, 15, 0.82) 100%), url('/farm_bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      display: "flex",
      flexDirection: "column",
      color: "white"
    }}>
      <header style={{
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🌾</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--g900)", margin: 0 }}>
              {t.appName}
            </h1>
            <p style={{ fontSize: 11, color: "var(--s500)", margin: 0, fontWeight: 500 }}>
              Bugesera District · Rwanda · Smart Farming
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="lang-pill"
            onClick={() => setLang(l => l === "en" ? "rw" : "en")}
            style={{
              background: "var(--s100)",
              border: "none",
              padding: "8px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            🌐 {lang === "en" ? "Kinyarwanda" : "English"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onOpenRegister}
            style={{ width: "auto", padding: "8px 16px", fontSize: 13, fontWeight: 800, borderRadius: 999, background: "var(--g100)", color: "var(--g800)" }}
          >
            {t.registerBtn}
          </button>
          <button
            className="btn btn-primary"
            onClick={onOpenLogin}
            style={{ width: "auto", padding: "8px 16px", fontSize: 13, fontWeight: 800, borderRadius: 999 }}
          >
            {t.login}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, maxWidth: 850, margin: "0 auto", padding: "40px 20px 80px", width: "100%" }}>
        <div className="card card-hero-elevated" style={{ textAlign: "center", marginBottom: 30, padding: "40px 24px" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--g900)", marginBottom: 12 }}>
            {lang === "en" ? "Grow Smarter. Predict Your Harvest." : "Hinga Kijyambere. Teganya Umusaruro Wawe."}
          </h2>
          <p style={{ fontSize: 14, color: "var(--s600)", lineHeight: 1.6, maxWidth: 600, margin: "0 auto 24px" }}>
            {lang === "en" 
              ? "Welcome to Bugesera District's official agricultural prediction portal. Plan your planting seasons, retrieve automated localized climate readings, and optimize your seasonal yields with AI recommendations."
              : "Murakaza neza ku rubuga rw'akarere ka Bugesera rugufasha guteganya umusaruro w'imyaka. Tegura igihe cyo gutera, bona amakuru y'ibihe by'aho uherereye, kandi wongere umusaruro ubinyujije kuri model zacu."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 15, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "12px 30px", fontSize: 14, fontWeight: 800, borderRadius: 30 }}
              onClick={onOpenRegister}
            >
              🚀 {t.registerBtn}
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: "auto", padding: "12px 24px", fontSize: 14, fontWeight: 800, borderRadius: 30, background: "white", color: "var(--g700)" }}
              onClick={onOpenLogin}
            >
              🔑 {lang === "en" ? "Access Dashboard" : "Kwinjira muri Sisitemu"}
            </button>
          </div>
        </div>

        {/* Walkthrough - How It Works */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 18, textAlign: "center", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
          💡 {lang === "en" ? "How the Prediction System Works" : "Uko Sisitemu yo Guteganya Imyaka Ikora"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            {
              step: "1",
              title: lang === "en" ? "Enter Farm Details" : "Injiza Amakuru y'Umurima",
              desc: lang === "en" 
                ? "Select your sector, choose your crop type (Maize, Beans, or Rice), and enter your farm size." 
                : "Hitamo umurenge wawe, ubwoko bw'igihingwa (Ibigori, Ibishyimbo, cyangwa Umuceri), hanyuma wandike ubuso bw'umurima.",
              icon: "🚜"
            },
            {
              step: "2",
              title: lang === "en" ? "Auto Climate Analysis" : "Ibihe by'aho Uherereye",
              desc: lang === "en" 
                ? "The system automatically matches historical climate statistics (rainfall, temperature, and humidity) for your sector." 
                : "Sisitemu izahita izana amakuru y'ibihe (imvura, ubushyuhe, n'ubuhehere) y'umurenge wawe ugereranyije n'amateka.",
              icon: "📊"
            },
            {
              step: "3",
              title: lang === "en" ? "Get AI Yield Forecast" : "Bona Igereranya ry'Umusaruro",
              desc: lang === "en" 
                ? "Get instant predictions in kg/are and tailored post-harvest recommendations to maximize your crop value." 
                : "Bona umusaruro wateganyijwe mu biro (kg/are) n'inama zigufasha kwirinda igihombo nyuma yo gusarura.",
              icon: "🏆"
            }
          ].map(w => (
            <div key={w.step} className="card" style={{ position: "relative", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10, borderLeft: "4px solid var(--g500)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 24 }}>{w.icon}</span>
                <span style={{ 
                  background: "var(--g100)", 
                  color: "var(--g800)", 
                  fontSize: 11, 
                  fontWeight: 900, 
                  width: 22, 
                  height: 22, 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center"
                }}>
                  {w.step}
                </span>
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--g900)", margin: 0 }}>{w.title}</h4>
              <p style={{ fontSize: 12, color: "var(--s500)", lineHeight: 1.5, margin: 0 }}>{w.desc}</p>
            </div>
          ))}
        </div>

        {/* Bugesera District Summary Benchmarks */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 16, textAlign: "center", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
          📈 {lang === "en" ? "Bugesera District Yield Benchmarks" : "Impuzandengo y'Imyaka mu Karere ka Bugesera"}
        </h3>
        <div className="card card-blue" style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15, textAlign: "center" }}>
            {[
              { crop: lang === "en" ? "Maize" : "Ibigori", yield: "23.2 kg/are", benchmark: lang === "en" ? "DAP + CAN advised" : "DAP + CAN birasabwa" },
              { crop: lang === "en" ? "Beans" : "Ibishyimbo", yield: "11.9 kg/are", benchmark: lang === "en" ? "DAP at planting" : "DAP igihe utera" },
              { crop: lang === "en" ? "Rice" : "Umuceri", yield: "36.4 kg/are", benchmark: lang === "en" ? "Urea at tillering" : "Urea irakenewe" }
            ].map(b => (
              <div key={b.crop} style={{ padding: "10px 0" }}>
                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600, textTransform: "uppercase" }}>{b.crop}</div>
                <div style={{ fontSize: 20, fontWeight: 900, margin: "4px 0" }}>{b.yield}</div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>{b.benchmark}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--s500)", marginTop: 40, borderTop: "1px solid var(--s200)", paddingTop: 20 }}>
          🌾 {lang === "rw" ? "Urunyobwe rw'Ubuhinzi bwa Bugesera" : "Bugesera Agricultural Prediction Portal"} · Rwanda Polytechnic Capstone Project
        </div>
      </main>
    </div>
  );
}
