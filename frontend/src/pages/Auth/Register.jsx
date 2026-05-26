import React, { useState } from 'react';
import { T, SECTORS, API_BASE } from '../../constants/constants';

export default function Register({ lang, setLang, onLogin, onBack, isModal }) {
  const t = T[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sector, setSector] = useState("");
  const [farmHa, setFarmHa] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatedPw, setGeneratedPw] = useState("");

  const checkEmail = async (emailVal) => {
    if (!emailVal || !emailVal.includes('@')) return;
    try {
      const res = await fetch(`${API_BASE}/api/check-email?email=${encodeURIComponent(emailVal.trim().toLowerCase())}`);
      const data = await res.json();
      if (data.exists) {
        setError("This email is already taken. Please use another email or login.");
      } else if (error === "This email is already taken. Please use another email or login.") {
        setError("");
      }
    } catch (e) {
      console.log("Email check error:", e);
    }
  };

  const handleRegister = async () => {
    setError(""); 
    setSuccess("");

    if (!name || !email || !phone || !sector || !farmHa) {
      setError(t.allRequired);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setError(t.invalidEmail);
      return;
    }

    if (/[A-Z]/.test(email.trim())) {
      setError(t.noCapsEmail);
      return;
    }

    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setError(t.emailGmailRequired);
      return;
    }

    if (!agreedTerms) {
      setError(t.mustAgree);
      return;
    }

    setLoading(true);
    try {
      const regData = {
        name, 
        email: email.trim().toLowerCase(), 
        phone,
        role: "farmer",
        sector: sector,
        farm_size_ha: parseFloat(farmHa) || 0,
        department: ""
      };

      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData)
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setGeneratedPw(data.generated_password);
        setSuccess(
          lang === "rw"
            ? "Konti yawe yafunguwe neza! Reba email yawe kugira ngo ubone amakuru yo kwinjira (ijambo ry'ibanga). Niba email itaboneka, reba spam/junk folder."
            : "Account created successfully! Please check your email for your login credentials (password). If you don't see it, check your spam/junk folder."
        );
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (e) {
      setLoading(false);
      setError("Server connection failed.");
      console.log("Registration API error:", e);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSector("");
    setFarmHa("");
    setAgreedTerms(false);
    setError("");
    setSuccess("");
    setGeneratedPw("");
  };

  const containerContent = (
    <div className="auth-container" style={{ margin: isModal ? "0 auto" : undefined, padding: isModal ? "10px" : undefined }}>
      
      {/* Title and subtitle outside the card */}
      <div className="auth-title-container" style={{ marginTop: isModal ? 10 : 20 }}>
        <h1 className="auth-title-main">{t.appName}</h1>
        <p className="auth-title-sub">{t.appSub}</p>
      </div>

      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g900)" }}>{t.register}</h2>
        </div>

        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fff5f5, #fee2e2)',
            border: '1.5px solid #fca5a5',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <div style={{ width: 34, height: 34, background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="bi bi-exclamation-lg" style={{ color: 'white', fontSize: 16 }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#7f1d1d', marginBottom: 3 }}>
                {lang === 'rw' ? 'Habaye Ikibazo' : 'Registration Error'}
              </div>
              <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>{error}</div>
            </div>
          </div>
        )}
        {success && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1.5px solid #86efac',
            borderRadius: 14,
            padding: '18px 20px',
            marginBottom: 16,
          }}>
            {/* Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-check-lg" style={{ color: 'white', fontSize: 18 }}></i>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#14532d' }}>
                {lang === 'rw' ? 'Konti Yafunguwe Neza!' : 'Account Created Successfully!'}
              </div>
            </div>
            {/* Message */}
            <p style={{ fontSize: 13, color: '#166534', margin: '0 0 12px', lineHeight: 1.6 }}>
              {success}
            </p>
            {/* Email highlight */}
            <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="bi bi-envelope-fill" style={{ color: '#16a34a', fontSize: 18, flexShrink: 0 }}></i>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                  {lang === 'rw' ? 'Email Yoherejwe kuri' : 'Credentials sent to'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{email}</div>
              </div>
            </div>
          </div>
        )}

        <div className="fgrp">
          <label className="flabel"><i className="bi bi-person"></i> {t.fullName} *</label>
          <input 
            className="academic-input" 
            placeholder={lang === "rw" ? "Urugero: Amina Uwimana" : "e.g. Amina Uwimana"} 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>

        <div className="fgrp">
          <label className="flabel"><i className="bi bi-envelope"></i> Email Address *</label>
          <input 
            className="academic-input" 
            type="email" 
            placeholder="user@example.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            onBlur={e => checkEmail(e.target.value)}
          />
        </div>

        <div className="fgrp">
          <label className="flabel"><i className="bi bi-telephone"></i> {lang === "en" ? "Phone Number" : "Nimero ya Telefone"} *</label>
          <input 
            className="academic-input" 
            type="tel" 
            placeholder="+250 78x xxx xxx" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
        </div>

        <div className="fgrp">
          <label className="flabel"><i className="bi bi-geo-alt"></i> {lang === "en" ? "Main Farm Sector" : "Segiteri y'Umurenge"} *</label>
          <select className="academic-input" value={sector} onChange={e => setSector(e.target.value)}>
            <option value="">{lang === "rw" ? "Hitamo…" : "Select…"}</option>
            {SECTORS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>

        <div className="fgrp">
          <label className="flabel"><i className="bi bi-rulers"></i> {t.farmSizeHa} *</label>
          <input 
            className="academic-input" 
            type="number" 
            step="0.1" 
            placeholder="e.g. 0.5" 
            value={farmHa} 
            onChange={e => setFarmHa(e.target.value)} 
          />
        </div>

        <div 
          className="fgrp" 
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", marginBottom: 16 }} 
          onClick={() => setAgreedTerms(!agreedTerms)}
        >
          <input 
            type="checkbox" 
            checked={agreedTerms} 
            onChange={e => setAgreedTerms(e.target.checked)} 
            style={{ width: 18, height: 18, accentColor: "var(--g700)", cursor: "pointer" }} 
          />
          <span style={{ fontSize: 12, color: "var(--s600)", lineHeight: 1.3 }}>{t.agreeTerms}</span>
        </div>

        {!generatedPw ? (
          <button 
            className="auth-btn"
            onClick={handleRegister}
            disabled={loading || !name || !email || !phone || !sector || !farmHa}
          >
            {loading ? <><div className="spin" />{t.creatingAccount}</> : <><i className="bi bi-person-plus"></i> {t.registerBtn}</>}
          </button>
        ) : (
          <button
            className="auth-btn btn-outline"
            onClick={() => { onLogin(); resetForm(); }}
            style={{ border: "1px solid var(--g800)", background: "white", color: "var(--g800)" }}
          >
            {lang === "en" ? "Proceed to Login" : "Komeza ku kwinjira"}
          </button>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span onClick={() => { onLogin(); resetForm(); }} className="auth-link-forgot" style={{ fontSize: 13, cursor: "pointer" }}>
            {t.alreadyHave} <strong>{t.signInHere}</strong>
          </span>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--s200)", fontSize: 11, color: "var(--s500)", fontWeight: 500 }}>
          🌾 {lang === "rw" ? "Urunyobwe rw'Ubuhinzi bwa Bugesera" : "Bugesera Agricultural System"} · Rwanda Polytechnic
        </div>
      </div>

      {/* Back Link (only if not a modal) */}
      {!isModal && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ cursor: "pointer", textDecoration: "underline", color: "white", fontSize: 13, fontWeight: 600 }} onClick={onBack}>
            ← {lang === "en" ? "Back to Login" : "Gusubira ku Kwinjira"}
          </span>
        </div>
      )}

    </div>
  );

  if (isModal) {
    return containerContent;
  }

  return (
    <div className="auth-wrap">
      {containerContent}
    </div>
  );
}
