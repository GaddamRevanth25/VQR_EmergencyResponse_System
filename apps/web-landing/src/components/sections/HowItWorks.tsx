
import { SectionHeader } from '../ui/SectionHeader';
import { howItWorks } from '../../constants/siteData';
import { motion } from 'motion/react';

export function HowItWorks() {

  return (
    <section id="how-it-works" style={{ background: 'var(--bg-main)' }}>
      <div className="container">
        <SectionHeader 
          title="How It Works" 
          subtitle="From setup to rapid response, VQR is designed to be seamless and automatic when it matters most."
        />
        
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          {/* Connecting Line */}
          <motion.div 
            initial={{ height: 0 }}
            whileInView={{ height: 'calc(100% - 80px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            style={{
              position: 'absolute',
              left: '24px',
              top: '40px',
              width: '2px',
              background: 'linear-gradient(to bottom, var(--color-primary) 0%, var(--color-blue) 100%)',
              opacity: 0.4,
              zIndex: 0,
            }} 
          />

          {howItWorks.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              style={{
                display: 'flex',
                gap: '2rem',
                marginBottom: i !== howItWorks.length - 1 ? '3rem' : '0',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.2rem',
                flexShrink: 0,
                boxShadow: 'var(--shadow-glow)',
              }}>
                {step.step}
              </div>
              
              <div className="glass-card" style={{
                padding: '1.5rem 2rem',
                flex: 1,
              }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
