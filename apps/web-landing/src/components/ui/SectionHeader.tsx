import React from 'react';
import { motion } from 'motion/react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export function SectionHeader({ title, subtitle, align = 'center' }: SectionHeaderProps) {
  
  const styles: React.CSSProperties = {
    textAlign: align,
    marginBottom: '3rem',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    marginBottom: '1rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  };

  const subtitleStyles: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '1.125rem',
    maxWidth: '600px',
    margin: align === 'center' ? '0 auto' : '0',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={styles}
    >
      <h2 style={titleStyles}>{title}</h2>
      {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
    </motion.div>
  );
}
