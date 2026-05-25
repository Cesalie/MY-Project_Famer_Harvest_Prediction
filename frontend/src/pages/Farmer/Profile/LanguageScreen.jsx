import React from 'react';
import { T } from '../../../constants/constants';
import Topbar from '../../../components/Common/Topbar';

export default function LanguageScreen({ onNavigate, lang, setLang }) {
  const t = T[lang];
  return (
    <>
      <Topbar title={t.language} onBack={() => onNavigate("profile")} lang={lang} setLang={setLang} />
      <div className="scroll fade-up">
        <div className="card">
          <div className="sec-hd" style={{ marginBottom: 14 }}>{lang === "en" ? "Select Language" : "Hitamo Ururimi"}</div>
          {[
            ["English", "en"],
            ["Kinyarwanda", "rw"]
          ].map(([lbl, code]) => (
            <div 
              key={code} 
              className="info-row" 
              style={{
                padding: "16px 12px", 
                borderBottom: code === "en" ? "1px solid var(--s100)" : "none", 
                cursor: "pointer", 
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: lang === code ? "var(--g50)" : "white"
              }}
              onClick={() => { setLang(code); setTimeout(() => onNavigate("profile"), 500); }}
            >
              <span style={{ fontWeight: 700, color: lang === code ? "var(--g800)" : "var(--s700)", fontSize: 14 }}>{lbl}</span>
              {lang === code && <span style={{ color: "var(--g600)", fontWeight: 800 }}><i className="bi bi-check"></i></span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
