import React from 'react';

export default function LangBtn({ lang, setLang }) {
  return (
    <button className="lang-sw" onClick={() => setLang(l => l === "en" ? "rw" : "en")}>
      <span>{lang === "en" ? "EN" : "RW"}</span>
      <span>{lang === "en" ? "Kinyarwanda" : "English"}</span>
    </button>
  );
}
