import React, { useState } from 'react';
import { T, SECTORS, API_BASE } from '../../../constants/constants';
import Topbar from '../../../components/Common/Topbar';

export default function EditProfileScreen({ user, onNavigate, setUser, lang, setLang }) {
  const t = T[lang];
  const [name, setName] = useState(user.name || user.full_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [sector, setSector] = useState(user.sector || "");
  const [size, setSize] = useState(user.farm_size_ha || 0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ t: "", m: "" });

  const handleSave = async () => {
    setLoading(true); 
    setMsg({ t: "", m: "" });
    try {
      const res = await fetch(`${API_BASE}/api/update-profile`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id || user.farmer_id, 
          role: "farmer", 
          name, 
          email,
          phone,
          sector, 
          farm_size_ha: parseFloat(size) 
        })
      });
      const data = await res.json();
      if (data.success) {
        // Build correct user object
        const updatedUser = {
          ...user,
          name: data.user.full_name || data.user.name || name,
          full_name: data.user.full_name || data.user.name || name,
          email: data.user.email || email,
          phone: data.user.phone || phone,
          sector: data.user.sector || sector,
          farm_size_ha: data.user.farm_size_ha || parseFloat(size),
          farm_size_are: data.user.farm_size_are || parseFloat(size) * 100
        };
        setUser(updatedUser);
        setMsg({ t: "ok", m: lang === "en" ? "Profile updated!" : "Konti yavuguruwe!" });
        setTimeout(() => onNavigate("profile"), 1500);
      } else { 
        setMsg({ t: "err", m: data.error }); 
      }
    } catch (e) { 
      // Offline fallback simulation
      setTimeout(() => {
        const updatedUser = {
          ...user,
          name,
          full_name: name,
          email,
          phone,
          sector,
          farm_size_ha: parseFloat(size),
          farm_size_are: parseFloat(size) * 100
        };
        setUser(updatedUser);
        setMsg({ t: "ok", m: lang === "en" ? "[OFFLINE FALLBACK] Profile updated locally!" : "[OFFLINE] Konti yavuguruwe!" });
        setTimeout(() => onNavigate("profile"), 1500);
      }, 1000);
    }
    setLoading(false);
  };

  return (
    <>
      <Topbar title={t.editProfile} onBack={() => onNavigate("profile")} lang={lang} setLang={setLang} />
      <div className="scroll fade-up">
        {msg.m && <div className={`alert alert-${msg.t}`} style={{ marginBottom: 16 }}>{msg.m}</div>}
        <div className="card">
          <div className="fgrp">
            <label className="flabel"><i className="bi bi-person"></i> {t.fullName}</label>
            <input className="finput" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="fgrp">
            <label className="flabel"><i className="bi bi-envelope"></i> {t.emailLabel}</label>
            <input className="finput" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="fgrp">
            <label className="flabel"><i className="bi bi-telephone"></i> {lang === "en" ? "Phone Number" : "Nimero ya Telefone"}</label>
            <input className="finput" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="fgrp">
            <label className="flabel"><i className="bi bi-geo-alt"></i> {t.sector}</label>
            <select className="finput" value={sector} onChange={e => setSector(e.target.value)}>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fgrp">
            <label className="flabel"><i className="bi bi-rulers"></i> {t.farmSizeHa}</label>
            <input className="finput" type="number" step="0.1" value={size} onChange={e => setSize(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ marginTop: 10 }}>
            {loading ? <div className="spin" style={{ display: "inline-block", marginRight: 8 }} /> : (lang === "en" ? "Save Changes" : "Bika Impinduka")}
          </button>
        </div>
      </div>
    </>
  );
}
