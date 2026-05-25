import React from 'react';
import LangBtn from './LangBtn';

export default function Topbar({ title, sub, onBack, actions, lang, setLang }) {
  return (
    <div className="topbar">
      <div className="topbar-inner" style={{ maxWidth: 850, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="back-row">
          {onBack && <button className="back-icon" onClick={onBack}>←</button>}
          <div>
            <div className="topbar-brand">{title}</div>
            {sub && <div className="topbar-sub">{sub}</div>}
          </div>
        </div>
        <div className="topbar-actions">
          <LangBtn lang={lang} setLang={setLang} />
          {actions}
        </div>
      </div>
    </div>
  );
}
