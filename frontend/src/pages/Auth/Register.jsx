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
  const [registeredEmail, setRegisteredEmail] = useState("");

  const normalizePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('250') && digits.length === 12) {
      return `0${digits.slice(3)}`;
    }
    return digits;
  };

  const isValidRwandaPhone = (value) => {
    const normalized = normalizePhone(value);
    const allowedPrefixes = ['072', '073', '074', '075', '078', '079'];
    return normalized.length === 10 && normalized.startsWith('07') && allowedPrefixes.includes(normalized.slice(0, 3));
  };

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

    if (!isValidRwandaPhone(phone)) {
      setError(phone.replace(/\D/g, '').length !== 10 ? t.notValidPhone : t.invalidRwPhone);
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
        phone: normalizePhone(phone),
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
        setRegisteredEmail(regData.email);
        setSuccess(
          lang === "rw"
            ? "Konti yawe yafunguwe neza! 🎉"
            : "Account created successfully! 🎉"
        );
      } else {
        let errMsg = data.error || "Registration failed.";
        if (data.email_error) errMsg += ` (${data.email_error})`;
        // If backend returned the generated password as fallback, show it briefly
        if (data.generated_password) {
          setGeneratedPw(data.generated_password);
          setRegisteredEmail(regData.email);
          setSuccess(lang === "rw" ? "Konti yafunguwe ariko email ntiyoherejwe neza. Reba ijambo ry'ibanga hano hasi." : "Account created but email delivery failed. Password is shown below.");
        } else {
          setError(errMsg);
        }
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
    setRegisteredEmail("");
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
            background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
            border: '2px solid #2dd4bf',
            borderRadius: 14,
            padding: '24px',
            marginBottom: 20,
          }}>
            {/* Title with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-check-circle-fill" style={{ color: 'white', fontSize: 28 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: '#0f3d38', margin: 0 }}>
                  {lang === 'rw' ? 'Konti Yafunguwe Neza! 🎉' : 'Account Created Successfully! 🎉'}
                </div>
                <div style={{ fontSize: 13, color: '#0f766e', margin: 0, fontWeight: 500 }}>
                  {lang === 'rw' ? 'Murakaza neza muri sisitemu yacu!' : 'Welcome to our system!'}
                </div>
              </div>
            </div>

            {/* Email Highlight Box */}
            <div style={{ background: 'white', border: '2px solid #5eead4', borderRadius: 12, padding: '16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="bi bi-envelope-check-fill" style={{ color: '#0d9488', fontSize: 24, flexShrink: 0 }}></i>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                  {lang === 'rw' ? 'Amakuru yo kwinjira asohotseye kuri' : 'Login credentials sent to'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#047857', wordBreak: 'break-all' }}>
                  {registeredEmail || email}
                </div>
              </div>
            </div>

            {/* Step-by-step Instructions */}
            <div style={{ background: 'rgba(22, 163, 74, 0.05)', borderRadius: 12, padding: '16px', marginBottom: 18, borderLeft: '4px solid #0d9488' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f3d38', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-list-check" style={{ fontSize: 18 }}></i>
                {lang === 'rw' ? 'Ingero z\'inyongera' : 'Next Steps'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, background: '#0d9488', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>1</div>
                  <div style={{ fontSize: 13, color: '#0f766e', lineHeight: 1.5, flex: 1 }}>
                    {lang === 'rw' ? 'Reba email yawe (ibiri n\'inyandiko y\'akorante)' : 'Check your email for your login credentials'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, background: '#0d9488', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>2</div>
                  <div style={{ fontSize: 13, color: '#0f766e', lineHeight: 1.5, flex: 1 }}>
                    {lang === 'rw' ? 'Niba email itaboneka, reba spam/junk folder' : 'If you don\'t see it, check your spam/junk folder'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, background: '#0d9488', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>3</div>
                  <div style={{ fontSize: 13, color: '#0f766e', lineHeight: 1.5, flex: 1 }}>
                    {lang === 'rw' ? 'Koresha email n\'ijambo ry\'ibanga kugirango winjire' : 'Use your email and password to log in'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Box */}
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 10, padding: '12px 14px', marginBottom: 18, display: 'flex', gap: 10 }}>
              <i className="bi bi-info-circle-fill" style={{ color: '#ff8c00', fontSize: 18, flexShrink: 0, marginTop: 2 }}></i>
              <div style={{ fontSize: 12, color: '#664d03', lineHeight: 1.6 }}>
                {lang === 'rw' ? 'Ijambo ry\'ibanga ntiyoherejwegore kugihe cyose. Reba email yawe ahubwo neza.' : 'Your password has been sent. Please check your email inbox carefully, including all tabs.'}
              </div>
            </div>
          </div>
        )}

        {!success && (
          <>
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
          </>
        )}

        {!generatedPw ? (
          <button
            className="auth-btn"
            onClick={handleRegister}
            disabled={loading || !name || !email || !phone || !sector || !farmHa}
            style={{ display: success ? 'none' : 'block' }}
          >
            {loading ? <><div className="spin" />{t.creatingAccount}</> : <><i className="bi bi-person-plus"></i> {t.registerBtn}</>}
          </button>
        ) : (
          <button
            className="auth-btn"
            onClick={() => { onLogin(); resetForm(); }}
            style={{ background: 'linear-gradient(135deg,#0f3d38,#0d9488)', border: 'none' }}
          >
            <i className="bi bi-box-arrow-in-right" style={{ marginRight: 8 }}></i>
            {lang === "en" ? "Go to Login" : "Komeza ku kwinjira"}
          </button>
        )}

        <div style={{ textAlign: "center", marginTop: 16, display: success ? 'none' : 'block' }}>
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

