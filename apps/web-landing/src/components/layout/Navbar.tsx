import React from 'react';
import { ShieldAlert, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '80px',
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border-color)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.3s ease, border-color 0.3s ease',
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
  };

  const logoStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 700,
    fontSize: '1.5rem',
    color: 'var(--text-main)',
  };

  const linksStyles: React.CSSProperties = {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'color 0.2s',
  };

  return (
    <nav style={navStyles}>
      <div style={containerStyles}>
        <a href="#" style={logoStyles}>
          <ShieldAlert color="var(--color-primary)" size={28} />
          <span>VQR</span>
        </a>
        
        <div style={linksStyles} className="nav-links">
          <a href="#about" style={linkStyle}>About</a>
          <a href="#features" style={linkStyle}>Features</a>
          <a href="#how-it-works" style={linkStyle}>How It Works</a>
          <button 
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--bg-element)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a href="#download" style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
            transition: 'transform 0.2s, background 0.2s',
          }}>Get the App</a>
        </div>
      </div>
    </nav>
  );
}
