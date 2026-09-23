"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { copy, useSettings } from "../context/SettingsContext";
import { Language } from "../context/SettingsContext";
import { WeatherWidget } from "./WeatherWidget";

const categories = ["News", "World", "Technology", "Business", "Sports", "Health", "Climate", "Entertainment"];

export function AppShell({ children, active = "news", category, onCategoryChange, preferences, onTogglePreference, search, onSearchChange, onSearch }: {
  children: React.ReactNode;
  active?: "news" | "live" | "chat";
  category?: string;
  onCategoryChange?: (category: string) => void;
  preferences?: string[];
  onTogglePreference?: (category: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (event: FormEvent) => void;
}) {
  const { theme, setTheme, language, setLanguage } = useSettings();
  const { email, signOut } = useAuth();
  const t = copy[language];
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navSearch, setNavSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);

  const chooseCategory = (value: string) => {
    if (onCategoryChange) onCategoryChange(value);
    else router.push(`/?category=${encodeURIComponent(value)}`);
  };

  const searchForm = <form className="search-form" onSubmit={event => { if (onSearch) onSearch(event); else { event.preventDefault(); router.push(`/?q=${encodeURIComponent(searchInput)}`); } }}>
    <input value={search ?? searchInput} onChange={event => onSearchChange ? onSearchChange(event.target.value) : setSearchInput(event.target.value)} placeholder={t.search} aria-label={t.search} />
    <button aria-label="Search">⌕</button>
  </form>;

  return <div className="app-frame">
    <div className="utility-bar">
      <span className="utility-live"><i /> LIVE NEWS DESK</span>
      <span className="utility-date">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(now)}</span>
      <div className="utility-actions">
        <label className="language-select"><span className="sr-only">Language</span><select value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="en">EN</option><option value="hi">हिंदी</option><option value="mr">मराठी</option></select></label>
        <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? "☀" : "☾"}</button>
      </div>
    </div>
    <header className="news-navbar">
      <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">☰</button>
      <Link className="news-logo" href="/">NEWS<span>FLASH</span></Link>
      <nav className="category-nav" aria-label="News categories">{categories.map(item => <button key={item} className={category === item || ((category === "All topics" || !category) && item === "News") ? "selected" : ""} onClick={() => chooseCategory(item === "News" ? "All topics" : item)}>{item}</button>)}</nav>
      <div className="nav-tools">
        {navSearch ? searchForm : <button className="icon-button" onClick={() => setNavSearch(true)} aria-label="Open search">⌕</button>}
        <div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)} aria-label="Profile menu">{email ? email.slice(0, 1).toUpperCase() : "●"}</button>
          {profileOpen && <div className="profile-menu"><strong>{email || "Analyst"}</strong><button onClick={async () => { await signOut(); router.push("/login"); }}>{language === "hi" ? "साइन आउट" : language === "mr" ? "साइन आउट" : "Sign out"}</button></div>}
        </div>
      </div>
    </header>
    <div className={`app-body ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="sidebar">
        <div className="sidebar-links">
          <Link className={active === "news" ? "active" : ""} href="/" title={t.news}><span>▤</span><b>{t.news}</b></Link>
          <Link className={active === "live" ? "active" : ""} href="/live" title={t.live}><span>◉</span><b>{t.live}<i className="mini-live">LIVE</i></b></Link>
          <Link className={active === "chat" ? "active" : ""} href="/chat" title={t.chatbot}><span>◌</span><b>{t.chatbot}</b></Link>
          <a href="#preferences" onClick={event => { event.preventDefault(); document.getElementById("preferences")?.scrollIntoView({ behavior: "smooth" }); }} title={t.preferences}><span>☷</span><b>{t.preferences}</b></a>
        </div>
        {sidebarOpen && <><WeatherWidget /><section id="preferences" className="sidebar-preferences"><p>{t.preferences}</p>{categories.slice(2).map(item => <label key={item}><input type="checkbox" checked={preferences?.includes(item) || false} onChange={() => onTogglePreference ? onTogglePreference(item) : chooseCategory(item)} /><span>{item}</span></label>)}</section></>}
      </aside>
      <main className="content-area">{children}</main>
    </div>
    <footer className="site-footer"><span>NEWSFLASH <i>·</i> INDEPENDENT NEWS DESK</span><span>BBC NEWS · NPR · THE GUARDIAN</span></footer>
  </div>;
}
