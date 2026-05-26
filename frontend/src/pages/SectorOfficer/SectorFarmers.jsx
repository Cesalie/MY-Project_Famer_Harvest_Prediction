import React, { useState, useEffect } from 'react';
import { T, API_BASE } from '../../constants/constants';

export default function SectorFarmers({ sectorName, sectorId, setSelectedFarmerId, lang }) {
  const t = T[lang];
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/admin/sector-details/${sectorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) setFarmers(data.data.farmers || []);
        setLoading(false);
      })
      .catch(() => {
        setFarmers([]);
        setLoading(false);
      });
  }, [sectorId]);

  const filtered = farmers
    .filter(f => {
      const q = search.toLowerCase();
      return !q ||
        (f.full_name || '').toLowerCase().includes(q) ||
        (f.farmer_id || f.id || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q) ||
        (f.phone || '').includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'size') return (b.farm_size_are || 0) - (a.farm_size_are || 0);
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

  const initials = (name) => (name || 'F').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarColors = ['#16a34a', '#0284c7', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
  const avatarColor = (id) => avatarColors[(id || '').charCodeAt(0) % avatarColors.length];

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="so-page-header">
        <div>
          <h2 className="so-page-title">
            <i className="bi bi-people-fill"></i>
            {sectorName} {lang === 'en' ? 'Sector Farmers' : 'Abahinzi ba Umurenge'}
          </h2>
          <p className="so-page-sub">
            {loading ? '…' : farmers.length} {lang === 'en' ? 'registered farmers' : 'abahinzi biyandikishije'}
          </p>
        </div>
        <div className="so-page-header-actions">
          <select className="so-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">{lang === 'en' ? 'Sort: Name' : 'Amazina'}</option>
            <option value="size">{lang === 'en' ? 'Sort: Farm Size' : 'Ubuso'}</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="so-list-search" style={{ marginBottom: 20 }}>
        <i className="bi bi-search"></i>
        <input
          className="so-search-input"
          placeholder={lang === 'en' ? 'Search by name, ID, phone or email…' : 'Shakisha izina, ID, telefone cyangwa email…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="so-search-clear" onClick={() => setSearch('')}>
            <i className="bi bi-x"></i>
          </button>
        )}
      </div>

      {/* Farmer Grid */}
      {loading ? (
        <div className="so-farmer-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="so-farmer-card so-skeleton-card">
              <div className="so-skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="so-skeleton" style={{ width: '70%', height: 14, marginBottom: 8 }} />
                <div className="so-skeleton" style={{ width: '50%', height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="so-empty-state">
          <i className="bi bi-person-x"></i>
          <p>{search ? (lang === 'en' ? 'No farmers match your search' : 'Nta muhinzi uhuye n\'ubushakashatsi') : (lang === 'en' ? 'No farmers registered in this sector' : 'Nta bahinzi biyandikishije muri uyu murenge')}</p>
        </div>
      ) : (
        <div className="so-farmer-grid">
          {filtered.map(f => {
            const fid = f.farmer_id || f.id;
            const name = f.full_name || f.name || 'Unknown';
            const sizeAre = f.farm_size_are || 0;
            const sizeHa = (sizeAre / 100).toFixed(2);
            return (
              <div key={fid} className="so-farmer-card" onClick={() => setSelectedFarmerId(fid)}>
                <div className="so-farmer-avatar" style={{ background: avatarColor(fid) }}>
                  {initials(name)}
                </div>
                <div className="so-farmer-info">
                  <div className="so-farmer-name">{name}</div>
                  <div className="so-farmer-id">{fid}</div>
                  <div className="so-farmer-meta">
                    {f.phone && <span><i className="bi bi-telephone"></i> {f.phone}</span>}
                    {sizeAre > 0 && <span><i className="bi bi-rulers"></i> {sizeAre} are ({sizeHa} ha)</span>}
                  </div>
                </div>
                <div className="so-farmer-card-action">
                  <button className="so-view-btn">
                    {lang === 'en' ? 'View' : 'Reba'} <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
