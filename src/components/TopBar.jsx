import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Contrast, Check, CalendarDays, CalendarCheck } from 'lucide-react';
import { THEMES } from '../state/useTheme';

const THEME_META = {
  dark: { label: 'Dark', icon: Moon },
  light: { label: 'Light', icon: Sun },
  midnight: { label: 'Midnight', icon: Contrast },
};

export default function TopBar({ dueTodayCount, theme, setTheme, calendar }) {
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const dateLabel = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const ActiveIcon = THEME_META[theme]?.icon || Moon;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-(--color-border-line)">
      <div className="flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="6" fill="var(--color-surface-raised)" />
          <path d="M11 7V25" stroke="var(--color-signal)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M11 7H17.5C20 7 21.5 8.5 21.5 10.5C21.5 12.5 20 14 17.5 14H11" stroke="var(--color-signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M11 14H18.5C21 14 22.5 15.8 22.5 18C22.5 20.5 21 22 18.5 22H11" stroke="var(--color-signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span className="font-semibold text-[15px] tracking-tight text-(--color-text-primary)">Brink</span>
      </div>

      <div className="hidden sm:flex items-center gap-3 font-mono-tabular text-xs text-(--color-text-muted)">
        <span>{dateLabel}</span>
        <span className="w-1 h-1 rounded-full bg-(--color-border-strong)" />
        <span className="text-(--color-text-primary)">{timeLabel}</span>
      </div>

      <div className="flex items-center gap-2.5">
        {dueTodayCount > 0 ? (
          <span
            key={dueTodayCount}
            className="animate-pop flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-(--color-signal-dim) text-(--color-signal) border border-(--color-signal)/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-(--color-signal)" />
            {dueTodayCount} due today
          </span>
        ) : (
          <span className="text-xs text-(--color-text-faint)">Nothing on the brink right now</span>
        )}

        {calendar && (
          <button
            onClick={calendar.isConnected ? calendar.disconnect : calendar.connect}
            title={calendar.isConnected ? 'Disconnect Google Calendar' : 'Connect Google Calendar'}
            className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95 ${
              calendar.isConnected
                ? 'border-(--color-safe)/30 bg-(--color-safe-dim) text-(--color-safe)'
                : 'border-(--color-border-line) text-(--color-text-muted) hover:text-(--color-text-primary) hover:border-(--color-border-strong)'
            }`}
          >
            {calendar.isConnected ? <CalendarCheck size={13} /> : <CalendarDays size={13} />}
            {calendar.isConnected ? 'Calendar connected' : 'Connect Calendar'}
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Change theme"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-(--color-border-line) text-(--color-text-muted) hover:text-(--color-text-primary) hover:border-(--color-border-strong) hover:bg-(--color-surface-hover) transition-all duration-150"
          >
            <ActiveIcon size={15} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="animate-scale-in absolute right-0 mt-2 w-36 rounded-xl border border-(--color-border-strong) bg-(--color-surface-raised) shadow-2xl py-1.5 z-50 origin-top-right"
            >
              {THEMES.map((t) => {
                const Icon = THEME_META[t].icon;
                const active = t === theme;
                return (
                  <button
                    key={t}
                    role="menuitem"
                    onClick={() => {
                      setTheme(t);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors duration-100 text-(--color-text-primary) hover:bg-(--color-surface-hover)"
                  >
                    <Icon size={13} className="text-(--color-text-muted)" />
                    <span className="flex-1">{THEME_META[t].label}</span>
                    {active && <Check size={13} className="text-(--color-signal)" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
