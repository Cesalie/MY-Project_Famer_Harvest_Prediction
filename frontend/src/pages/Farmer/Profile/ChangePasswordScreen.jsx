import React, { useState } from 'react';
import { T, API_BASE } from '../../../constants/constants';
import Topbar from '../../../components/Common/Topbar';

export default function ChangePasswordScreen({ user, onNavigate, lang, setLang }) {
  const t = T[lang];
  const [oldPw, setOldPw] = useState("");
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ t: "", m: "" });
  const [step, setStep] = useState(1); // 1: Verify Old, 2: Verify OTP & New

  const handleRequestOtp = async () => {
    if (!oldPw) return setMsg({ t: "err", m: t.allRequired });
    setLoading(true);
    setMsg({ t: "", m: "" });
    try {
      const res = await fetch(`${API_BASE}/api/change-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id || user.farmer_id, 
          role: user.role || "farmer", 
          old_password: oldPw 
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ t: "ok", m: lang === "en" ? "OTP sent to your email!" : "OTP yoherejwe kuri iimeyili yawe!" });
        setStep(2);
      } else {
        setMsg({ t: "err", m: data.error });
      }
    } catch (e) {
      setMsg({ t: "err", m: lang === "en" ? "Network error." : "Ikibazo cy'itumanaho." });
    }
    setLoading(false);
  };

  const handleVerifyAndSave = async () => {
    if (!otp || !newPw || !confPw) return setMsg({ t: "err", m: t.allRequired });
    if (newPw !== confPw) return setMsg({ t: "err", m: t.pwMismatch });
    setLoading(true); 
    setMsg({ t: "", m: "" });
    try {
      const res = await fetch(`${API_BASE}/api/change-password/verify`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id || user.farmer_id, 
          role: user.role || "farmer", 
          otp,
          new_password: newPw 
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ t: "ok", m: lang === "en" ? "Password updated successfully!" : "Ijambo ry'ibanga ryahinduwe neza!" });
        setTimeout(() => onNavigate("profile"), 1500);
      } else { 
        setMsg({ t: "err", m: data.error }); 
      }
    } catch (e) { 
      setMsg({ t: "err", m: lang === "en" ? "Network error." : "Ikibazo cy'itumanaho." });
    }
    setLoading(false);
  };

  return (
    <>
      <Topbar title={t.changePassword} onBack={() => onNavigate("profile")} lang={lang} setLang={setLang} />
      <div className="scroll fade-up">
        {msg.m && <div className={`alert alert-${msg.t}`} style={{ marginBottom: 16 }}>{msg.m}</div>}
        <div className="card">
          {step === 1 ? (
            <>
              <div className="fgrp">
                <label className="flabel">{lang === "en" ? "Current Password" : "Ijambo ry'ibanga ririho"}</label>
                <input className="finput" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Enter current password" />
              </div>
              <button className="btn btn-primary" onClick={handleRequestOtp} disabled={loading} style={{ marginTop: 10 }}>
                {loading ? <div className="spin" style={{ display: "inline-block", marginRight: 8 }} /> : (lang === "en" ? "Verify & Send OTP" : "Sura & Ohereza OTP")}
              </button>
            </>
          ) : (
            <>
              <div className="fgrp">
                <label className="flabel">{lang === "en" ? "Verification OTP" : "OTP yo kwemeza"}</label>
                <input className="finput" type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} />
              </div>
              <div className="fgrp">
                <label className="flabel">{lang === "en" ? "New Password" : "Ijambo ry'ibanga rishya"}</label>
                <input className="finput" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="fgrp">
                <label className="flabel">{t.confirmPw}</label>
                <input className="finput" type="password" value={confPw} onChange={e => setConfPw(e.target.value)} placeholder="Confirm new password" />
              </div>
              <button className="btn btn-primary" onClick={handleVerifyAndSave} disabled={loading} style={{ marginTop: 10 }}>
                {loading ? <div className="spin" style={{ display: "inline-block", marginRight: 8 }} /> : (lang === "en" ? "Update Password" : "Hindura Ijambo ry'ibanga")}
              </button>
              <div style={{ textAlign: "center", marginTop: 15 }}>
                <span onClick={() => setStep(1)} style={{ fontSize: 13, color: "var(--p600)", cursor: "pointer" }}>
                  {lang === "en" ? "Back to Current Password" : "Gusubira ku Ijambo ry'ibanga ririho"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
