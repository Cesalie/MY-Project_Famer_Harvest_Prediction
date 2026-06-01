import React, { useState, useEffect } from 'react';
import { T, API_BASE, SECTORS } from '../../constants/constants';

export default function DistrictAdminPanel({ user, lang }) {
  const t = T[lang];
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const role                   = 'sector';
  const [sector, setSector]   = useState(SECTORS[0]);
  const dept                   = 'Crop Production';
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const [officers, setOfficers] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => { fetchOfficers(); }, []);

  const checkEmail = async (emailVal) => {
    if (!emailVal || !emailVal.includes('@')) return;
    try {
      const res = await fetch(`${API_BASE}/api/check-email?email=${encodeURIComponent(emailVal.trim().toLowerCase())}`);
      const data = await res.json();
      if (data.exists) {
        setStatus({ type: 'err', msg: "This email is already taken. Please use another email." });
      } else if (status && status.msg === "This email is already taken. Please use another email.") {
        setStatus(null);
      }
    } catch (e) {
      console.log("Email check error:", e);
    }
  };

  const fetchOfficers = async () => {
    try {
      const requester = user?.id || user?.officer_id || '';
      const res  = await fetch(`${API_BASE}/api/officers?requester_id=${requester}`);
      const data = await res.json();
      if (data.success) setOfficers(data.officers);
    } catch {
      // Offline fallback demo data
      setOfficers([
        { id: 'O1', name: 'Marie Uwase',       email: 'marie@sector.gov.rw',   role: 'sector',   sector: 'Nyamata',  department: 'Agronomy', status: 'active' },
        { id: 'O2', name: 'Jean Habimana',      email: 'jean@sector.gov.rw',    role: 'sector',   sector: 'Gashora',  department: 'Livestock', status: 'active' },
        { id: 'O3', name: 'Claudette Mukama',   email: 'claudette@sector.gov.rw', role: 'sector', sector: 'Juru',     department: 'Irrigation', status: 'active' },
        { id: 'O4', name: 'Pascal Nkurunziza',  email: 'pascal@district.gov.rw', role: 'district', sector: 'Bugesera', department: 'Administration', status: 'active' },
      ]);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !sector.trim()) {
      return setStatus({ type: 'err', msg: t.allRequired || 'Please fill in all required fields.' });
    }
    if (!email.includes('@')) {
      return setStatus({ type: 'err', msg: 'Please enter a valid email address.' });
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, sector, department: dept }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'ok', msg: t.officerRegistered || `Officer registered! Default password: harvest2024` });
        setName(''); setEmail(''); setPhone('');
        fetchOfficers();
      } else {
        setStatus({ type: 'err', msg: data.error || 'Registration failed.' });
      }
    } catch {
      // Offline fallback
      setOfficers(prev => [
        ...prev,
        { id: `O${Date.now()}`, name, email, role, sector, department: dept, status: 'active' },
      ]);
      setStatus({ type: 'ok', msg: `Officer queued (offline). Default password: harvest2024` });
      setName(''); setEmail(''); setPhone('');
    }
    setLoading(false);
    setTimeout(() => setStatus(null), 5000);
  };

  const filteredOfficers = officers.filter(o => {
    const matchRole   = filterRole === 'all' || o.role === filterRole;
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.sector || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleBadge = (r) => {
    if (r === 'district') return <span className="badge bg-blue">District</span>;
    if (r === 'sector')   return <span className="badge bg-green">Sector Officer</span>;
    return <span className="badge bg-amber">{r}</span>;
  };

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>

      {/* ── Register Officer Form ─────────────── */}
      <div className="sec-hd"><i className="bi bi-person-plus"></i> {lang === 'en' ? 'Register New Sector Agri Officer' : 'Andika Ofisiye w\'Ubuhinzi w\'Umurenge'}</div>
      <div className="card" style={{ marginBottom: 28 }}>

        {status && (
          <div style={{
            marginBottom: 14, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: status.type === 'ok' ? '#ccfbf1' : 'var(--red-l)',
            color:      status.type === 'ok' ? '#0f766e' : 'var(--red-d)',
            border:     `1px solid ${status.type === 'ok' ? '#99f6e4' : 'transparent'}`,
          }}>
            <i className={`bi bi-${status.type === 'ok' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`}></i>{' '}
            {status.msg}
          </div>
        )}

        {/* Row 1: Full Name + Email */}
        <div className="frow">
          <div className="fgrp">
            <label className="flabel">{t.fullName || 'Full Name'} *</label>
            <input
              className="finput"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Marie Uwase"
            />
          </div>
          <div className="fgrp">
            <label className="flabel">{t.emailLabel || 'Email Address'} *</label>
            <input
              className="finput"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={e => checkEmail(e.target.value)}
              placeholder="officer@sector.gov.rw"
            />
          </div>
        </div>

        {/* Row 2: Phone + Assigned Sector */}
        <div className="frow">
          <div className="fgrp">
            <label className="flabel">{t.phoneReg || 'Phone Number'}</label>
            <input
              className="finput"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+250 78..."
            />
          </div>
          <div className="fgrp">
            <label className="flabel">{t.assignedSector || 'Assigned Sector'} *</label>
            <select className="finput" value={sector} onChange={e => setSector(e.target.value)}>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Department — fixed, shown as info badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f0fdfa', border: '1.5px solid #99f6e4',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14
        }}>
          <i className="bi bi-briefcase-fill" style={{ color: '#0d9488', fontSize: 16 }}></i>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {t.deptLabel || 'Department'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f3d38' }}>Crop Production</div>
          </div>
          <span style={{ marginLeft: 'auto', background: '#0d9488', color: 'white', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
            {lang === 'en' ? 'Fixed' : 'Ihoraho'}
          </span>
        </div>

        <div style={{
          background: 'var(--s50)', border: '1px solid var(--s200)',
          borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--s600)', marginBottom: 14,
        }}>
          <i className="bi bi-info-circle"></i>{' '}
          {lang === 'en'
            ? <>A default password <strong>harvest2024</strong> will be assigned. Login credentials will be sent to the officer's email.</>
            : <>Ijambo ry'ibanga <strong>harvest2024</strong> rizashyirwa. Amakuru yo kwinjira azohererezwa kuri email y'ofisiye.</>}
        </div>

        <button className="btn btn-primary" onClick={handleRegister} disabled={loading} style={{ marginTop: 4 }}>
          {loading
            ? <><i className="bi bi-arrow-repeat spin"></i> {lang === 'en' ? 'Registering…' : 'Kwandika…'}</>
            : <><i className="bi bi-person-plus"></i> {lang === 'en' ? 'Register Sector Officer' : 'Andika Ofisiye w\'Umurenge'}</>}
        </button>
      </div>

      {/* ── Officers Directory ────────────────── */}
      <div className="sec-hd"><i className="bi bi-people"></i> {t.existingOfficers || 'Active Extension Staff'}</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="finput"
          style={{ flex: 1, minWidth: 180, maxWidth: 300, marginBottom: 0 }}
          placeholder="Search by name or sector…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="toggle-group" style={{ flex: 'none' }}>
          {[['all', 'All'], ['sector', 'Sector'], ['district', 'District']].map(([k, label]) => (
            <button
              key={k}
              className={`toggle-opt ${filterRole === k ? 'sel' : ''}`}
              style={{ padding: '9px 14px', fontSize: 12 }}
              onClick={() => setFilterRole(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
            <thead style={{ background: 'var(--s100)', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Sector / Dept</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.map((o, i) => (
                <tr key={o.id || i} style={{ borderTop: '1px solid var(--s200)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--g50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'var(--g100)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, color: 'var(--g700)', flexShrink: 0
                      }}>
                        <i className="bi bi-person"></i>
                      </div>
                      <div>
                        <div>{o.name}</div>
                        <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--s400)' }}>{o.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{roleBadge(o.role)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--s600)' }}>
                    {o.role === 'sector' ? o.sector : o.department}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge bg-green">
                      <i className="bi bi-circle-fill" style={{ fontSize: 7 }}></i> Active
                    </span>
                  </td>
                </tr>
              ))}
              {filteredOfficers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--s400)' }}>
                    <i className="bi bi-inbox" style={{ fontSize: 28, display: 'block', marginBottom: 10 }}></i>
                    No officers match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--s400)', textAlign: 'center' }}>
        <i className="bi bi-people"></i> {filteredOfficers.length} officer{filteredOfficers.length !== 1 ? 's' : ''} listed across Bugesera District
      </div>
    </div>
  );
}
