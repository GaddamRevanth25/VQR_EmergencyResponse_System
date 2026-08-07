import React from 'react';
import { ShieldAlert, Globe, Mail } from 'lucide-react';

export function Footer() {
  const footerStyles: React.CSSProperties = {
    background: 'var(--bg-main)',
    borderTop: '1px solid var(--border-color)',
    padding: '4rem 0 2rem',
    marginTop: '4rem',
  };

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '3rem',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    marginBottom: '3rem',
  };

  const headingStyles: React.CSSProperties = {
    color: 'var(--text-main)',
    fontWeight: 600,
    marginBottom: '1rem',
    fontSize: '1.1rem',
  };

  const listStyles: React.CSSProperties = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    transition: 'color 0.2s',
  };

  return (
    <footer style={footerStyles}>
      <div style={gridStyles}>
        <div>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontSize: '1.25rem' }}>
            <ShieldAlert color="var(--color-primary)" size={24} />
            <span>VQR Emergency</span>
          </a>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            A modern emergency vehicle identification and notification system utilizing QR codes and ML-based scanning.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <a href="#" style={{ color: 'var(--text-muted)' }} title="Website"><Globe size={18} /></a>
            <a 
              href="mailto:iraorigin@iraorigin.com" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }} 
              title="Contact Email"
            >
              <Mail size={18} />
              <span>iraorigin@iraorigin.com</span>
            </a>
          </div>
        </div>

        <div>
          <h4 style={headingStyles}>Product</h4>
          <ul style={listStyles}>
            <li><a href="#features" style={linkStyle}>Features</a></li>
            <li><a href="#how-it-works" style={linkStyle}>How It Works</a></li>
            <li><a href="#technology" style={linkStyle}>Technology</a></li>
            <li><a href="#download" style={linkStyle}>Download</a></li>
          </ul>
        </div>

        <div>
          <h4 style={headingStyles}>Support</h4>
          <ul style={listStyles}>
            <li><a href="#faq" style={linkStyle}>FAQ</a></li>
            <li><a href="mailto:iraorigin@iraorigin.com" style={linkStyle}>Contact Us</a></li>
            <li><a href="#" style={linkStyle}>Privacy Policy</a></li>
            <li><a href="#" style={linkStyle}>Terms of Service</a></li>
          </ul>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', maxWidth: '1200px', margin: '0 auto', padding: '2rem 2rem 0' }}>
        &copy; {new Date().getFullYear()} VQR Emergency Response System. All rights reserved.
      </div>
    </footer>
  );
}
